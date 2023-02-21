import { readFile } from 'node:fs/promises';
import { GetStaticProps, GetStaticPaths } from 'next';
import { buildDynamicMDX, buildDynamicMeta } from 'nextra/remote';
import { findPathWithExtension, findStaticPaths } from '@/lib/remote-utils';

export const getStaticPaths: GetStaticPaths = async () => ({
  fallback: 'blocking',
  paths: await findStaticPaths({
    repo: 'https://github.com/n1ru4l/envelop',
    rootDir: 'website/src/pages/docs/',
  }),
});

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const filePath = await findPathWithExtension({
    repo: 'https://github.com/n1ru4l/envelop',
    rootDir: 'website/src/pages/docs/',
    slug: params!.slug as string[],
  });
  const content = await readFile(filePath, 'utf8');
  const mdx = await buildDynamicMDX(content, {
    defaultShowCopyCode: true,
    remarkLinkRewriteOptions: {
      pattern: /^\/docs(\/.*)?$/,
      replace: '/v2$1',
    },
  });

  return {
    props: {
      ...mdx,
      ...(await buildDynamicMeta()),
    },
    // Revalidate at most once every 1 week
    revalidate: 60 * 60 * 24 * 7,
  };
};
