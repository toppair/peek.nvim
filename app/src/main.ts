import { parseArgs } from 'https://deno.land/std@0.217.0/cli/parse_args.ts';
import { dirname, fromFileUrl, join, normalize } from 'https://deno.land/std@0.217.0/path/mod.ts';
import { open } from 'https://deno.land/x/open@v0.0.6/index.ts';
import { readChunks } from './read.ts';
import log from './log.ts';
import { render } from './markdownit.ts';

const __args = parseArgs(Deno.args);
const __dirname = dirname(new URL(import.meta.url).pathname);

const DENO_ENV = Deno.env.get('DENO_ENV');

const logger = log.setupLogger();
const version = Deno.version;

logger.info(`DENO_ENV: ${DENO_ENV}`, ...Deno.args);
logger.info(`deno: ${version.deno} v8: ${version.v8} typescript: ${version.typescript}`);

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

(() => {
  const app = __args['app'] ? JSON.parse(__args['app']) : 'webview';

  if (app === 'webview') {
    const onListen: Deno.ServeOptions['onListen'] = ({ hostname, port }) => {
      const serverUrl = `${hostname.replace('0.0.0.0', 'localhost')}:${port}`;
      logger.info(`listening on ${serverUrl}`);
      const webview = new Deno.Command('deno', {
        cwd: dirname(fromFileUrl(Deno.mainModule)),
        args: [
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

      webview.output().then((status) => {
        logger.info(`webview closed, code: ${status.code}`);
        Deno.exit();
      });
    };

    Deno.serve({ port: 0, onListen }, (request) => {
      const { socket, response } = Deno.upgradeWebSocket(request);

      socket.onopen = () => {
        init(socket);
      };

      return response;
    });

    return;
  }

  async function findFile(url: string) {
    const path = new URL(url).pathname.replace(/^\//, '') || 'index.html';

    for (const base of [Deno.mainModule, 'file:']) {
      try {
        return await Deno.open(new URL(path, base));
      } catch (_) { /**/ }
    }
  }

  const onListen: Deno.ServeOptions['onListen'] = ({ hostname, port }) => {
    const serverUrl = `${hostname.replace('0.0.0.0', 'localhost')}:${port}`;
    logger.info(`listening on ${serverUrl}`);
    const url = new URL(`http://${serverUrl}`);
    const searchParams = new URLSearchParams({ theme: __args.theme });
    url.search = searchParams.toString();

    open(url.href, { app: app !== 'browser' && app })
      .catch((e) => {
        Deno.stderr.writeSync(new TextEncoder().encode(`${[app].flat().join(' ')}: ${e.message}`));
        Deno.exit();
      });
  };

  let timeout: number;

  Deno.serve({ port: 0, onListen }, async (request) => {
    const upgrade = request.headers.get('upgrade') || '';

    if (upgrade.toLowerCase() != 'websocket') {
      const file = await findFile(request.url);
      return new Response(file?.readable || 'Not Found', { status: file ? 200 : 404 });
    }

    clearTimeout(timeout);

    const { socket, response } = Deno.upgradeWebSocket(request);

    socket.onopen = () => {
      init(socket);
    };

    socket.onclose = () => {
      timeout = setTimeout(() => {
        Deno.exit();
      }, 2000);
    };

    return response;
  });
})();

const win_signals = ['SIGINT', 'SIGBREAK'] as const;
const unix_signals = ['SIGINT', 'SIGUSR2', 'SIGTERM', 'SIGPIPE', 'SIGHUP'] as const;
const signals = Deno.build.os === 'windows' ? win_signals : unix_signals;

for (const signal of signals) {
  Deno.addSignalListener(signal, () => {
    logger.info('SIGNAL:', signal);
    Deno.exit();
  });
}
