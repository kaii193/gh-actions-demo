import { REQUEST_TIMEOUT_MS, MAX_OUTPUT_TOKENS, MAX_RETRIES } from "./config.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function safeParseJSON(text) {
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

// Models occasionally return "pass"/"Pass"/" PASS ". Normalise before comparing.
export function normalizeVerdict(verdict) {
    return String(verdict ?? "").trim().toUpperCase();
}

// Per-reviewer status: PASS (explicit pass), REJECT (explicit rejection),
// or UNAVAILABLE (missing key / timeout / error / unparseable response).
export function reviewerStatus(review) {
    if (review.parsed) {
        return normalizeVerdict(review.parsed.verdict) === "PASS" ? "PASS" : "REJECT";
    }
    return "UNAVAILABLE";
}

// Calls one OpenAI-compatible chat endpoint. Never throws: any failure is returned
// as { error } so a single flaky model cannot crash the whole review. Retries on
// 429 / 5xx / network errors with backoff, and aborts hung requests via a timeout.
export async function callChatModel({ name, url, apiKey, model }, prompt) {
    if (!apiKey) {
        return { name, raw: "", parsed: null, error: "Missing API key" };
    }

    let lastError = "unknown error";

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
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
                    max_tokens: MAX_OUTPUT_TOKENS,
                }),
                signal: ac.signal,
            });

            if (!res.ok) {
                const bodyText = await res.text();
                const retryable = res.status === 429 || res.status >= 500;
                lastError = `${name} API error ${res.status}: ${bodyText}`;
                // 4xx (bad request, auth) won't improve on retry — fail fast.
                if (retryable && attempt < MAX_RETRIES) {
                    await sleep(1000 * 2 ** attempt); // 1s, 2s backoff
                    continue;
                }
                return { name, raw: "", parsed: null, error: lastError };
            }

            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content ?? "";
            return { name, raw: text, parsed: safeParseJSON(text) };
        } catch (e) {
            // Network error or abort (timeout) — retryable.
            lastError = e.name === "AbortError" ? `${name} request timed out after ${REQUEST_TIMEOUT_MS}ms` : e.message;
            if (attempt < MAX_RETRIES) {
                await sleep(1000 * 2 ** attempt);
                continue;
            }
            return { name, raw: "", parsed: null, error: lastError };
        } finally {
            clearTimeout(timer);
        }
    }

    return { name, raw: "", parsed: null, error: lastError };
}
