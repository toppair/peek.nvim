const flags = [];

if (Deno.env.get('FAST')) {
  flags.push('--no-check', '--quiet');
}

const result = Promise.all([
  Deno.run({
    cmd: ['deno', 'bundle', ...flags, 'app/src/main.ts', 'public/main.bundle.js'],
  }).status(),

  Deno.run({
    cmd: ['deno', 'bundle', ...flags, 'app/src/webview.ts', 'public/webview.js'],
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

result.catch((reason) => {
  console.error(reason);
});
