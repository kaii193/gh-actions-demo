import { getOctokit, context } from "@actions/github";
import { FILES_PATH_PREFIX, REVIEWERS } from "./pr-review/config.mjs";
import { readCodeRules, buildPrompt } from "./pr-review/prompt.mjs";
import { callChatModel, reviewerStatus } from "./pr-review/reviewers.mjs";
import { checkGuards } from "./pr-review/guard.mjs";
import { formatComment, formatGuardComment, upsertComment } from "./pr-review/comment.mjs";

const token = process.env.GITHUB_TOKEN;
if (!token) {
    // Fail with a clear message instead of a cryptic crash inside getOctokit().
    console.error("GITHUB_TOKEN is not set. This script must run inside a GitHub Actions job with a token.");
    process.exit(1);
}
const octokit = getOctokit(token);

async function main() {
    const { owner, repo } = context.repo;
    const pull_number = context.payload.pull_request?.number;
    if (!pull_number) {
        throw new Error("No pull_request in the event payload — run this on pull_request events.");
    }
    const target = { owner, repo, issue_number: pull_number };

    const { data: pr } = await octokit.rest.pulls.get({ owner, repo, pull_number });

    // Paginate: listFiles returns only 30 files per page and does NOT auto-paginate,
    // so large PRs would otherwise be reviewed only partially and silently.
    const allFiles = await octokit.paginate(octokit.rest.pulls.listFiles, {
        owner,
        repo,
        pull_number,
        per_page: 100,
    });

    const files = FILES_PATH_PREFIX
        ? allFiles.filter((f) => f.filename.startsWith(FILES_PATH_PREFIX))
        : allFiles;

    if (files.length === 0) {
        console.log(`No changed files under prefix "${FILES_PATH_PREFIX}" — skipping review.`);
        return;
    }

    console.log("PR:", pr.title);

    // Pre-flight guard: block oversized PRs before spending any tokens on the models.
    const guard = checkGuards(files);
    console.log(
        `Guard stats: files=${guard.stats.files}, changedLines=${guard.stats.changedLines}, patchChars=${guard.stats.patchChars}`,
    );
    if (!guard.ok) {
        console.error("Pre-flight guard failed:\n- " + guard.violations.join("\n- "));
        await upsertComment(octokit, target, formatGuardComment(guard.violations));
        process.exit(1);
    }

    console.log(`Reviewing ${files.length} file(s).`);

    const prompt = buildPrompt(pr, files, readCodeRules());
    const reviews = await Promise.all(REVIEWERS.map((reviewer) => callChatModel(reviewer, prompt)));

    // Only PASS when every reviewer explicitly says PASS. A missing, unparseable,
    // timed-out, or REJECT verdict from any reviewer blocks the PR (fail-closed).
    const finalVerdict = reviews.every((r) => reviewerStatus(r) === "PASS") ? "PASS" : "REJECT";

    await upsertComment(octokit, target, formatComment(reviews, finalVerdict));

    // Fail the job on REJECT so it can be a required status check in branch protection.
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
