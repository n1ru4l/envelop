import { LazyPromise } from '../utils/promise';

import type { RenderOptions } from 'altair-static';
import type { IncomingMessage, ServerResponse } from 'http';

export interface RawAltairHandlerOptions extends Omit<RenderOptions, 'baseURL'> {
  path: string;
}

const RawAltairDeps = LazyPromise(async () => {
  const [
    { getDistDirectory, renderAltair },
    {
      promises: { readFile },
    },
    { resolve },
    { lookup },
  ] = await Promise.all([import('altair-static'), import('fs'), import('path'), import('mime-types')]);

  return {
    getDistDirectory,
    renderAltair,
    readFile,
    resolve,
    lookup,
  };
});

export function RawAltairHandlerDeps(options: RawAltairHandlerOptions): {
  path: string;
  baseURL: string;
  renderOptions: RenderOptions;
  deps: typeof RawAltairDeps;
} {
  let { path = '/altair', ...renderOptions } = options;

  const baseURL = path.endsWith('/') ? (path = path.slice(0, path.length - 1)) + '/' : path + '/';

  return {
    path,
    baseURL,
    renderOptions,
    deps: RawAltairDeps,
  };
}

export function RawAltairHandler(options: RawAltairHandlerOptions): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const { path, baseURL, renderOptions } = RawAltairHandlerDeps(options);

  return async function (req, res) {
    try {
      const { renderAltair, getDistDirectory, readFile, resolve, lookup } = await RawAltairDeps;

      switch ((req.url ||= '_')) {
        case path:
        case baseURL: {
          res.setHeader('content-type', 'text/html');
          return res.end(
            renderAltair({
              ...renderOptions,
              baseURL,
            })
          );
        }
        default: {
          const resolvedPath = resolve(getDistDirectory(), req.url.slice(baseURL.length));

          const result = await readFile(resolvedPath).catch(() => {});

          if (!result) return res.writeHead(404).end();

          const contentType = lookup(resolvedPath);
          if (contentType) res.setHeader('content-type', contentType);
          return res.end(result);
        }
      }
    } catch (err) /* istanbul ignore next */ {
      res
        .writeHead(500, {
          'content-type': 'application/json',
        })
        .end(
          JSON.stringify({
            message: err.message,
          })
        );
    }
  };
}
