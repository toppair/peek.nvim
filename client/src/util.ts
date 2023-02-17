export function debounce(fn: () => void, millis: number) {
  let timer: number;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, millis);
  };
}

export function findLast<T>(array: Array<T> | undefined, predicate: (item: T) => boolean) {
  return array?.slice().reverse().find(predicate);
}

interface Config {
  theme?: string;
  serverUrl?: string;
}

export function getInjectConfig(): Config {
  const peek = Reflect.get(window, 'peek');

  if (peek) return peek;

  const params: Config = {};

  new URLSearchParams(location.search).forEach((value, key) => {
    params[key as keyof Config] = value;
  });

  params.serverUrl = params.serverUrl || location.host;

  return params;
}
