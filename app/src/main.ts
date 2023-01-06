import { parse } from 'https://deno.land/std@0.159.0/flags/mod.ts';
import { dirname, join, normalize } from 'https://deno.land/std@0.159.0/path/mod.ts';
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
const serverUrl = `${addr.hostname}:${addr.port}`;
logger.info(`listening on ${serverUrl}`);

async function awaitConnection(listener: Deno.Listener) {
  for await (const conn of listener) {
    handle(conn);
  }
}

awaitConnection(listener);

async function handle(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);
  for await (const requestEvent of httpConn) {
    await requestEvent.respondWith(handleReq(requestEvent.request));
  }
}

async function handleReq(req: Request): Promise<Response> {
  const upgrade = req.headers.get('upgrade') || '';
  if (upgrade.toLowerCase() != 'websocket') {
    try {
      const url = new URL(req.url);
      const pathname = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
      const filepath = new URL(pathname, Deno.mainModule);
      const file = await Deno.open(filepath);
      return new Response(file.readable);
    } catch (e) {
      return new Response(e.message, { status: 500 });
    }
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
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
  return response;
}

const url = new URL(`http://${serverUrl}`);
const searchParams = new URLSearchParams();
if (__args.theme) {
  searchParams.append('theme', __args.theme);
}
url.search = searchParams.toString();
await open(url.href);

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
