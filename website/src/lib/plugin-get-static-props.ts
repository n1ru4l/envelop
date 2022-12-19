import { compileMdx } from 'nextra/compile';
import { fetchPackageInfo } from '@theguild/components';
import { PLUGINS } from './plugins';
import { format } from 'date-fns';
import { GetStaticProps, GetStaticPaths } from 'next';

export const getStaticPaths: GetStaticPaths = () => ({
  fallback: 'blocking',
  paths: PLUGINS.map(({ identifier }) => ({
    params: { name: identifier },
  })),
});

export const getStaticProps: GetStaticProps = async ctx => {
  const pluginPath = ctx.params?.name;
  const plugin = PLUGINS.find(v => v.identifier === pluginPath);

  if (!plugin) {
    throw new Error(`Unknown "${pluginPath}" plugin identifier`);
  }
  const { npmPackage, githubReadme, title } = plugin;
  const { readme, updatedAt } = await fetchPackageInfo(npmPackage, githubReadme);

  const mdx = await compileMdx(
    `
# \`${title}\`

|Package name|Weekly Downloads|Version|License|Updated|
|-|-|-|-|-|
|[\`${npmPackage}\`](https://npmjs.com/package/${npmPackage})|![Downloads](https://badgen.net/npm/dw/${npmPackage} "Downloads")|![Version](https://badgen.net/npm/v/${npmPackage} "Version")|![License](https://badgen.net/npm/license/${npmPackage} "License")|${format(
      new Date(updatedAt),
      'MMM do, yyyy'
    )}|

${readme}`,
    {
      unstable_defaultShowCopyCode: true,
    }
  );

  return {
    props: {
      ssg: {
        compiledSource: mdx.result,
        title,
      },
    },
    // The page will be considered as stale and regenerated every 24 hours.
    revalidate: 60 * 60 * 24,
  };
};
