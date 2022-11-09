export function hashCode(str: string) {
  let hash = 0, i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
}

export function uniqueIdGen() {
  const count: Record<string, number> = {};
  return function (base: string) {
    base = base + '';
    if (!count[base]) count[base] = 0;
    return base + count[base]++;
  };
}
