/* eslint-disable react-hooks/rules-of-hooks */

/* eslint sort-keys: error */
import { useRouter } from 'next/router';
import { BRANCH } from '@/lib/constants';
import { PLUGINS } from '@/lib/plugins';
import { Callout, defineConfig, Giscus, useTheme } from '@theguild/components';

export default defineConfig({
  docsRepositoryBase: 'https://github.com/n1ru4l/envelop/tree/main/website',
  main({ children }) {
    const { resolvedTheme } = useTheme();
    const { route } = useRouter();

    const isV2 = route.startsWith('/v2');

    const comments = !isV2 && route !== '/' && (
      <Giscus
        // ensure giscus is reloaded when client side route is changed
        key={route}
        repo="n1ru4l/envelop"
        repoId="MDEwOlJlcG9zaXRvcnkzMzk2NzQ1NjU="
        category="Docs Discussions"
        categoryId="DIC_kwDOFD8Fxc4CSDSX"
        mapping="pathname"
        theme={resolvedTheme}
      />
    );
    return (
      <>
        {isV2 && (
          <Callout type="warning">
            This is the documentation for the <b>old</b> GraphQL Envelop version 2.
            <br />
            We recommend upgrading to the latest version 3.
          </Callout>
        )}
        {children}
        {comments}
      </>
    );
  },
  siteName: 'ENVELOP',
  editLink: {
    component({ children, className, filePath }) {
      const router = useRouter();

      let url = `n1ru4l/envelop/tree/main/website/${filePath}`;

      if (router.route === '/plugins/[name]') {
        const { name } = router.query;
        const plugin = PLUGINS.find(p => p.identifier === name);
        if (!plugin) {
          return null;
        }
        const { repo, path } = plugin.githubReadme;
        url = `https://github.com/${repo}/tree/main/${path}`;
      } else if (router.route.startsWith('/v2/')) {
        url = url
          //
          .replace('[[...slug]].mdx', '')
          .replace('/v2/', '/docs/')
          .replace('/main/', `/${BRANCH}/`);
      }

      return (
        <a
          className={className}
          target="_blank"
          rel="noreferrer"
          href={`https://github.com/${url}`}
        >
          {children}
        </a>
      );
    },
  },
});
