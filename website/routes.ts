import { IRoutes, GenerateRoutes } from '@guild-docs/server';

export function getRoutes(): IRoutes {
  const Routes: IRoutes = {
    _: {
      docs: {
        $name: 'Docs',
        $routes: ['README', 'getting-started', 'integrations', 'core'],
        _: {
          plugins: {
            $name: 'Plugins',
            $routes: ['README', 'lifecycle', 'custom-plugin', 'sharing-plugins'],
          },
        },
      },
    },
  };

  GenerateRoutes({
    Routes,
    folderPattern: 'docs',
    basePath: 'docs',
    basePathLabel: 'Documentation',
    labels: {},
  });

  return Routes;
}
