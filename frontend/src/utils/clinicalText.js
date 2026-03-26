/**
 * Firestore/API may return insight lines as strings or { text } objects.
 * React cannot render plain objects as children — normalize to string.
 */
export function insightToString(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'object') {
    if (typeof item.text === 'string') return item.text;
    if (typeof item.insight === 'string') return item.insight;
    if (typeof item.message === 'string') return item.message;
  }
  try {
    return JSON.stringify(item);
  } catch {
    return String(item);
  }
}

export function normalizeInsights(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(insightToString).filter((s) => String(s).trim().length > 0);
}

export function tipToString(tip) {
  return insightToString(tip);
}
