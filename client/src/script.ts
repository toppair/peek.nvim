import { debounce, findLast, getInjectConfig } from './util.ts';
import { slidingWindows } from 'https://deno.land/std@0.217.0/collections/sliding_windows.ts';
// @deno-types="https://raw.githubusercontent.com/patrick-steele-idem/morphdom/master/index.d.ts"
import morphdom from 'https://esm.sh/morphdom@2.7.2?no-dts';
import mermaid from './mermaid.ts';

const window = globalThis;
// const _log = Reflect.get(window, '_log');

addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const markdownBody = document.getElementById('peek-markdown-body') as HTMLDivElement;
  const base = document.getElementById('peek-base') as HTMLBaseElement;
  const peek = getInjectConfig();
  let source: { lcount: number } | undefined;
  let blocks: HTMLElement[][] | undefined;
  let scroll: { line: number } | undefined;

  const zoom = {
    level: 100,
    zoomMin: 50,
    zoomMax: 250,
    zoomStep: 10,
    zoomLabel: document.getElementById('peek-zoom-label') as HTMLDivElement,
    init() {
      this.level = Number(localStorage.getItem('zoom-level')) || this.level;
      this.update(this.level === 100);
    },
    up() {
      this.level = Math.min(this.level + this.zoomStep, this.zoomMax);
      this.update();
    },
    down() {
      this.level = Math.max(this.level - this.zoomStep, this.zoomMin);
      this.update();
    },
    reset() {
      this.level = 100;
      this.update();
    },
    update(silent?: boolean) {
      localStorage.setItem('zoom-level', String(this.level));
      markdownBody.style.setProperty('font-size', `${this.level}%`);
      if (silent) return;
      this.zoomLabel.textContent = `${this.level}%`;
      this.zoomLabel.animate([
        { opacity: 1 },
        { opacity: 1, offset: 0.75 },
        { opacity: 0 },
      ], { duration: 1000 });
    },
  };

  if (peek.theme) body.setAttribute('data-theme', peek.theme);
  if (peek.ctx === 'webview') zoom.init();

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (peek.ctx === 'webview' && event.ctrlKey) {
      switch (event.key) {
        case '=':
          zoom.up();
          return;
        case '-':
          zoom.down();
          return;
        case '0':
          zoom.reset();
          return;
      }
    }
    switch (event.key) {
      case 'j':
        window.scrollBy({ top: 50 });
        break;
      case 'k':
        window.scrollBy({ top: -50 });
        break;
      case 'l':
        window.scrollBy({ left: 50 });
        break;
      case 'h':
        window.scrollBy({ left: -50 });
        break;
      case 'd':
        window.scrollBy({ top: window.innerHeight / 2 });
        break;
      case 'u':
        window.scrollBy({ top: -window.innerHeight / 2 });
        break;
      case 'g':
        window.scrollTo({ top: 0 });
        break;
      case 'G':
        window.scrollTo({ top: document.body.scrollHeight * zoom.level });
        break;
    }
  });

  onload = () => {
    const item = sessionStorage.getItem('session');
    if (item) {
      const session = JSON.parse(item);
      base.href = session.base;
      onPreview({ html: session.html, lcount: session.lcount });
      onScroll({ line: session.line });
    }
  };

  onbeforeunload = () => {
    sessionStorage.setItem(
      'session',
      JSON.stringify({
        base: base.href,
        html: markdownBody.innerHTML,
        lcount: source?.lcount,
        line: scroll?.line,
      }),
    );
  };

  const decoder = new TextDecoder();
  const socket = new WebSocket(`ws://${peek.serverUrl}/`);

  socket.binaryType = 'arraybuffer';

  socket.onclose = (event) => {
    if (!event.wasClean) {
      close();
      location.reload();
    }
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(decoder.decode(event.data));

    switch (data.action) {
      case 'show':
        onPreview(data);
        break;
      case 'scroll':
        onScroll(data);
        break;
      case 'base':
        base.href = data.base;
        break;
      default:
        break;
    }
  };

  const onPreview = (() => {
    mermaid.init();

    const renderMermaid = debounce(
      (() => {
        const parser = new DOMParser();

        async function render(el: Element) {
          const svg = await mermaid.render(
            `${el.id}-svg`,
            el.getAttribute('data-graph-definition')!,
            el,
          );

          if (svg) {
            const svgElement = parser.parseFromString(svg, 'text/html').body;
            el.appendChild(svgElement);
            el.parentElement?.style.setProperty(
              'height',
              window.getComputedStyle(svgElement).getPropertyValue('height'),
            );
          }
        }

        return () => {
          Array.from(markdownBody.querySelectorAll('div[data-graph="mermaid"]'))
            .filter((el) => !el.querySelector('svg'))
            .forEach(render);
        };
      })(),
      200,
    );

    const morphdomOptions: Parameters<typeof morphdom>[2] = {
      childrenOnly: true,
      getNodeKey: (node) => {
        if (node instanceof HTMLElement && node.getAttribute('data-graph') === 'mermaid') {
          return node.id;
        }
        return null;
      },
      onNodeAdded: (node) => {
        if (node instanceof HTMLElement && node.getAttribute('data-graph') === 'mermaid') {
          renderMermaid();
        }
        return node;
      },
      onBeforeElUpdated: (fromEl: HTMLElement, toEl: HTMLElement) => {
        if (fromEl.hasAttribute('open')) {
          toEl.setAttribute('open', 'true');
        } else if (
          fromEl.classList.contains('peek-mermaid-container') &&
          toEl.classList.contains('peek-mermaid-container')
        ) {
          toEl.style.height = fromEl.style.height;
        }
        return !fromEl.isEqualNode(toEl);
      },
      onBeforeElChildrenUpdated(_, toEl) {
        return toEl.getAttribute('data-graph') !== 'mermaid';
      },
    };

    const mutationObserver = new MutationObserver(() => {
      blocks = slidingWindows(Array.from(document.querySelectorAll('[data-line-begin]')), 2, {
        step: 1,
        partial: true,
      });
    });

    const resizeObserver = new ResizeObserver(() => {
      if (scroll) onScroll(scroll);
    });

    mutationObserver.observe(markdownBody, { childList: true });
    resizeObserver.observe(markdownBody);

    return (data: { html: string; lcount: number }) => {
      source = { lcount: data.lcount };
      morphdom(markdownBody, `<main>${data.html}</main>`, morphdomOptions);
    };
  })();

  const onScroll = (() => {
    function getBlockOnLine(line: number) {
      return findLast(blocks, (block) => line >= Number(block[0].dataset.lineBegin));
    }

    function getOffset(elem: HTMLElement): number {
      let current: HTMLElement | null = elem;
      let top = 0;

      while (top === 0 && current) {
        top = current.getBoundingClientRect().top;
        current = current.parentElement;
      }

      return top + window.scrollY;
    }

    return (data: { line: number }) => {
      scroll = data;

      if (!blocks || !blocks[0] || !source) return;

      const block = getBlockOnLine(data.line) || blocks[0];
      const target = block[0];
      const next = target ? block[1] : blocks[0][0];

      const offsetBegin = target ? getOffset(target) : 0;
      const offsetEnd = next
        ? getOffset(next)
        : offsetBegin + target.getBoundingClientRect().height;

      const lineBegin = target ? Number(target.dataset.lineBegin) : 1;
      const lineEnd = next ? Number(next.dataset.lineBegin) : source.lcount + 1;

      const pixPerLine = (offsetEnd - offsetBegin) / (lineEnd - lineBegin);
      const scrollPix = (data.line - lineBegin) * pixPerLine;

      window.scroll({ top: offsetBegin + scrollPix - window.innerHeight / 2 + pixPerLine / 2 });
    };
  })();
});
