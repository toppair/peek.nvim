export function debounce(fn: () => void, millis: number) {
  let timer: number;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, millis);
  };
}

interface Config {
  theme?: string;
  serverUrl?: string;
}
export function getInjectConfig(params?: URLSearchParams): Config {
  const peek: Config = {};

  params = params || new URLSearchParams(location.search);

  params.forEach((value, key) => {
    peek[key as keyof Config] = value;
  });

  peek.serverUrl = peek.serverUrl || location.host;

  return peek;
}
