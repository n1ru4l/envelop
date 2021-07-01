import Head from 'next/head';
import { useFetch } from 'use-http';
import { CardsColorful, MarketplaceSearch } from '@theguild/components';
import { Spinner, Center } from '@chakra-ui/react';
import type { PluginWithStats } from '../../pages/api/plugins';
import React from 'react';
import { IMarketplaceItemProps } from '@theguild/components/dist/types/components';
import { RemoteGHMarkdown } from '../../components/RemoteGhMarkdown';
import { PackageInstall } from '../../components/packageInstall';
import { Markdown } from '../../components/Markdown';
import { compareDesc } from 'date-fns';

export default function Marketplace() {
  const { loading, data = [] } = useFetch<PluginWithStats[]>('/api/plugins', {}, []);

  const marketplaceItems: Array<IMarketplaceItemProps & { raw: PluginWithStats }> = React.useMemo(() => {
    if (data && data.length > 0) {
      return data.map<IMarketplaceItemProps & { raw: PluginWithStats }>(rawPlugin => ({
        raw: rawPlugin,
        title: rawPlugin.title,
        link: {
          href: `/plugins/${rawPlugin.identifier}`,
          title: `${rawPlugin.title} plugin details`,
        },
        description: (
          <Markdown>{`${rawPlugin.stats?.collected?.metadata?.version || ''}\n\n${
            rawPlugin.stats?.collected?.metadata?.description || ''
          }`}</Markdown>
        ),
        modal: {
          header: {
            image: {
              src: rawPlugin.iconUrl,
              alt: rawPlugin.title,
            },
            description: {
              href: `https://www.npmjs.com/package/${rawPlugin.npmPackage}`,
              children: `${rawPlugin.npmPackage} on npm`,
              title: `${rawPlugin.npmPackage} on NPM`,
              target: '_blank',
              rel: 'noopener noreferrer',
            },
          },
          content: (
            <>
              <PackageInstall packageName={rawPlugin.npmPackage} />
              <RemoteGHMarkdown
                directory={rawPlugin.stats?.collected?.metadata?.repository?.directory}
                repo={rawPlugin.stats?.collected?.metadata?.links?.repository}
              >
                {rawPlugin.readme || rawPlugin.stats?.collected?.metadata?.readme || ''}
              </RemoteGHMarkdown>
            </>
          ),
        },
        update: rawPlugin.stats?.collected?.metadata?.date || new Date().toISOString(),
        image: {
          height: 60,
          width: 60,
          src: rawPlugin.iconUrl!,
          alt: rawPlugin.title,
        },
      }));
    }

    return [];
  }, [data]);

  const recentlyUpdatedItems = React.useMemo(() => {
    if (marketplaceItems && marketplaceItems.length > 0) {
      return [...marketplaceItems].sort((a, b) => {
        return compareDesc(new Date(a.update), new Date(b.update));
      });
    }

    return [];
  }, [marketplaceItems]);

  const trendingItems = React.useMemo(() => {
    if (marketplaceItems && marketplaceItems.length > 0) {
      return [...marketplaceItems]
        .filter(i => i.raw.stats?.collected?.npm.downloads)
        .sort((a, b) => {
          const aMonthlyDownloads = a.raw.stats.collected.npm.downloads[2].count;
          const bMonthlyDownloads = b.raw.stats.collected.npm.downloads[2].count;

          return bMonthlyDownloads - aMonthlyDownloads;
        });
    }

    return [];
  }, [marketplaceItems]);

  // const randomThirdParty = React.useMemo(() => {
  //   if (marketplaceItems && marketplaceItems.length > 0) {
  //     return [...marketplaceItems]
  //       .filter(item => item.raw.npmPackage !== '@envelop/core')
  //       .sort(() => 0.5 - Math.random())
  //       .slice(0, 3);
  //   }

  //   return [];
  // }, [marketplaceItems]);

  return (
    <>
      <Head>
        <title>Plugin Hub</title>
      </Head>
      {loading ? (
        <Center h="300px">
          <Spinner size={'xl'} />
        </Center>
      ) : (
        <>
          {/* <CardsColorful
            cards={randomThirdParty.map(item => ({
              title: item.title,
              description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
              category: 'Discover new Envelop plugins!',
              link: {
                href: `https://www.npmjs.com/package/${item.raw.npmPackage}`,
                target: '_blank',
                rel: 'noopener norefereer',
                title: 'Learn more',
              },
              color: '#3547E5',
            }))}
          /> */}
          <MarketplaceSearch
            title="Explore Plugin Hub"
            placeholder="Find plugins..."
            primaryList={{
              title: 'Trending',
              items: trendingItems,
              placeholder: '0 items',
              pagination: 10,
            }}
            secondaryList={{
              title: 'Recently Updated',
              items: recentlyUpdatedItems,
              placeholder: '0 items',
              pagination: 10,
            }}
            queryList={{
              title: 'Search Results',
              items: marketplaceItems,
              placeholder: 'No results for {query}',
              pagination: 10,
            }}
          />
        </>
      )}
    </>
  );
}
