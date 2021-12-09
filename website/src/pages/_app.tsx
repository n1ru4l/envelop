import 'remark-admonitions/styles/infima.css';
import '../../public/style.css';
import '../../public/admonitions.css';
import * as React from 'react';
import { appWithTranslation } from 'next-i18next';
import { chakra, Code, extendTheme, Text, theme as chakraTheme, UnorderedList, useColorModeValue } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';
import { AppSeoProps, CombinedThemeProvider, DocsPage, ExtendComponents, handlePushRoute } from '@guild-docs/client';
import { Footer, Header, Subheader } from '@theguild/components';
import type { AppProps } from 'next/app';
import { EnvelopPlayground } from '../components/envelop-playground';

ExtendComponents({
  a: chakra('a', {
    baseStyle: {
      color: '#2f77c9',
      _hover: {
        textDecoration: 'underline',
      },
    },
  }),
  pre: props => (
    <Code
      fontSize="0.9rem"
      colorScheme={'blackAlpha'}
      {...props}
      padding={'20px !important'}
      width={'100%'}
      borderRadius={'sm'}
    />
  ),
  inlineCode: props => {
    const colorScheme = useColorModeValue('blackAlpha', undefined);

    return <Code display={'inline'} margin="1px" colorScheme={colorScheme} fontWeight="semibold" fontSize="0.875em" {...props} />;
  },
  Text,
  ul: UnorderedList,
  EnvelopPlayground,
});

const styles: typeof chakraTheme['styles'] = {
  global: props => ({
    body: {
      bg: mode('white', 'gray.850')(props),
    },
  }),
};

const theme = extendTheme({
  colors: {
    gray: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      850: '#1b1b1b',
      900: '#171717',
    },
  },
  fonts: {
    heading: 'TGCFont, sans-serif',
    body: 'TGCFont, sans-serif',
  },
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  styles,
});

const accentColor = '#1CC8EE';

const serializedMdx = process.env.SERIALIZED_MDX_ROUTES;
const mdxRoutes = { data: serializedMdx && JSON.parse(serializedMdx) };

function AppContent(appProps: AppProps) {
  const { Component, pageProps, router } = appProps;
  const isDocs = router.asPath.startsWith('/docs');

  return (
    <>
      <Header accentColor={accentColor} activeLink="/open-source" themeSwitch />
      <Subheader
        activeLink={router.asPath}
        product={{
          title: 'Envelop',
          description: '',
          image: {
            src: 'https://the-guild.dev/static/shared-logos/products/envelop.svg',
            alt: 'Envelop Logo',
          },
          onClick: e => handlePushRoute('/', e),
        }}
        links={[
          {
            children: 'Home',
            title: 'The Guild Envelop',
            href: '/',
            onClick: e => handlePushRoute('/', e),
          },
          {
            children: 'Docs & API',
            href: '/docs',
            title: 'Read more about Envelop',
            onClick: e => handlePushRoute('/docs', e),
          },
          {
            children: 'Plugin Hub',
            href: '/plugins',
            title: 'Browse the plugin hub',
            onClick: e => handlePushRoute('/plugins', e),
          },
          {
            children: 'GitHub',
            href: 'https://github.com/dotansimha/envelop',
            target: '_blank',
            rel: 'noopener norefereer',
            title: "Head to the project's GitHub",
          },
        ]}
        cta={{
          children: 'Get Started',
          href: '/docs',
          title: 'Start using Envelop',
          onClick: e => handlePushRoute('/docs', e),
        }}
      />
      {isDocs ? (
        <DocsPage
          accentColor={accentColor}
          appProps={appProps}
          mdxRoutes={mdxRoutes}
          mdxNavigationProps={{
            defaultOpenDepth: 2,
          }}
        />
      ) : (
        <Component {...pageProps} />
      )}
      <Footer />
    </>
  );
}

const AppContentWrapper = appWithTranslation(function TranslatedApp(appProps) {
  return <AppContent {...appProps} />;
});

const defaultSeo: AppSeoProps = {
  title: 'Envelop',
  description: 'A GraphQL plugin system for improved developer experience.',
  logo: {
    url: 'https://www.envelop.dev/logo.png',
  },
};

export default function App(appProps: AppProps) {
  return (
    <CombinedThemeProvider theme={theme} accentColor={accentColor} defaultSeo={defaultSeo}>
      <AppContentWrapper {...appProps} />
    </CombinedThemeProvider>
  );
}
