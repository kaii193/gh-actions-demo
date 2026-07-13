import { getOctokit, context } from "@actions/github";
import fs from "fs";

const token = process.env.GITHUB_TOKEN;
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Path to your code rules file inside the repo. Adjust to wherever your rules live.
const RULES_PATH = process.env.CODE_RULES_PATH || ".github/CODE_RULES.md";

// Only review files whose path starts with this prefix (e.g. "frontend/" or "backend/").
// Leave empty to review all changed files.
const FILES_PATH_PREFIX = process.env.FILES_PATH_PREFIX || "";

// Label shown in the comment, e.g. "Frontend" or "Backend", so PRs touching both
// areas get two distinct comments instead of one merged review.
const PROJECT_NAME = process.env.PROJECT_NAME || "";

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
    let prompt = `You are a strict senior code reviewer. Review this Pull Request against the CODE RULES below.

CODE RULES:
${rules}

PR Title:
${pr.title}

PR Description:
${pr.body ?? "(none)"}

Changed files and patches:
`;

    for (const file of files) {
        prompt += `
File: ${file.filename}
Patch:
${file.patch ?? "(no patch available, possibly binary or too large)"}
`;
    }

    prompt += `

Respond with ONLY a JSON object, no markdown fences, no extra text, in this exact shape:
{
  "verdict": "PASS" | "REJECT",
  "summary": "1-2 sentence summary of your assessment",
  "reasons": ["reason 1", "reason 2"]
}
"verdict" must be REJECT if any CODE RULE is violated, otherwise PASS.`;

    return prompt;
}

function safeParseJSON(text) {
    if (!text) return null;
    // Strip ```json ... ``` fences if the model added them anyway
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        // Try to extract the first {...} block as a fallback
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch (e2) {
                return null;
            }
        }
        return null;
    }
}

// ---------- Model callers ----------

async function callZhipu(prompt) {
    const res = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ZHIPU_API_KEY}`,
        },
        body: JSON.stringify({
            model: "glm-4.5", // adjust to whichever GLM model you have access to
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Z.AI API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return { raw: text, parsed: safeParseJSON(text) };
}

async function callDeepseek(prompt) {
    // Note: use https, not http, for the actual key/secret to travel encrypted
    const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`DeepSeek API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return { raw: text, parsed: safeParseJSON(text) };
}

// ---------- Comment formatting ----------

function formatComment({ zhipu, deepseek, finalVerdict }) {
    const zVerdict = zhipu.parsed?.verdict ?? "UNKNOWN";
    const dVerdict = deepseek.parsed?.verdict ?? "UNKNOWN";

    const titleSuffix = PROJECT_NAME ? ` — ${PROJECT_NAME}` : "";
    let body = `## 🤖 AI Code Review (GLM + DeepSeek)${titleSuffix}\n\n`;
    body += `**Final verdict: ${finalVerdict}**\n\n`;

    body += `### GLM (Z.AI) — ${zVerdict}\n`;
    if (zhipu.parsed) {
        body += `${zhipu.parsed.summary ?? ""}\n`;
        if (zhipu.parsed.reasons?.length) {
            body += zhipu.parsed.reasons.map((r) => `- ${r}`).join("\n") + "\n";
        }
    } else {
        body += `_Could not parse structured response:_\n\`\`\`\n${zhipu.raw.slice(0, 800)}\n\`\`\`\n`;
    }

    body += `\n### DeepSeek — ${dVerdict}\n`;
    if (deepseek.parsed) {
        body += `${deepseek.parsed.summary ?? ""}\n`;
        if (deepseek.parsed.reasons?.length) {
            body += deepseek.parsed.reasons.map((r) => `- ${r}`).join("\n") + "\n";
        }
    } else {
        body += `_Could not parse structured response:_\n\`\`\`\n${deepseek.raw.slice(0, 800)}\n\`\`\`\n`;
    }

    if (finalVerdict === "REJECT") {
        body += `\n---\n⛔ **This PR is blocked from merging until the issues above are addressed.**`;
    } else {
        body += `\n---\n✅ **Both reviewers approved. This PR is allowed to merge.**`;
    }

    return body;
}

// ---------- Main ----------

async function main() {
    const { owner, repo } = context.repo;
    const pull_number = context.payload.pull_request.number;

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

    const rules = readCodeRules();
    const prompt = buildPrompt(pr, files, rules);

    const [zhipu, deepseek] = await Promise.all([
        callZhipu(prompt).catch((e) => ({ raw: "", parsed: null, error: e.message })),
        callDeepseek(prompt).catch((e) => ({ raw: "", parsed: null, error: e.message })),
    ]);

    const zVerdict = zhipu.parsed?.verdict;
    const dVerdict = deepseek.parsed?.verdict;

    // If either model failed to respond or rejected, or they disagree -> REJECT
    // Only PASS when both explicitly say PASS.
    let finalVerdict;
    if (zVerdict === "PASS" && dVerdict === "PASS") {
        finalVerdict = "PASS";
    } else {
        finalVerdict = "REJECT";
    }

    const body = formatComment({ zhipu, deepseek, finalVerdict });

    await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body,
    });

    // Fail the job on REJECT so it can be wired up as a required status check
    // that blocks merging in branch protection rules.
    if (finalVerdict === "REJECT") {
        console.error("Review verdict: REJECT");
        process.exit(1);
    } else {
        console.log("Review verdict: PASS");
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
