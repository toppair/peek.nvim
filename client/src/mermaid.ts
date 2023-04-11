import Mermaid from 'https://cdn.skypack.dev/@types/mermaid?dts';
import { getInjectConfig } from './util.ts';

declare const mermaid: typeof Mermaid;

function init() {
  const peek = getInjectConfig();

  mermaid.initialize({
    startOnLoad: false,
    theme: peek?.theme === 'light' ? 'neutral' : 'dark',
  });
}

function render(id: string, definition: string, container: Element) {
  return new Promise<string | void>((resolve) => {
    try {
      mermaid.mermaidAPI.render(id, definition, container).then(({ svg }: { svg: string }) => resolve(svg));
    } catch {
      resolve();
    }
  });
}

export default { init, render };
