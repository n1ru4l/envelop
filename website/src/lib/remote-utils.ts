import path from 'path';
import fs from 'fs';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

const CACHE_DIR = '.next/cache/nextra-remote/';

export async function listFiles({ repo, rootDir }: { repo: string; rootDir: string }): string[] {
  const dir = path.join(CACHE_DIR, repo.split('/').pop());
  await git.clone({ fs, http, dir, url: repo });

  const filenames = await git.listFiles({ fs, http, dir });
  return filenames.filter(filename => filename.startsWith(rootDir)).map(filename => filename.replace(rootDir, ''));
}

export async function findPathWithExtension({
  repo,
  rootDir,
  slug = ['index'],
}: {
  repo: string;
  rootDir: string;
  slug: string[];
}): Promise<string> {
  const dirs = slug.slice(0, -1);
  const dirPath = path.join(CACHE_DIR, repo.split('/').pop(), rootDir, ...dirs);

  const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const filename = slug.at(-1);
  let matched = files.find(file => {
    const { name, ext } = path.parse(file.name);
    return file.isFile() && name === filename && /\.mdx?$/.test(ext);
  });
  if (matched) {
    return path.join(dirPath, matched?.name);
  }

  for (const file of files) {
    if (file.isDirectory() && file.name === filename) {
      const files = await fs.promises.readdir(path.join(dirPath, filename));
      for (const folderFile of files) {
        if (/^index\.mdx?$/.test(folderFile)) {
          return path.join(dirPath, filename, folderFile);
        }
      }
    }
  }
  throw new Error('File not found!');
}

export async function findStaticPaths({
  repo,
  rootDir,
}: {
  repo: string;
  rootDir: string;
}): Promise<{ params: { slug: string[] } }[]> {
  const filePaths = await listFiles({ repo, rootDir });
  return filePaths
    .filter(filename => /\.mdx?$/.test(filename))
    .map(filename => ({
      params: {
        slug: filename
          .replace(/\.mdx?$/, '')
          // .replace(/(\/|^)index$/, '')
          .split('/'),
      },
    }));
}
