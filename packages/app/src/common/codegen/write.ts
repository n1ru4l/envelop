import { existsSync, promises } from 'fs';
import { dirname } from 'path';

import { LazyPromise } from '../utils/promise';

const mkdirp = LazyPromise(() => import('mkdirp').then(v => v.default));

/**
 * Write the target file only if the content changed
 */
export async function writeFileIfChanged(targetPath: string, content: string): Promise<void> {
  const fileExists = existsSync(targetPath);

  if (fileExists) {
    const existingContent = await promises.readFile(targetPath, {
      encoding: 'utf-8',
    });

    if (existingContent === content) return;
  }

  await (
    await mkdirp
  )(dirname(targetPath));

  await promises.writeFile(targetPath, content, {
    encoding: 'utf-8',
  });
}
