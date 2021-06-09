import { NextApiRequest, NextApiResponse } from 'next';
import Lru from 'tiny-lru';
import { NpmsIO, PackageInfo } from 'npms.io';

const npmsIO = new NpmsIO();
const cache = Lru(100, 3.6e6); // 1h

export type RawPlugin = {
  title: string;
  npmPackage: string;
  iconUrl?: string;
};

const pluginsArr: RawPlugin[] = [
  {
    title: 'useSentry',
    npmPackage: '@envelop/sentry',
    iconUrl: '/assets/logos/sentry.png',
  },
];

export type PluginWithStats = RawPlugin & {
  stats: PackageInfo;
};

async function getPackageStats(name: string): Promise<PackageInfo | null> {
  try {
    return await npmsIO.api.package.packageInfo(name);
  } catch (e) {
    return null;
  }
}

async function plugins(req: NextApiRequest, res: NextApiResponse) {
  const allPlugins = await Promise.all(
    pluginsArr.map(async rawPlugin => {
      const stats = cache.get(rawPlugin.title) || (await getPackageStats(rawPlugin.npmPackage));

      if (rawPlugin && !cache.has(rawPlugin.title)) {
        cache.set(rawPlugin.title, stats);
      }

      return {
        ...rawPlugin,
        stats,
      };
    })
  );

  res.json(allPlugins);
}

export default plugins;
