import { Webview } from 'https://deno.land/x/webview@0.7.6/mod.ts';
import { parseArgs } from 'https://deno.land/std@0.217.0/cli/parse_args.ts';

const { url, theme, serverUrl } = parseArgs(Deno.args);

const webview = new Webview();

webview.title = 'Peek preview';
webview.bind('_log', console.log);
webview.init(`
  window.peek = {};
  window.peek.theme = "${theme}"
  window.peek.serverUrl = "${serverUrl}"
`);

webview.navigate(url);
webview.run();

Deno.exit();
