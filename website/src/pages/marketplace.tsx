import Head from 'next/head';
import { CardsColorful, MarketplaceSearch } from '@guild-docs/tgc';

export default function Marketplace() {
  const marketplaceItems = [];
  const marketplaceItem = {
    title: 'Marketplace Item',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    update: '2021-05-07T10:14:55.884Z',
    stars: 10394,
    image: {
      src: '/assets/marketplace-placeholder.svg',
      alt: 'Logo',
    },
    link: {
      href: 'https://github.com',
      target: '_blank',
      rel: 'noopener noreferrer',
      title: 'Learn more about Item',
    },
    modal: {
      header: {
        image: {
          src: '/assets/marketplace-placeholder.svg',
          alt: 'Logo',
        },
        description: {
          children: 'Apr 20, 2021 - Latest Update',
          href: 'https://github.com',
          target: '_blank',
          rel: 'noopener noreferrer',
          title: 'External Title',
        },
      },
      content: 'Modal Content goes here.',
    },
  };

  for (let i = 1; i <= 0; i++) {
    const item = { ...marketplaceItem };
    item.title = `${item.title} ${i}`;
    marketplaceItems.push(item);
  }

  return (
    <>
      <Head>
        <title>Marketplace - Envelop</title>
      </Head>
      <CardsColorful
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
      />
      <MarketplaceSearch
        title="Explore Marketplace"
        placeholder="Search..."
        primaryList={{
          title: 'Trending & Last Update',
          items: marketplaceItems.slice(0, 8),
          placeholder: 'No products available...',
          pagination: 5,
        }}
        secondaryList={{
          title: 'New Release',
          items: marketplaceItems.slice(8, 12),
          placeholder: 'No products available...',
          pagination: 5,
        }}
        queryList={{
          title: 'Query Results',
          items: marketplaceItems,
          placeholder: 'No results for {query}',
          pagination: 8,
        }}
      />
    </>
  );
}
