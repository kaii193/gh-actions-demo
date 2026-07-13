// Central configuration, read once from environment variables with sensible defaults.

const str = (name, def = "") => process.env[name] ?? def;

// Non-negative integer env var; falls back to `def` on missing/invalid input.
const int = (name, def) => {
    const v = Number.parseInt(process.env[name] ?? "", 10);
    return Number.isFinite(v) && v >= 0 ? v : def;
};

// Where the code rules live, which files to review, and how to label the comment.
export const RULES_PATH = str("CODE_RULES_PATH", ".github/CODE_RULES.md");
export const FILES_PATH_PREFIX = str("FILES_PATH_PREFIX");
export const PROJECT_NAME = str("PROJECT_NAME");

// Hidden marker so we update our own comment instead of spamming one per push.
// Scoped by PROJECT_NAME so Frontend/Backend comments stay distinct.
export const COMMENT_MARKER = `<!-- ai-review:${PROJECT_NAME || "default"} -->`;

// Prompt size limits — keep the prompt inside the models' context windows.
export const MAX_PATCH_CHARS = 12_000; // per single file patch
export const MAX_TOTAL_PATCH_CHARS = 60_000; // across all patches combined

// Network behaviour for model calls.
export const REQUEST_TIMEOUT_MS = 90_000; // abort a hung request
export const MAX_OUTPUT_TOKENS = 600; // the verdict JSON is tiny
export const MAX_RETRIES = 2; // on 429 / 5xx / network errors (up to 3 attempts)

// Pre-flight guard: block oversized PRs before spending tokens. Set 0 to disable.
export const GUARD = {
    maxFiles: int("GUARD_MAX_FILES", 40),
    maxChangedLines: int("GUARD_MAX_CHANGED_LINES", 1500),
    maxPatchChars: int("GUARD_MAX_PATCH_CHARS", 200_000),
};

// Reviewer panel. Both endpoints speak the OpenAI-compatible chat format, so a
// single caller works for all of them. Add/remove entries to change the panel.
export const REVIEWERS = [
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
