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

const result = Promise.all([
  Deno.run({
    cmd: ['deno', 'bundle', ...flags, 'app/src/main.ts', 'public/main.bundle.js'],
  }).status(),

  Deno.run({
    cmd: ['deno', 'bundle', ...flags, 'client/src/script.ts', 'public/script.bundle.js'],
  }).status(),

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
