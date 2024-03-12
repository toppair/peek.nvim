import { bundle } from 'https://deno.land/x/emit@0.38.1/mod.ts';

const DEBUG = Deno.env.get('DEBUG');
const { compilerOptions, imports } = JSON.parse(Deno.readTextFileSync('deno.json'));
const bundleOptions = { compilerOptions, importMap: { imports } };

function logPublicContent() {
  console.table(
    Array.from(Deno.readDirSync('public')).reduce((table, entry) => {
      const { size, mtime } = Deno.statSync('public/' + entry.name);

      table[entry.name] = {
        size,
        modified: new Date(mtime).toLocaleTimeString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23',
          fractionalSecondDigits: 3,
        }),
      };

      return table;
    }, {}),
  );
}

async function emit(src, out) {
  return Deno.writeTextFile(out, (await bundle(src, bundleOptions)).code);
}

async function download(src, out, transform = (uint8array) => uint8array) {
  Deno.mkdirSync(out.split('/').slice(0, -1).join('/'), { recursive: true });
  const res = await fetch(src);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${src}. ${res.status} ${res.statusText}`);
  }
  Deno.writeFileSync(out, transform(new Uint8Array(await res.arrayBuffer())));
}

if (DEBUG) {
  logPublicContent();

  new Deno.Command('git', {
    args: ['branch', '--all'],
  }).spawn();
}

const result = await Promise.allSettled([
  emit('app/src/main.ts', 'public/main.bundle.js'),

  emit('app/src/webview.ts', 'public/webview.js'),

  emit('client/src/script.ts', 'public/script.bundle.js'),

  download(
    'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown.min.css',
    'public/github-markdown.min.css',
    (uint8array) => {
      return new TextEncoder().encode(
        new TextDecoder().decode(uint8array)
          .replace('@media (prefers-color-scheme:dark)', '[data-theme=dark]')
          .replace('@media (prefers-color-scheme:light)', '[data-theme=light]'),
      );
    },
  ),

  download(
    'https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js',
    'public/mermaid.min.js',
  ),

  download(
    'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
    'public/katex.min.css',
  ),

  ...[
    'KaTeX_AMS-Regular.woff2',
    'KaTeX_Caligraphic-Bold.woff2',
    'KaTeX_Caligraphic-Regular.woff2',
    'KaTeX_Fraktur-Bold.woff2',
    'KaTeX_Fraktur-Regular.woff2',
    'KaTeX_Main-Bold.woff2',
    'KaTeX_Main-BoldItalic.woff2',
    'KaTeX_Main-Italic.woff2',
    'KaTeX_Main-Regular.woff2',
    'KaTeX_Math-BoldItalic.woff2',
    'KaTeX_Math-Italic.woff2',
    'KaTeX_SansSerif-Bold.woff2',
    'KaTeX_SansSerif-Italic.woff2',
    'KaTeX_SansSerif-Regular.woff2',
    'KaTeX_Script-Regular.woff2',
    'KaTeX_Size1-Regular.woff2',
    'KaTeX_Size2-Regular.woff2',
    'KaTeX_Size3-Regular.woff2',
    'KaTeX_Size4-Regular.woff2',
    'KaTeX_Typewriter-Regular.woff2',
  ].map((font) =>
    download(
      `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/${font}`,
      `public/fonts/${font}`,
    )
  ),
]);

result.forEach((res) => {
  if (res.status === 'rejected') console.error(res.reason);
});

if (DEBUG) {
  logPublicContent();
}
