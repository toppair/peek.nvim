import Mermaid from 'https://cdn.skypack.dev/@types/mermaid?dts';

declare const mermaid: typeof Mermaid;

const peek = Reflect.get(window, 'peek');

function init() {
  mermaid.initialize({
    startOnLoad: false,
    theme: peek.theme === 'light' ? 'neutral' : 'dark',
  });
}

function render(id: string, definition: string, container: Element) {
  return new Promise<string | void>((resolve) => {
    try {
      mermaid.mermaidAPI.render(id, definition, resolve, container);
    } catch {
      resolve();
    }
  });
}

export default { init, render };
