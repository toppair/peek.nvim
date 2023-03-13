import { parse } from 'https://deno.land/std@0.159.0/flags/mod.ts';
import { dirname, join, normalize, fromFileUrl } from 'https://deno.land/std@0.159.0/path/mod.ts';
import { open } from 'https://deno.land/x/open@v0.0.5/index.ts';
import { readChunks } from './read.ts';
import log from './log.ts';
import { render } from './markdownit.ts';

const __args = parse(Deno.args);
const __dirname = dirname(new URL(import.meta.url).pathname);

const DENO_ENV = Deno.env.get('DENO_ENV');

const logger = log.setupLogger();

logger.info(`DENO_ENV: ${DENO_ENV}`, ...Deno.args);

const listener = Deno.listen({ port: 0 });
const addr = listener.addr as Deno.NetAddr;
const serverUrl = `${addr.hostname.replace('0.0.0.0', 'localhost')}:${addr.port}`;

logger.info(`listening on ${serverUrl}`);

async function init(socket: WebSocket) {
  if (DENO_ENV === 'development') {
    return void (await import(join(__dirname, 'ipc_dev.ts'))).default(socket);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const generator = readChunks(Deno.stdin);

  try {
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
  } catch (e) {
    if (e.name !== 'InvalidStateError') throw e;
  }
}

(async () => {
  const app = JSON.parse(__args['app']) || 'webview';

  if (app === 'webview') {
    const webview = Deno.run({
      cwd: dirname(fromFileUrl(Deno.mainModule)),
      cmd: [
        'deno',
        'run',
        '--quiet',
        '--allow-read',
        '--allow-write',
        '--allow-env',
        '--allow-net',
        '--allow-ffi',
        '--unstable',
        '--no-check',
        'webview.js',
        `--url=${new URL('index.html', Deno.mainModule).href}`,
        `--theme=${__args['theme']}`,
        `--serverUrl=${serverUrl}`,
      ],
      stdin: 'null',
    });

    webview.status().then((status) => {
      logger.info(`webview closed, code: ${status.code}`);
      Deno.exit();
    });

    const httpConn = Deno.serveHttp(await listener.accept());
    const event = (await httpConn.nextRequest())!;

    const { socket, response } = Deno.upgradeWebSocket(event.request);

    socket.onopen = () => {
      init(socket);
    };

    return void event.respondWith(response);
  }

  async function findFile(url: string) {
    const path = new URL(url).pathname.replace(/^\//, '') || 'index.html';

    for (const base of [Deno.mainModule, 'file:']) {
      try {
        return await Deno.open(new URL(path, base));
      } catch (_) { /**/ }
    }
  }

  (async () => {
    let timeout;

    for await (const conn of listener) {
      const httpConn = Deno.serveHttp(conn);

      (async () => {
        for await (const event of httpConn) {
          const upgrade = event.request.headers.get('upgrade') || '';

          if (upgrade.toLowerCase() != 'websocket') {
            const file = await findFile(event.request.url);

            event.respondWith(
              new Response(file?.readable || 'Not Found', { status: file ? 200 : 404 }),
            );

            continue;
          }

          clearTimeout(timeout);

          const { socket, response } = Deno.upgradeWebSocket(event.request);

          socket.onopen = () => {
            init(socket);
          };

          socket.onclose = () => {
            timeout = setTimeout(() => {
              Deno.exit();
            }, 2000);
          };

          event.respondWith(response);
        }
      })();
    }
  })();

  const url = new URL(`http://${serverUrl}`);
  const searchParams = new URLSearchParams({ theme: __args.theme });
  url.search = searchParams.toString();

  open(url.href, { app: app !== 'browser' && app })
    .catch((e) => {
      Deno.stderr.writeSync(new TextEncoder().encode(`${[app].flat().join(' ')}: ${e.message}`));
      Deno.exit();
    });
})();

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
