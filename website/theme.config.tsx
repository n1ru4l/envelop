/* eslint sort-keys: error */
import { defineConfig, EnvelopLogo, Giscus, useTheme } from '@theguild/components';
import { useRouter } from 'next/router';

const SITE_NAME = 'GraphQL Envelop';

export default defineConfig({
  titleSuffix: ` – ${SITE_NAME}`,
  docsRepositoryBase: 'https://github.com/n1ru4l/envelop/tree/master/website',
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content={`${SITE_NAME}: documentation`} />
      <meta name="og:title" content={`${SITE_NAME}: documentation`} />
    </>
  ),
  logo: (
    <>
      <EnvelopLogo className="mr-1.5 h-9 w-9" />
      <h1 className="md:text-md text-sm font-medium">{SITE_NAME}</h1>
    </>
  ),
  main: {
    extraContent() {
      const { resolvedTheme } = useTheme();
      const { route } = useRouter();

      if (route === '/') {
        return null;
      }
      return (
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
    },
  },
});

// const defaultSeo: AppSeoProps = {
//   title: 'Envelop',
//   description: 'A GraphQL plugin system for improved developer experience.',
//   logo: {
//     url: 'https://www.envelop.dev/logo.png',
//   },
// };
