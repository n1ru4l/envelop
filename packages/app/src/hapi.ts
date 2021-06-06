import { BaseEnvelopAppOptions, BaseEnvelopBuilder, createEnvelopAppFactory, handleRequest } from './common/app';
import { LazyPromise } from './common/base';
import { handleCodegen, WithCodegen } from './common/codegen/handle';
import { handleIDE, WithIDE } from './common/ide/handle';
import { RawAltairHandler } from './common/ide/rawAltair';
import { handleJit, WithJit } from './common/jit';

import type { EnvelopContext } from './common/types';
import type { Request, ResponseToolkit, Plugin, Server, Lifecycle, RouteOptionsCors, RouteOptions } from '@hapi/hapi';
import type { Envelop } from '@envelop/types';

export interface BuildContextArgs {
  request: Request;
  h: ResponseToolkit;
}

export interface EnvelopAppOptions extends BaseEnvelopAppOptions<EnvelopContext>, WithCodegen, WithJit, WithIDE {
  /**
   * Build Context
   */
  buildContext?: (args: BuildContextArgs) => Record<string, unknown> | Promise<Record<string, unknown>>;

  /**
   * @default "/graphql"
   */
  path?: string;

  /**
   * Enable CORS or configure it
   */
  cors?: boolean | RouteOptionsCors;

  /**
   * Configure main route options
   */
  mainRouteOptions?: RouteOptions;

  /**
   * Configure IDE route options
   */
  ideRouteOptions?: RouteOptions;
}

export interface BuildAppOptions {
  prepare?: (appBuilder: BaseEnvelopBuilder) => void | Promise<void>;
}

export interface EnvelopApp {
  plugin: Plugin<{}>;
  getEnveloped: Promise<Envelop<unknown>>;
}
export interface EnvelopAppBuilder extends BaseEnvelopBuilder {
  buildApp(options?: BuildAppOptions): EnvelopApp;
}

export function CreateApp(config: EnvelopAppOptions = {}): EnvelopAppBuilder {
  const { appBuilder, ...commonApp } = createEnvelopAppFactory(config, {
    async preBuild(plugins) {
      await handleJit(config, plugins);
    },
    afterBuilt(getEnveloped) {
      handleCodegen(getEnveloped, config, {
        moduleName: 'hapi',
      });
    },
  });

  function buildApp({ prepare }: BuildAppOptions = {}): EnvelopApp {
    const { ide, path = '/graphql', buildContext, customHandleRequest } = config;

    const registerApp = appBuilder({
      prepare,
      adapterFactory(getEnveloped) {
        return async function register(server: Server) {
          await handleIDE(ide, path, {
            handleAltair({ path, ...renderOptions }) {
              const altairHandler = RawAltairHandler({
                path,
                ...renderOptions,
              });

              const basePath = path.endsWith('/') ? path.slice(0, path.length - 1) : path;

              const wildCardPath = `${basePath}/{any*}`;

              async function handler(req: Request, h: ResponseToolkit) {
                await altairHandler(req.raw.req, req.raw.res);

                return h.abandon;
              }

              server.route({
                path: wildCardPath,
                method: 'GET',
                handler,
                options: config.ideRouteOptions,
              });
            },
            handleGraphiQL({ path, html }) {
              server.route({
                path,
                method: 'GET',
                options: config.ideRouteOptions,
                handler(_req, h) {
                  return h.response(html).type('text/html');
                },
              });
            },
          });

          const requestHandler = customHandleRequest || handleRequest;

          server.route({
            path,
            method: ['GET', 'POST'],
            options: {
              cors: config.cors,
              ...config.mainRouteOptions,
            },
            async handler(req, h) {
              const request = {
                body: req.payload,
                headers: req.headers,
                method: req.method,
                query: req.query,
              };

              return requestHandler<BuildContextArgs, Lifecycle.ReturnValueTypes>({
                request,
                getEnveloped,
                baseOptions: config,
                buildContext,
                buildContextArgs() {
                  return {
                    request: req,
                    h,
                  };
                },
                onResponse(result) {
                  return h.response(result.payload).code(result.status).type('application/json');
                },
                async onMultiPartResponse(result, defaultHandle) {
                  await defaultHandle(req.raw.req, req.raw.res, result);

                  return h.abandon;
                },
                async onPushResponse(result, defaultHandle) {
                  await defaultHandle(req.raw.req, req.raw.res, result);

                  return h.abandon;
                },
              });
            },
          });
        };
      },
    });

    return {
      plugin: {
        name: 'EnvelopApp',
        async register(server) {
          await (await registerApp).app(server);
        },
      },
      getEnveloped: LazyPromise(() => registerApp.then(v => v.getEnveloped)),
    };
  }

  return {
    ...commonApp,
    buildApp,
  };
}

export { gql } from 'graphql-modules';
export * from './common/base';
