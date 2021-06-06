import type { ReadStream } from 'fs';
import type { FileUpload } from 'graphql-upload';

export async function readStreamToBuffer(
  rsLike: ReadStream | Promise<ReadStream> | Promise<FileUpload> | FileUpload
): Promise<Buffer> {
  const readStream = await rsLike;

  const rs = 'createReadStream' in readStream ? readStream.createReadStream() : readStream;

  const chunks: Uint8Array[] = [];
  for await (const chunk of rs) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
