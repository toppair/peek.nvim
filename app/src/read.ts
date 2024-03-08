import type { Reader } from 'https://deno.land/std@0.217.0/io/types.ts';

async function read(reader: Reader, buffer: Uint8Array) {
  let read = 0;
  while (read < buffer.length) {
    const r = await reader.read(buffer.subarray(read));
    if (!r) throw new Error('EOF');
    read += r;
  }
}

export async function* readChunks(reader: Reader) {
  while (true) {
    const len = new Uint8Array(4);
    await read(reader, len);
    const content = new Uint8Array(new DataView(len.buffer, 0).getUint32(0));
    await read(reader, content);
    yield content;
  }
}
