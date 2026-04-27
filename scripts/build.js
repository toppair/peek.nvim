import { transform as minifyCss } from 'lightningcss';

const DEBUG = Deno.env.get('DEBUG');

function logPublicContent() {
  console.table(
    [...Deno.readDirSync('public')].reduce((table, entry) => {
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
  const res = await Deno.bundle({
    entrypoints: [src],
    platform: 'browser',
    outputPath: out,
    format: 'esm',
    inlineImports: true,
  });
  if (!res.success) {
    throw new Error(`Failed to bundle ${src}. ${res.errors.join('\n')}`);
  }
}

async function downloadAndMinify(
  src,
  out,
  { transform = (uint8array) => uint8array, minifyDownload = false } = {},
) {
  Deno.mkdirSync(out.split('/').slice(0, -1).join('/'), { recursive: true });
  const resolvedUrl = import.meta.resolve(src);
  const res = await fetch(resolvedUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${resolvedUrl}. ${res.status} ${res.statusText}`);
  }

  let transformed = transform(new Uint8Array(await res.arrayBuffer()));
  if (minifyDownload) {
    const { code } = minifyCss({
      minify: true,
      code: transformed,
      filename: out,
    });
    transformed = code;
  }

  Deno.writeFileSync(out, transformed);
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
  downloadAndMinify('github-markdown-css', 'public/github-markdown.min.css', {
    transform: (uint8array) =>
      new TextEncoder().encode(
        new TextDecoder()
          .decode(uint8array)
          .replace('@media (prefers-color-scheme:dark)', '[data-theme=dark]')
          .replace('@media (prefers-color-scheme:light)', '[data-theme=light]'),
      ),
    minifyDownload: true,
  }),
  downloadAndMinify('mermaid-min', 'public/mermaid.min.js'),
  downloadAndMinify('katex-css', 'public/katex.min.css', { minifyDownload: true }),
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
    downloadAndMinify(
      `https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/fonts/${font}`,
      `public/fonts/${font}`,
    ),
  ),
]);

for (const res of result) {
  if (res.status === 'rejected') {
    console.error(res.reason);
  }
}

if (DEBUG) {
  logPublicContent();
}
