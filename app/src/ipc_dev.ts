import { TextLineStream } from '@std/streams';
import { normalize } from '@std/path';
import { render } from './markdownit.ts';

export default async function (socket: WebSocket) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const readable = Deno.stdin.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream());

  const reader = readable.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (!value) break;
    const [action, ...args] = value?.split(':');
    switch (action) {
      case 'show':
        try {
          const content = decoder.decode(Deno.readFileSync(args[0]));
          socket.send(encoder.encode(JSON.stringify({
            action,
            html: render(content),
            lcount: (content.match(/(?:\r?\n)/g) || []).length + 1,
          })));
        } catch (e) {
          console.error(e);
        }
        break;
      case 'scroll': {
        socket.send(encoder.encode(JSON.stringify({
          action,
          line: args[0],
        })));
        break;
      }
      case 'base': {
        socket.send(encoder.encode(JSON.stringify({
          action,
          base: normalize(args[0] + '/'),
        })));
        break;
      }
      default:
        break;
    }
    if (done) break;
  }
}
