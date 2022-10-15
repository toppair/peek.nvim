import { parse } from 'https://deno.land/std@0.159.0/flags/mod.ts';
import { dirname, join, normalize } from 'https://deno.land/std@0.159.0/path/mod.ts';
import { readChunks } from './read.ts';
import log from './log.ts';
import { render } from './markdownit.ts';

const __args = parse(Deno.args);
const __dirname = dirname(new URL(import.meta.url).pathname);

const DENO_ENV = Deno.env.get('DENO_ENV');

const logger = log.setupLogger();

logger.info(`DENO_ENV: ${DENO_ENV}`, ...Deno.args);

async function awaitConnection(listener: Deno.Listener) {
  const httpConn = Deno.serveHttp(await listener.accept());
  const event = (await httpConn.nextRequest())!;

  const { socket, response } = Deno.upgradeWebSocket(event.request);

  event.respondWith(response);

  return socket;
}

const listener = Deno.listen({ port: 0 });

awaitConnection(listener).then((socket) => {
  logger.info('connection');
  socket.onopen = () => {
    (async () => {
      if (DENO_ENV === 'development') {
        return void (await import(join(__dirname, 'ipc_dev.ts'))).default(socket);
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const generator = readChunks(Deno.stdin);

      for await (const chunk of generator) {
        const action = decoder.decode(chunk.buffer);

        switch (action) {
          case 'show': {
            const content = decoder.decode((await generator.next()).value!);

            socket.send(encoder.encode(JSON.stringify({
              action: 'show',
              html: render(content),
              lcount: (content.match(/(?:\r?\n)/g) || []).length + 1,
            })));

            break;
          }
          case 'scroll': {
            socket.send(encoder.encode(JSON.stringify({
              action,
              line: decoder.decode((await generator.next()).value!),
            })));
            break;
          }
          case 'base': {
            socket.send(encoder.encode(JSON.stringify({
              action,
              base: normalize(decoder.decode((await generator.next()).value!) + '/'),
            })));
            break;
          }
          default: {
            break;
          }
        }
      }
    })();
  };
});

const webview = new Worker(new URL('webview.js', Deno.mainModule).href, {
  type: 'module',
  name: 'webview',
});

webview.onmessage = (event) => {
  if (event.data === 'close') {
    logger.info('webview closed');
    return void Deno.exit();
  }

  logger.info('webview worker ready');

  const addr = listener.addr as Deno.NetAddr;

  webview.postMessage({
    url: new URL('index.html', Deno.mainModule).href,
    theme: __args['theme'],
    serverUrl: `${addr.hostname}:${addr.port}`,
  });
};

for (
  const signal of [
    'SIGINT',
    'SIGUSR2',
    'SIGTERM',
    'SIGPIPE',
    'SIGHUP',
  ] as const
) {
  Deno.addSignalListener(signal, () => {
    logger.info('SIGNAL: ', signal);
    Deno.exit();
  });
}
