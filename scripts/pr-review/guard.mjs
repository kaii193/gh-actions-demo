import { GUARD } from "./config.mjs";

// Inspect the (already prefix-filtered) file set and decide whether it is small
// enough to review. Returns { ok, stats, violations }.
export function checkGuards(files) {
    const stats = {
        files: files.length,
        changedLines: files.reduce((sum, f) => sum + (f.additions ?? 0) + (f.deletions ?? 0), 0),
        patchChars: files.reduce((sum, f) => sum + (f.patch?.length ?? 0), 0),
    };

    const violations = [];
    if (GUARD.maxFiles && stats.files > GUARD.maxFiles) {
        violations.push(`Too many changed files: ${stats.files} (limit ${GUARD.maxFiles}).`);
    }
    if (GUARD.maxChangedLines && stats.changedLines > GUARD.maxChangedLines) {
        violations.push(`Too many changed lines: ${stats.changedLines} (limit ${GUARD.maxChangedLines}).`);
    }
    if (GUARD.maxPatchChars && stats.patchChars > GUARD.maxPatchChars) {
        violations.push(`Diff too large: ${stats.patchChars} chars (limit ${GUARD.maxPatchChars}).`);
    }

    return { ok: violations.length === 0, stats, violations };
}
