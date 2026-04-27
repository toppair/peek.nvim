import { Webview } from 'webview';
import { parseArgs } from '@std/cli';

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
