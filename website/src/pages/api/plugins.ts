import { NextApiRequest, NextApiResponse } from 'next';
import Lru from 'tiny-lru';
import { NpmsIO, PackageInfo } from 'npms.io';
import { pluginsArr, RawPlugin } from '../../lib/plugins';

const npmsIO = new NpmsIO();
const cache = Lru(100, 3.6e6); // 1h

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
  const idSpecific = req.query.id as string | null;
  let plugins = pluginsArr;

  if (idSpecific) {
    const rawPlugin = pluginsArr.find(t => t.identifier === idSpecific);

    if (!rawPlugin) {
      res.json([]);
      return;
    }

    plugins = [rawPlugin];
  }

  const allPlugins = await Promise.all(
    plugins.map(async rawPlugin => {
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
