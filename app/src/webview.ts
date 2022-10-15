import { Webview } from 'https://deno.land/x/webview@0.7.4/mod.ts';

self.onmessage = (event) => {
  const { url, theme, serverUrl } = event.data;

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

  postMessage('close');
};

postMessage('ready');
