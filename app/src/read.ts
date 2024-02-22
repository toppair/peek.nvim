import type { Reader } from 'https://deno.land/std@0.217.0/io/types.ts';

async function readLength(reader: Reader) {
  const len = new Uint8Array(4);
  await reader.read(len);
  return new DataView(len.buffer, 0).getUint32(0);
}

export async function* readChunks(reader: Reader) {
  while (true) {
    const buffer = new Uint8Array(await readLength(reader));
    await reader.read(buffer);
    yield buffer;
  }
}
