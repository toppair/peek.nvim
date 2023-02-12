import { Webview } from 'https://deno.land/x/webview@0.7.4/mod.ts';
import { parse } from 'https://deno.land/std@0.159.0/flags/mod.ts';

const { url, theme, serverUrl } = parse(Deno.args);

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
