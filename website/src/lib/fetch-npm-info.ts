type Package = {
  readme: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  weeklyNPMDownloads: number;
};

const cache: Record<string, Package> = {};

export function withoutStartingSlash(v: string) {
  if (v === '/') return v;
  if (v.startsWith('/')) return v.slice(1, v.length);
  return v;
}

export function withoutTrailingSlash(v: string) {
  if (v === '/') return v;
  if (v.endsWith('/')) return v.slice(0, v.length - 1);
  return v;
}

export function withStartingSlash(v: string) {
  if (v.startsWith('/')) return v;
  return '/' + v;
}

async function tryRemoteReadme(repo: string, path: string) {
  const fetchPath = `https://raw.githubusercontent.com/${withoutStartingSlash(
    withoutTrailingSlash(repo)
  )}/HEAD${withStartingSlash(path)}`;

  try {
    const response = await fetch(fetchPath, {
      method: 'GET',
    });

    if (response.status === 404) {
      console.error(`ERROR | ${fetchPath} Not Found`);
    }

    return await response.text();
  } catch (err) {
    console.error('[GUILD-DOCS] ERROR | Error while trying to get README from GitHub ' + fetchPath);
    console.error(err);

    return null;
  }
}

export const fetchPackageInfo = async (
  packageName: string,
  githubReadme?: {
    repo: string;
    path: string;
  }
): Promise<Package> => {
  // cache since we fetch same data on /plugins and /plugins/:name
  const cachedData = cache[packageName];
  if (cachedData) {
    console.log({ cachedData });
    return cachedData;
  }

  const encodedName = encodeURIComponent(packageName);
  console.debug(`Loading NPM package info: ${encodedName}`);
  const [packageInfo, { downloads }] = await Promise.all([
    fetch(`https://registry.npmjs.org/${encodedName}`).then(response => response.json()),
    fetch(`https://api.npmjs.org/downloads/point/last-week/${encodedName}`).then(response => response.json()),
  ]);

  console.log(Object.keys(packageInfo));

  const { readme, time, description } = packageInfo;

  const readmeContent = githubReadme ? await tryRemoteReadme(githubReadme.repo, githubReadme.path) : readme;
  console.log(readme);
  cache[packageName] = {
    readme: readmeContent || readme,
    createdAt: time.created,
    updatedAt: time.modified,
    description,
    weeklyNPMDownloads: downloads,
  };

  return cache[packageName];
};
