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

if (DEBUG) {
  logPublicContent();

  new Deno.Command('git', {
    args: ['branch', '--all'],
  }).spawn();
}

const result = Promise.all([
  emit('app/src/main.ts', 'public/main.bundle.js'),

  emit('app/src/webview.ts', 'public/webview.js'),

  emit('client/src/script.ts', 'public/script.bundle.js'),

  (async () => {
    try {
      await Deno.stat('public/github-markdown.min.css');
    } catch {
      const res = await fetch(
        'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.1.0/github-markdown.min.css',
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch github theme css. ${res.status} ${res.statusText}`);
      }

      const css = (await res.text())
        .replace('@media (prefers-color-scheme:dark){', '')
        .replace('}@media (prefers-color-scheme:light){.markdown-body', '.markdown-body.light')
        .replace('--color-danger-fg:#cf222e}', '--color-danger-fg: #cf222e;');

      Deno.writeTextFileSync('public/github-markdown.min.css', css);
    }
  })(),
]);

result.catch(console.error);

if (DEBUG) {
  result.then(logPublicContent);
}
