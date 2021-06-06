import assert from 'assert';
import { Express, json, Request, RequestHandler, Response, Router } from 'express';
import { createServer, Server } from 'http';

import { BaseEnvelopAppOptions, BaseEnvelopBuilder, createEnvelopAppFactory, handleRequest } from './common/app';
import { handleCodegen, WithCodegen } from './common/codegen/handle';
import { handleIDE, WithIDE } from './common/ide/handle';
import { handleJit, WithJit } from './common/jit';
import { CreateWebSocketsServer, WithWebSockets } from './common/websockets/handle';

import type { CorsOptions, CorsOptionsDelegate } from 'cors';
import type { Envelop } from '@envelop/types';
import type { EnvelopContext } from './common/types';
import type { OptionsJson as BodyParserOptions } from 'body-parser';
import type { WithGraphQLUpload } from './common/upload';

export interface BuildContextArgs {
  request: Request;
  response: Response;
}

export interface EnvelopAppOptions
  extends BaseEnvelopAppOptions<EnvelopContext>,
    WithCodegen,
    WithJit,
    WithWebSockets,
    WithIDE,
    WithGraphQLUpload {
  /**
   * @default "/graphql"
   */
  path?: string;

  /**
   * JSON body-parser options
   */
  bodyParserJSONOptions?: BodyParserOptions | boolean;

  /**
   * Build Context
   */
  buildContext?: (args: BuildContextArgs) => Record<string, unknown> | Promise<Record<string, unknown>>;

  /**
   * Enable or configure CORS
   */
  cors?: boolean | CorsOptions | CorsOptionsDelegate;
}

export interface BuildAppOptions {
  app: Express;
  server?: Server;
  prepare?: (appBuilder: BaseEnvelopBuilder) => void | Promise<void>;
}

export interface EnvelopApp {
  router: Router;
  getEnveloped: Envelop<unknown>;
}

export interface EnvelopAppBuilder extends BaseEnvelopBuilder {
  buildApp(options: BuildAppOptions): Promise<EnvelopApp>;
}

export function CreateApp(config: EnvelopAppOptions = {}): EnvelopAppBuilder {
  const { appBuilder, ...commonApp } = createEnvelopAppFactory(config, {
    async preBuild(plugins) {
      await handleJit(config, plugins);
    },
    afterBuilt(getEnveloped) {
      handleCodegen(getEnveloped, config, {
        moduleName: 'express',
      });
    },
  });

  const { path = '/graphql', websockets, customHandleRequest } = config;

  const websocketsFactoryPromise = CreateWebSocketsServer(websockets);

  async function handleSubscriptions(getEnveloped: Envelop<unknown>, appInstance: Express, optionsServer: Server | undefined) {
    if (!websockets) return;

    const websocketsHandler = await websocketsFactoryPromise;
    assert(websocketsHandler);

    const handleUpgrade = websocketsHandler(getEnveloped);

    const server = optionsServer || createServer(appInstance);

    appInstance.listen = (...args: any[]) => {
      return server.listen(...args);
    };

    const state = handleUpgrade(server, path);

    const oldClose = server.close;
    server.close = function (cb) {
      state.closing = true;

      oldClose.call(this, cb);

      for (const wsServer of state.wsServers) {
        for (const client of wsServer.clients) {
          client.close();
        }
        wsServer.close();
      }

      return server;
    };
  }

  async function buildApp({ prepare, app, server }: BuildAppOptions): Promise<EnvelopApp> {
    const { buildContext, path = '/graphql', bodyParserJSONOptions: jsonOptions = {}, ide, cors } = config;
    const { app: router, getEnveloped } = await appBuilder({
      prepare,
      async adapterFactory(getEnveloped) {
        const EnvelopApp = Router();

        if (cors) {
          const corsMiddleware = (await import('cors')).default;
          EnvelopApp.use(corsMiddleware(typeof cors !== 'boolean' ? cors : undefined));
        }

        if (jsonOptions) EnvelopApp.use(json(typeof jsonOptions === 'object' ? jsonOptions : undefined));

        const IDEPromise = handleIDE(ide, path, {
          async handleAltair(ideOptions) {
            const { altairExpress } = await import('altair-express-middleware');

            EnvelopApp.use(ideOptions.path, altairExpress(ideOptions));
          },
          handleGraphiQL({ path, html }) {
            EnvelopApp.use(path, (_req, res) => {
              res.type('html').send(html);
            });
          },
        });

        const subscriptionsPromise = handleSubscriptions(getEnveloped, app, server);

        const requestHandler = customHandleRequest || handleRequest;

        const ExpressRequestHandler: RequestHandler = (req, res, next) => {
          const request = {
            body: req.body,
            headers: req.headers,
            method: req.method,
            query: req.query,
          };

          return requestHandler({
            request,
            getEnveloped,
            baseOptions: config,
            buildContextArgs() {
              return {
                request: req,
                response: res,
              };
            },
            buildContext,
            onResponse(result) {
              res.type('application/json');
              res.status(result.status);
              res.json(result.payload);
            },
            onMultiPartResponse(result, defaultHandle) {
              return defaultHandle(req, res, result);
            },
            onPushResponse(result, defaultHandle) {
              return defaultHandle(req, res, result);
            },
          }).catch(next);
        };

        EnvelopApp.get(path, ExpressRequestHandler);
        if (config.GraphQLUpload) {
          const GraphQLUploadMiddleware: typeof import('graphql-upload').graphqlUploadExpress = (
            await import('graphql-upload/public/graphqlUploadExpress.js')
          ).default;

          const middleware = GraphQLUploadMiddleware(typeof config.GraphQLUpload === 'object' ? config.GraphQLUpload : undefined);

          EnvelopApp.post(path, middleware, ExpressRequestHandler);
        } else {
          EnvelopApp.post(path, ExpressRequestHandler);
        }

        await Promise.all([IDEPromise, subscriptionsPromise]);

        return EnvelopApp;
      },
    });

    return {
      router: await router,
      getEnveloped,
    };
  }

  return {
    ...commonApp,
    buildApp,
  };
}

export { gql } from 'graphql-modules';

export * from './common/base';
