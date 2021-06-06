import bodyParser from 'koa-bodyparser';

import { BaseEnvelopAppOptions, BaseEnvelopBuilder, createEnvelopAppFactory, handleRequest } from './common/app';
import { handleCodegen, WithCodegen } from './common/codegen/handle';
import { handleIDE, WithIDE } from './common/ide/handle';
import { RawAltairHandlerDeps } from './common/ide/rawAltair';
import { handleJit, WithJit } from './common/jit';

import type { Options as CorsOptions } from '@koa/cors';
import type * as KoaRouter from '@koa/router';
import type { EnvelopContext } from './common/types';
import type { ParameterizedContext, Request, Response } from 'koa';
import type { Envelop } from '@envelop/types';
import type { WithGraphQLUpload } from './common/upload';

export interface BuildContextArgs {
  request: Request;
  response: Response;
}

export interface EnvelopAppOptions
  extends BaseEnvelopAppOptions<EnvelopContext>,
    WithCodegen,
    WithJit,
    WithIDE,
    WithGraphQLUpload {
  /**
   * Build Context
   */
  buildContext?: (args: BuildContextArgs) => Record<string, unknown> | Promise<Record<string, unknown>>;

  /**
   * @default "/graphql"
   */
  path?: string;

  /**
   * [koa-bodyparser](http://npm.im/koa-bodyparser) options
   */
  bodyParserOptions?: bodyParser.Options | false;

  /**
   * Enable CORS or configure it
   */
  cors?: boolean | CorsOptions;
}

export interface BuildAppOptions {
  prepare?: (appBuilder: BaseEnvelopBuilder) => void | Promise<void>;
  /**
   * Koa Router instance
   *
   * @see [https://npm.im/@koa/router](https://npm.im/@koa/router)
   */
  router: KoaRouter;
}

export interface EnvelopApp {
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
        moduleName: 'koa',
      });
    },
  });

  async function buildApp({ router, prepare }: BuildAppOptions): Promise<EnvelopApp> {
    const { path = '/graphql', buildContext, ide, bodyParserOptions = {}, customHandleRequest } = config;

    const { getEnveloped } = await appBuilder({
      prepare,
      async adapterFactory(getEnveloped) {
        if (config.cors) {
          const koaCors = (await import('@koa/cors')).default;

          router.use(koaCors(typeof config.cors === 'boolean' ? undefined : config.cors));
        }

        if (bodyParserOptions) router.use(bodyParser(bodyParserOptions));

        await handleIDE(ide, path, {
          async handleAltair(ideOptions) {
            const { path, baseURL, renderOptions, deps } = RawAltairHandlerDeps(ideOptions);

            async function altairHandler(
              ctx: ParameterizedContext<any, KoaRouter.RouterParamContext<any, {}>, any>
            ): Promise<unknown> {
              const { renderAltair, getDistDirectory, readFile, resolve, lookup } = await deps;

              switch (ctx.url) {
                case path:
                case baseURL: {
                  ctx.type = 'html';

                  ctx.body = renderAltair({
                    ...renderOptions,
                    baseURL,
                  });
                  return;
                }
                default: {
                  const resolvedPath = resolve(getDistDirectory(), ctx.url.slice(baseURL.length));

                  const result = await readFile(resolvedPath).catch(() => {});

                  if (!result) return (ctx.status = 404);

                  const contentType = lookup(resolvedPath);
                  if (contentType) ctx.type = contentType;
                  return (ctx.body = result);
                }
              }
            }

            const basePath = path.endsWith('/') ? path.slice(0, path.length - 1) : path;

            router.get([basePath, basePath + '/(.*)'], async ctx => {
              await altairHandler(ctx);
            });
          },
          handleGraphiQL({ path, html }) {
            router.get(path, ctx => {
              ctx.type = 'html';
              ctx.body = html;
            });
          },
        });

        const requestHandler = customHandleRequest || handleRequest;

        const main: KoaRouter.Middleware = ctx => {
          const request = {
            body: ctx.request.body,
            headers: ctx.request.headers,
            method: ctx.request.method,
            query: ctx.request.query,
          };

          return requestHandler({
            request,
            baseOptions: config,
            buildContext,
            buildContextArgs() {
              return {
                request: ctx.request,
                response: ctx.response,
              };
            },
            getEnveloped,
            onResponse(result) {
              ctx.type = 'application/json';
              ctx.response.status = result.status;
              ctx.response.body = result.payload;
            },
            onMultiPartResponse(result, defaultHandle) {
              return defaultHandle(ctx.req, ctx.res, result);
            },
            onPushResponse(result, defaultHandle) {
              return defaultHandle(ctx.req, ctx.res, result);
            },
          });
        };

        if (config.GraphQLUpload) {
          const GraphQLUploadMiddleware: typeof import('graphql-upload').graphqlUploadKoa = (
            await import('graphql-upload/public/graphqlUploadKoa.js')
          ).default;

          const middleware = GraphQLUploadMiddleware(typeof config.GraphQLUpload === 'object' ? config.GraphQLUpload : undefined);

          router.get(path, main).post(path, middleware, main);
        } else {
          router.get(path, main).post(path, main);
        }
      },
    });

    return {
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
