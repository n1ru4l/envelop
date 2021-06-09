import Head from 'next/head';
import { useFetch } from 'use-http';
import { MarketplaceSearch } from '@theguild/components';
import { Spinner, Center } from '@chakra-ui/react';
import type { PluginWithStats } from '../pages/api/plugins';
import React from 'react';
import { IMarketplaceItemProps } from '@theguild/components/dist/types/components';
import { RemoteGHMarkdown } from '../components/RemoteGhMarkdown';
import { PackageInstall } from '../components/packageInstall';

export default function Marketplace() {
  const { loading, data = [] } = useFetch<PluginWithStats[]>('/api/plugins', {}, []);

  const marketplaceItems = React.useMemo(() => {
    if (data && data.length > 0) {
      return data.map<IMarketplaceItemProps>(rawPlugin => ({
        title: rawPlugin.title,
        description: rawPlugin.stats.collected.metadata.description,
        modal: {
          header: {
            image: {
              src: rawPlugin.iconUrl!,
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
                directory={rawPlugin.stats.collected.metadata.repository.directory}
                repo={rawPlugin.stats.collected.metadata.links.repository}
              >
                {rawPlugin.stats.collected.metadata.readme || ''}
              </RemoteGHMarkdown>
            </>
          ),
        },
        update: rawPlugin.stats.collected.metadata.date,
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

  return (
    <>
      <Head>
        <title>Plugins Hub</title>
      </Head>
      {loading ? (
        <Center h="300px">
          <Spinner size={'xl'} />
        </Center>
      ) : (
        <>
          {/* <CardsColorful
        cards={[
          {
            title: 'GraphQL Modules',
            description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            category: 'New release by the guild',
            link: {
              href: 'https://www.graphql-modules.com/',
              target: '_blank',
              rel: 'noopener norefereer',
              title: 'Learn more',
            },
            color: '#3547E5',
          },
          {
            title: 'The best way to REST!',
            description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            category: 'Pro tip',
            link: {
              href: 'https://medium.com/the-guild/sofa-the-best-way-to-rest-is-graphql-d9da6e8e7693',
              target: '_blank',
              rel: 'noopener norefereer',
              title: 'Learn more',
            },
            color: '#0B0D11',
          },
        ]}
      /> */}

          <MarketplaceSearch
            title="Explore Plugins Hub"
            placeholder="Search..."
            primaryList={{
              title: 'Trending',
              items: marketplaceItems,
              placeholder: '0 results',
              pagination: 10,
            }}
            secondaryList={{
              title: 'Recently Added',
              items: marketplaceItems,
              placeholder: '0 results',
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
