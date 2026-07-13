import { getOctokit, context } from "@actions/github";
import fs from "fs";

const token = process.env.GITHUB_TOKEN;

// Path to your code rules file inside the repo. Adjust to wherever your rules live.
const RULES_PATH = process.env.CODE_RULES_PATH || ".github/CODE_RULES.md";

// Only review files whose path starts with this prefix (e.g. "frontend/" or "backend/").
// Leave empty to review all changed files.
const FILES_PATH_PREFIX = process.env.FILES_PATH_PREFIX || "";

// Label shown in the comment, e.g. "Frontend" or "Backend", so PRs touching both
// areas get two distinct comments instead of one merged review.
const PROJECT_NAME = process.env.PROJECT_NAME || "";

// Reviewers to consult. Both endpoints speak the OpenAI-compatible chat format,
// so a single caller (callChatModel) works for all of them. Add or remove entries
// here to change the panel — the rest of the script adapts automatically.
const REVIEWERS = [
    {
        name: "GLM (Z.AI)",
        url: "https://api.z.ai/api/coding/paas/v4/chat/completions",
        apiKey: process.env.ZHIPU_API_KEY,
        model: "glm-4.5", // adjust to whichever GLM model you have access to
    },
    {
        name: "DeepSeek",
        url: "https://api.deepseek.com/chat/completions",
        apiKey: process.env.DEEPSEEK_API_KEY,
        model: "deepseek-chat",
    },
];

const octokit = getOctokit(token);

// ---------- Helpers ----------

function readCodeRules() {
    try {
        return fs.readFileSync(RULES_PATH, "utf8");
    } catch (e) {
        console.warn(`Could not read rules file at ${RULES_PATH}: ${e.message}`);
        return "(No explicit code rules file found. Use general best practices.)";
    }
}

function buildPrompt(pr, files, rules) {
    const patches = files
        .map(
            (file) => `
File: ${file.filename}
Patch:
${file.patch ?? "(no patch available, possibly binary or too large)"}`,
        )
        .join("\n");

    return `You are a strict senior code reviewer. Review this Pull Request against the CODE RULES below.

CODE RULES:
${rules}

PR Title:
${pr.title}

PR Description:
${pr.body ?? "(none)"}

Changed files and patches:
${patches}

Respond with ONLY a JSON object, no markdown fences, no extra text, in this exact shape:
{
  "verdict": "PASS" | "REJECT",
  "summary": "1-2 sentence summary of your assessment",
  "reasons": ["reason 1", "reason 2"]
}
"verdict" must be REJECT if any CODE RULE is violated, otherwise PASS.`;
}

function safeParseJSON(text) {
    if (!text) return null;
    // Strip ```json ... ``` fences if the model added them anyway.
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        // Fall back to the first {...} block found in the text.
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch {
            return null;
        }
    }
}

// ---------- Model caller ----------

// Calls one OpenAI-compatible chat endpoint. Never throws: any failure is returned
// as { error } so a single flaky model cannot crash the whole review.
async function callChatModel({ name, url, apiKey, model }, prompt) {
    if (!apiKey) {
        return { name, raw: "", parsed: null, error: "Missing API key" };
    }

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
            }),
        });

        if (!res.ok) {
            throw new Error(`${name} API error ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content ?? "";
        return { name, raw: text, parsed: safeParseJSON(text) };
    } catch (e) {
        return { name, raw: "", parsed: null, error: e.message };
    }
}

// ---------- Comment formatting ----------

function formatReview(review) {
    const verdict = review.parsed?.verdict ?? "UNKNOWN";
    let out = `### ${review.name} — ${verdict}\n`;

    if (review.parsed) {
        if (review.parsed.summary) out += `${review.parsed.summary}\n`;
        if (review.parsed.reasons?.length) {
            out += review.parsed.reasons.map((r) => `- ${r}`).join("\n") + "\n";
        }
    } else if (review.error) {
        out += `_Reviewer unavailable:_ ${review.error}\n`;
    } else {
        out += `_Could not parse structured response:_\n\`\`\`\n${review.raw.slice(0, 800)}\n\`\`\`\n`;
    }

    return out;
}

function formatComment(reviews, finalVerdict) {
    const titleSuffix = PROJECT_NAME ? ` — ${PROJECT_NAME}` : "";
    const panel = reviews.map((r) => r.name.split(" ")[0]).join(" + ");

    let body = `## 🤖 AI Code Review (${panel})${titleSuffix}\n\n`;
    body += `**Final verdict: ${finalVerdict}**\n\n`;
    body += reviews.map(formatReview).join("\n");
    body +=
        finalVerdict === "REJECT"
            ? `\n---\n⛔ **This PR is blocked from merging until the issues above are addressed.**`
            : `\n---\n✅ **All reviewers approved. This PR is allowed to merge.**`;

    return body;
}

// ---------- Main ----------

async function main() {
    const { owner, repo } = context.repo;
    const pull_number = context.payload.pull_request?.number;
    if (!pull_number) {
        throw new Error("No pull_request in the event payload — run this on pull_request events.");
    }

    const { data: pr } = await octokit.rest.pulls.get({ owner, repo, pull_number });
    const { data: allFiles } = await octokit.rest.pulls.listFiles({ owner, repo, pull_number });

    const files = FILES_PATH_PREFIX
        ? allFiles.filter((f) => f.filename.startsWith(FILES_PATH_PREFIX))
        : allFiles;

    if (files.length === 0) {
        console.log(`No changed files under prefix "${FILES_PATH_PREFIX}" — skipping review.`);
        return;
    }

    console.log("PR:", pr.title);

    const prompt = buildPrompt(pr, files, readCodeRules());
    const reviews = await Promise.all(REVIEWERS.map((reviewer) => callChatModel(reviewer, prompt)));

    // Only PASS when every reviewer explicitly says PASS. A missing, unparseable,
    // or REJECT verdict from any reviewer blocks the PR.
    const finalVerdict = reviews.every((r) => r.parsed?.verdict === "PASS") ? "PASS" : "REJECT";

    await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: formatComment(reviews, finalVerdict),
    });

    // Fail the job on REJECT so it can be wired up as a required status check
    // that blocks merging in branch protection rules.
    if (finalVerdict === "REJECT") {
        console.error("Review verdict: REJECT");
        process.exit(1);
    }
    console.log("Review verdict: PASS");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
