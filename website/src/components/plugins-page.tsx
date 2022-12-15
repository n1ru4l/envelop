import { useMemo } from 'react';
import { StaticImageData } from 'next/image';
import { useSSG } from 'nextra/ssg';
import { compareDesc } from 'date-fns';
import { MarketplaceSearch, fetchPackageInfo } from '@theguild/components';
import { PLUGINS, ALL_TAGS } from '@/lib/plugins';

type Plugin = {
  title: string;
  readme: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  linkHref: string;
  weeklyNPMDownloads: number;
  icon: StaticImageData;
  tags: string[];
  className?: string;
};

export const getStaticProps = async () => {
  const plugins: Plugin[] = await Promise.all(
    PLUGINS.map(async ({ identifier, npmPackage, title, icon, tags, githubReadme, className = '' }) => {
      const {
        readme,
        createdAt,
        updatedAt,
        description,
        weeklyNPMDownloads = 0,
      } = await fetchPackageInfo(npmPackage, githubReadme);
      const actualReadme = githubReadme ? 'TODO' : readme;

      return {
        title,
        readme: actualReadme,
        createdAt,
        updatedAt,
        description,
        linkHref: `/plugins/${identifier}`,
        weeklyNPMDownloads,
        icon,
        tags,
        className,
      };
    })
  );

  return {
    props: {
      // We add an `ssg` field to the page props,
      // which will be provided to the Nextra's `useSSG` hook.
      ssg: plugins,
    },
    // Revalidate at most once every 1 hour
    revalidate: 60 * 60,
  };
};

export function PluginsPage() {
  const plugins = useSSG() as Plugin[];

  const marketplaceItems = useMemo(
    () =>
      plugins.map(plugin => ({
        title: plugin.title,
        description: plugin.description,
        tags: plugin.tags,
        link: {
          href: plugin.linkHref,
          title: `${plugin.title} plugin details`,
        },
        update: plugin.updatedAt,
        image: {
          src: plugin.icon,
          placeholder: 'empty' as const,
          loading: 'eager' as const,
          alt: plugin.title,
          width: 60,
          className: `max-w-[3.75rem] ${plugin.className}`,
        },
        weeklyNPMDownloads: plugin.weeklyNPMDownloads,
      })),
    [plugins]
  );

  const recentlyUpdatedItems = useMemo(
    () => [...marketplaceItems].sort((a, b) => compareDesc(new Date(a.update), new Date(b.update))),
    [marketplaceItems]
  );

  const trendingItems = useMemo(
    () =>
      marketplaceItems
        .filter(i => i.weeklyNPMDownloads)
        .sort((a, b) => {
          const aMonthlyDownloads = a.weeklyNPMDownloads || 0;
          const bMonthlyDownloads = b.weeklyNPMDownloads || 0;

          return bMonthlyDownloads - aMonthlyDownloads;
        }),
    [marketplaceItems]
  );

  return (
    <MarketplaceSearch
      title="Explore Plugins"
      tagsFilter={ALL_TAGS}
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
  );
}
