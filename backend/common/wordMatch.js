// S-01 の完全一致は単語単位で判定する（F-005）。日本語の語境界は Intl.Segmenter の ICU 辞書で求める。
// 大文字・小文字は区別せず、表記ゆれは統一しない。「C++」など記号を含む語は連続する区間をまとめて照合する。
const segmenter =
    typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter('ja', { granularity: 'word' })
        : null;

function segments(text) {
    const lower = String(text).toLowerCase();
    if (segmenter) return Array.from(segmenter.segment(lower), (s) => s.segment);
    // ICU が使えない場合は英字・数字の連続を1語とし、それ以外は1文字ずつに分ける。
    return lower.match(/[a-z0-9]+|\s+|[^\sa-z0-9]/g) ?? [];
}

// token が text 内の単語全体、または連続する区間全体と一致すれば true を返す。
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
