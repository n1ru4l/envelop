import type { CorsOptions, CorsOptionsDelegate } from 'cors';
import type { IncomingMessage, ServerResponse } from 'http';

export interface WithCors {
  cors?: boolean | CorsOptions | CorsOptionsDelegate;
}

export type CorsMiddleware = (req: IncomingMessage, res: ServerResponse, options?: WithCors['cors']) => Promise<unknown>;

function initMiddleware(middleware: typeof import('cors')): CorsMiddleware {
  return (req: IncomingMessage, res: ServerResponse, options?: WithCors['cors']) =>
    new Promise<unknown>((resolve, reject) => {
      middleware(typeof options === 'boolean' ? undefined : options)(req, res, (result: Error | unknown) => {
        if (result instanceof Error) {
          return reject(result);
        }

        return resolve(result);
      });
    });
}

export function handleCors(options?: WithCors): void | Promise<CorsMiddleware> {
  if (!options) return;

  return import('cors').then(({ default: corsModule }) => {
    return initMiddleware(corsModule);
  });
}
