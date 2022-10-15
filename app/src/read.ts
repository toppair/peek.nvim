import { BufReader } from 'https://deno.land/std@0.159.0/io/buffer.ts';

async function readLength(reader: Deno.Reader) {
  const len = new Uint8Array(4);
  await reader.read(len);
  return new DataView(len.buffer, 0).getUint32(0);
}

export async function* readChunks(reader: Deno.Reader) {
  const bufReader = new BufReader(reader);
  while (true) {
    const buffer = new Uint8Array(await readLength(bufReader));
    await bufReader.readFull(buffer);
    yield buffer;
  }
}
