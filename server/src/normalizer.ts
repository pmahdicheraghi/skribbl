/**
 * Normalizes Persian text for fair guess comparisons.
 * Converts Arabic character variants to Persian, strips diacritics/erab,
 * normalizes ZWNJ (نیم‌فاصله) and whitespace.
 */
export function normalizePersian(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    // Convert Arabic Yeh and variants to Persian Yeh
    .replace(/[يىئ]/g, 'ی')
    // Convert Arabic Kaf to Persian Kaf
    .replace(/ك/g, 'ک')
    // Normalize Alef variants (آ, أ, إ) to regular ا
    .replace(/[آأإ]/g, 'ا')
    // Normalize Teh Marbuta and Heh variants
    .replace(/[ةۀ]/g, 'ه')
    // Remove diacritics / harakat / erab (Fatha, Damma, Kasra, Tanwin, Tashdid, Sukun)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize Zero-Width Non-Joiner (نیم‌فاصله) to standard space
    .replace(/\u200c/g, ' ')
    // Collapse multiple whitespace characters into a single space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes the Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}
