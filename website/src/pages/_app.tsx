import 'remark-admonitions/styles/infima.css';
import 'prism-themes/themes/prism-atom-dark.css';
import '../../public/style.css';
import '../../public/admonitions.css';

import { appWithTranslation } from 'next-i18next';
import { Dispatch, ReactNode, SetStateAction, useMemo } from 'react';

import { HamburgerIcon } from '@chakra-ui/icons';
import {
  chakra,
  ChakraProvider,
  Code,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  extendTheme,
  IconButton,
  Text,
  theme as chakraTheme,
  UnorderedList,
  useColorMode,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';
import {
  DocsContainer,
  DocsNavigation,
  DocsNavigationDesktop,
  DocsNavigationMobile,
  DocsTitle,
  ExtendComponents,
  iterateRoutes,
  MdxInternalProps,
  MDXNavigation,
  NextNProgress,
} from '@guild-docs/client';
import { Footer, GlobalStyles, Header, Subheader, ThemeProvider as ComponentsThemeProvider } from '@guild-docs/tgc';

import { handleRoute } from '../../next-helpers';
import { PackageInstall } from '../components/packageInstall';

import type { AppProps } from 'next/app';

export function ChakraThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider theme={theme}>
      <TGCThemeProvider>{children}</TGCThemeProvider>
    </ChakraProvider>
  );
}

export function TGCThemeProvider({ children }: { children: ReactNode }) {
  const { colorMode, setColorMode } = useColorMode();
  const darkThemeProps = useMemo<{
    isDarkTheme: boolean;
    setDarkTheme: Dispatch<SetStateAction<boolean>>;
  }>(() => {
    return {
      isDarkTheme: colorMode === 'dark',
      setDarkTheme: arg => {
        if (typeof arg === 'function') {
          setColorMode(arg(colorMode === 'dark') ? 'dark' : 'light');
        } else {
          setColorMode(arg ? 'dark' : 'light');
        }
      },
    };
  }, [colorMode, setColorMode]);

  return <ComponentsThemeProvider {...darkThemeProps}>{children}</ComponentsThemeProvider>;
}

ExtendComponents({
  a: chakra('a', {
    baseStyle: {
      color: '#2f77c9',
      _hover: {
        textDecoration: 'underline',
      },
    },
  }),
  inlineCode: props => <Code margin="1px" colorScheme="cyan" fontWeight="semibold" fontSize="1em" {...props} />,
  Text,
  PackageInstall,
  ul: UnorderedList,
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
    heading: '"Poppins", sans-serif',
    body: '"Poppins", sans-serif',
  },
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  styles,
});

const serializedMdx = process.env.SERIALIZED_MDX_ROUTES;
let mdxRoutesData = serializedMdx && JSON.parse(serializedMdx);

const accentColor = '#1CC8EE';

function AppContent({ color, appProps }: { color: string; appProps: AppProps }) {
  const { Component, pageProps, router } = appProps;

  const isDocs = router.asPath.includes('docs');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const mdxRoutes: MdxInternalProps['mdxRoutes'] | undefined = pageProps.mdxRoutes;
  const Navigation = useMemo(() => {
    const paths = mdxRoutes === 1 ? mdxRoutesData : (mdxRoutesData = mdxRoutes || mdxRoutesData);
    return (
      <DocsNavigation>
        <DocsTitle>Documentation</DocsTitle>
        <MDXNavigation paths={iterateRoutes(paths)} accentColor={color} handleLinkClick={onClose} defaultOpenDepth={4} />
      </DocsNavigation>
    );
  }, [mdxRoutes]);

  const drawerBgContent = useColorModeValue('white', 'gray.850');

  const drawerBgButton = useColorModeValue('gray.200', 'gray.700');

  const drawerColorButton = useColorModeValue('gray.500', 'gray.100');

  return (
    <TGCThemeProvider>
      <GlobalStyles />
      <Header accentColor={color} activeLink="/open-source" themeSwitch />
      <Subheader
        activeLink={router.asPath}
        product={{
          title: 'Envelop',
          description: '',
          image: {
            src: 'https://the-guild.dev/static/shared-logos/products/envelop.svg',
            alt: 'Envelop Logo',
          },
          onClick: e => handleRoute('/', e, router),
        }}
        links={[
          {
            children: 'Home',
            title: 'The Guild Envelop',
            href: '/',
            onClick: e => handleRoute('/', e, router),
          },
          {
            children: 'Plugins Hub',
            href: '/plugins',
            title: 'Browse the plugins hub',
            onClick: e => handleRoute('/plugins', e, router),
          },
          {
            children: 'API & Docs',
            href: '/docs',
            title: 'Read more about Envelop',
            onClick: e => handleRoute('/docs', e, router),
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
          onClick: e => handleRoute('/docs', e, router),
        }}
      />
      {!isDocs ? (
        <Component {...pageProps} />
      ) : (
        <DocsContainer>
          <DocsNavigationDesktop>{Navigation}</DocsNavigationDesktop>
          <DocsNavigationMobile>
            <IconButton
              onClick={onOpen}
              icon={<HamburgerIcon />}
              aria-label="Open navigation"
              size="sm"
              position="fixed"
              right="1.5rem"
              bottom="1.5rem"
              zIndex="1"
              backgroundColor={color}
              color="#fff"
            />
            <Drawer size="2xl" isOpen={isOpen} onClose={onClose} placement="left">
              <DrawerOverlay />
              <DrawerContent backgroundColor={drawerBgContent}>
                <DrawerCloseButton
                  backgroundColor={drawerBgButton}
                  color={drawerColorButton}
                  height="2.375rem"
                  width="2.375rem"
                  top="1.5rem"
                  right="1.5rem"
                  fontSize="0.85rem"
                  borderRadius="0.5rem"
                  border="2px solid transparent"
                  _hover={{
                    borderColor: 'gray.500',
                  }}
                />
                <DrawerBody>{Navigation}</DrawerBody>
              </DrawerContent>
            </Drawer>
          </DocsNavigationMobile>
          <Component {...pageProps} />
        </DocsContainer>
      )}
      <Footer />
    </TGCThemeProvider>
  );
}

const AppContentWrapper = appWithTranslation(function TranslatedApp(appProps) {
  return <AppContent appProps={appProps} color={accentColor} />;
});

export default function App(appProps: AppProps) {
  return (
    <ChakraThemeProvider>
      <NextNProgress color={accentColor} />
      <AppContentWrapper {...appProps} />
    </ChakraThemeProvider>
  );
}
