/* eslint-disable react-hooks/rules-of-hooks */
/* eslint sort-keys: error */
import { defineConfig, Giscus, useTheme } from '@theguild/components';
import { useRouter } from 'next/router';
import { PLUGINS } from '@/lib/plugins';

export default defineConfig({
  docsRepositoryBase: 'https://github.com/n1ru4l/envelop/tree/main/website',
  main({ children }) {
    const { resolvedTheme } = useTheme();
    const { route } = useRouter();

    const comments = route !== '/' && (
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

      if (router.route.startsWith('/docs/')) {
        return null;
      }

      if (router.route === '/plugins/[name]') {
        const { name } = router.query;
        const plugin = PLUGINS.find(p => p.identifier === name);
        if (!plugin) {
          return null;
        }
        const { repo, path } = plugin.githubReadme;
        url = `${repo}/tree/main/${path}`;
      }

      return (
        <a className={className} target="_blank" rel="noreferrer" href={`https://github.com/${url}`}>
          {children}
        </a>
      );
    },
  },
});
