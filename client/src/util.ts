export function debounce(fn: () => void, millis: number) {
  let timer: number;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, millis);
  };
}
