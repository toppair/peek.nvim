import { bundle } from 'https://deno.land/x/emit@0.24.0/mod.ts';

const flags = [];
const DEBUG = Deno.env.get('DEBUG');

if (Deno.env.get('FAST')) {
  flags.push('--no-check', '--quiet');
}

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

if (DEBUG) {
  logPublicContent();

  await Deno.run({
    cmd: ['git', 'branch', '--all'],
  }).status();
}

async function bundleScript(inFile, outFile) {
  const bundleResult = await bundle(inFile);
  await Deno.writeTextFile(outFile, bundleResult.code);
}

const result = Promise.all([
  bundleScript('app/src/main.ts', 'public/main.bundle.js'),
  bundleScript('app/src/webview.ts', 'public/webview.js'),
  bundleScript('client/src/script.ts', 'public/script.bundle.js'),

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

      await Deno.writeFile('public/github-markdown.min.css', new TextEncoder().encode(css));
    }
  })(),
]);

result.catch(console.error);

if (DEBUG) {
  result.then(logPublicContent);
}
