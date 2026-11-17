// Word-level ("exact") keyword matching for S-01 (F-005 完全一致). The keyword must equal one whole
// word of the text, not the whole field. Japanese has no spaces, so the text is split with the
// built-in Intl.Segmenter (ICU dictionary). Case is ignored. Orthographic variants are NOT unified.
// A keyword that itself contains symbols ("C++") matches a run of consecutive segments.
const segmenter =
    typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter('ja', { granularity: 'word' })
        : null;

function segments(text) {
    const lower = String(text).toLowerCase();
    if (segmenter) return Array.from(segmenter.segment(lower), (s) => s.segment);
    // Fallback without ICU: Latin/digit runs, and every other character on its own.
    return lower.match(/[a-z0-9]+|\s+|[^\sa-z0-9]/g) ?? [];
}

// True when `token` equals a whole word (or a whole run of segments) of `text`.
function containsWord(text, token) {
    const wanted = segments(token).filter((s) => s.trim() !== '');
    if (wanted.length === 0) return false;
    const have = segments(text);
    for (let i = 0; i + wanted.length <= have.length; i += 1) {
        if (wanted.every((seg, j) => have[i + j] === seg)) return true;
    }
    return false;
}

module.exports = { containsWord };
