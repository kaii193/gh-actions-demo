import { COMMENT_MARKER, PROJECT_NAME } from "./config.mjs";
import { normalizeVerdict, reviewerStatus } from "./reviewers.mjs";

const titleSuffix = PROJECT_NAME ? ` — ${PROJECT_NAME}` : "";

function formatReview(review) {
    const verdict = review.parsed ? normalizeVerdict(review.parsed.verdict) || "UNKNOWN" : reviewerStatus(review);
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

// Comment posted after the reviewers ran.
export function formatComment(reviews, finalVerdict) {
    const panel = reviews.map((r) => r.name.split(" ")[0]).join(" + ");
    const statuses = reviews.map(reviewerStatus);

    let body = `${COMMENT_MARKER}\n## 🤖 AI Code Review (${panel})${titleSuffix}\n\n`;
    body += `**Final verdict: ${finalVerdict}**\n\n`;
    body += reviews.map(formatReview).join("\n");

    let footer;
    if (finalVerdict === "PASS") {
        footer = "✅ **All reviewers approved. This PR is allowed to merge.**";
    } else if (statuses.includes("REJECT")) {
        // A reviewer actually rejected — vs. merely being unavailable.
        footer = "⛔ **This PR is blocked from merging until the issues above are addressed.**";
    } else {
        footer =
            "⚠️ **Blocked (fail-closed): one or more reviewers were unavailable, so the review could not be completed. Re-run the job or check API keys/quotas.**";
    }
    return body + `\n---\n${footer}`;
}

// Comment posted when the pre-flight guard blocks the PR (no models called).
export function formatGuardComment(violations) {
    let body = `${COMMENT_MARKER}\n## 🤖 AI Code Review${titleSuffix}\n\n`;
    body += `**Final verdict: REJECT**\n\n`;
    body += `⛔ **This PR is too large to be reviewed automatically.**\n\n`;
    body += violations.map((v) => `- ${v}`).join("\n") + "\n\n";
    body += `Please split it into smaller, focused PRs so the automated review can run.\n`;
    body += `\n---\n_Blocked by the pre-flight guard before any AI reviewer was called._`;
    return body;
}

// Update our previous comment if present, otherwise create one.
export async function upsertComment(octokit, { owner, repo, issue_number }, body) {
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
        owner,
        repo,
        issue_number,
        per_page: 100,
    });
    const existing = comments.find((c) => c.body?.includes(COMMENT_MARKER));

    if (existing) {
        await octokit.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
    } else {
        await octokit.rest.issues.createComment({ owner, repo, issue_number, body });
    }
}
