/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-console */
/* istanbul ignore file */

import FormData from 'form-data';
import { promises } from 'fs';
import getPort from 'get-port';
import { ExecutionResult, print } from 'graphql';
import { createModule } from 'graphql-modules';
import { ClientOptions as GraphQLWSClientOptions, createClient as createGraphQLWSClient } from 'graphql-ws';
import merge from 'lodash/merge';
import { resolve } from 'path';
import { Readable } from 'stream';
import {
  ClientOptions as SubscriptionsTransportClientOptions,
  SubscriptionClient as SubscriptionsTransportClient,
} from 'subscriptions-transport-ws-envelop';
import tmp from 'tmp-promise';
import { Pool } from 'undici';
import ws from 'ws';

import {
  BaseEnvelopAppOptions,
  BaseEnvelopBuilder,
  CodegenConfig,
  createDeferredPromise,
  EnvelopContext,
  gql,
  InternalAppBuildOptions,
  LazyPromise,
  PLazy,
  WithCodegen,
} from '@envelop/app/extend';
import { isDocumentNode } from '@graphql-tools/utils';

import { UploadFileDocument } from './generated/envelop.generated';

import type DataLoader from 'dataloader';
import type { RequestOptions } from 'undici/types/client';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
export const { readFile } = promises;

const TearDownPromises: Promise<unknown>[] = [];

afterAll(async () => {
  await Promise.all(TearDownPromises);
});

declare module '../src/extend' {
  interface EnvelopContext extends Record<'numberMultiplier', DataLoader<number, number>> {}
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const PingSubscriptionModule = createModule({
  id: 'PingSubscription',
  typeDefs: gql`
    type Subscription {
      ping: String!
    }
  `,
  resolvers: {
    Subscription: {
      ping: {
        async *subscribe() {
          for (let i = 1; i <= 3; ++i) {
            await sleep(100);

            yield {
              ping: 'pong',
            };
          }
        },
      },
    },
  },
});

export function commonImplementation({ registerDataLoader, registerModule }: BaseEnvelopBuilder) {
  registerDataLoader('numberMultiplier', DataLoader => {
    return new DataLoader(async (keys: readonly number[]) => {
      return keys.map(k => k * 100);
    });
  });

  registerModule(
    gql`
      type Query {
        hello: String!
        users: [User!]!
        stream: [String!]!
      }
      type User {
        id: Int!
      }
    `,
    {
      resolvers: {
        Query: {
          hello(_root, _args, _ctx) {
            return 'Hello World!';
          },
          async users(_root, _args, _ctx) {
            return [...Array(10).keys()].map(id => ({
              id,
            }));
          },
          stream: {
            // @ts-expect-error codegen incompatibility with stream/defer directives
            resolve: async function* () {
              yield 'A';
              await sleep(100);
              yield 'B';
              await sleep(100);
              yield 'C';
            },
          },
        },
        User: {
          async id(root, _args, ctx) {
            return ctx.numberMultiplier.load(root.id);
          },
        },
      },
    }
  );

  registerModule(PingSubscriptionModule);
}

export interface TestCodegenOptions {
  tmpSchemaExtension?: string;
  tmpTSGeneratedExtension?: string;
}

export async function Codegen(
  options: BaseEnvelopAppOptions<never> & WithCodegen,
  { tmpSchemaExtension = '.gql', tmpTSGeneratedExtension = '.ts' }: TestCodegenOptions = {}
) {
  let tmpSchemaPath: string | undefined;
  let tmpPath: string | undefined;
  const deferredCodegenPromise = createDeferredPromise();

  if (options.enableCodegen) {
    await Promise.all([
      (async () => {
        const tmpSchema = await tmp.file({
          postfix: tmpSchemaExtension,
        });

        TearDownPromises.push(LazyPromise(() => tmpSchema.cleanup()));

        tmpSchemaPath = tmpSchema.path;

        merge(options, {
          outputSchema: tmpSchema.path,
          codegen: {
            onFinish: deferredCodegenPromise.resolve,
            onError: deferredCodegenPromise.reject,
          },
        } as typeof options);
      })(),
      (async () => {
        const tmpFile = await tmp.file({
          postfix: tmpTSGeneratedExtension,
        });
        TearDownPromises.push(LazyPromise(() => tmpFile.cleanup()));
        tmpPath = tmpFile.path;

        merge((options.codegen ||= {}), {
          targetPath: tmpFile.path,
        } as CodegenConfig);
      })(),
    ]);
  } else {
    deferredCodegenPromise.resolve();
  }

  return {
    tmpSchemaPath,
    tmpPath,
    codegenPromise: deferredCodegenPromise.promise,
  };
}

export interface StartTestServerOptions<
  Options extends BaseEnvelopAppOptions<EnvelopContext>,
  BuildOptions extends Pick<InternalAppBuildOptions<EnvelopContext>, 'prepare'>
> {
  options?: Options;
  buildOptions?: Partial<BuildOptions>;
  testCodegenOptions?: TestCodegenOptions;
  graphqlWsClientOptions?: Partial<GraphQLWSClientOptions>;
  websocketPath?: string;
  subscriptionsTransportClientOptions?: Partial<SubscriptionsTransportClientOptions>;
}

export async function startExpressServer({
  options = {},
  buildOptions = {},
  testCodegenOptions,
  graphqlWsClientOptions,
  websocketPath,
  subscriptionsTransportClientOptions,
}: StartTestServerOptions<import('../src/express').EnvelopAppOptions, import('../src/express').BuildAppOptions>) {
  const app = (await import('express')).default();

  const { CreateApp } = await import('../src/express');

  const { tmpPath, tmpSchemaPath, codegenPromise } = await Codegen(options, testCodegenOptions);

  app.use((await CreateApp(options).buildApp({ app, ...buildOptions })).router);

  const port = await getPort();

  await new Promise<void>(resolve => {
    const server = app.listen(port, resolve);

    TearDownPromises.push(new PLazy(resolve => server.close(resolve)));
  });

  const pool = getRequestPool(port);

  return {
    ...pool,
    tmpPath,
    tmpSchemaPath,
    codegenPromise,
    GraphQLWSWebsocketsClient: createGraphQLWSWebsocketsClient(pool.address, websocketPath, graphqlWsClientOptions),
    SubscriptionsTransportWebsocketsClient: createSubscriptionsTransportWebsocketsClient(
      pool.address,
      websocketPath,
      subscriptionsTransportClientOptions
    ),
  };
}

export async function startFastifyServer({
  options = {},
  buildOptions,
  testCodegenOptions,
  graphqlWsClientOptions,
  websocketPath,
  subscriptionsTransportClientOptions,
}: StartTestServerOptions<import('../src/fastify').EnvelopAppOptions, import('../src/fastify').BuildAppOptions>) {
  const app = (await import('fastify')).default();

  const { CreateApp } = await import('../src/fastify');

  const { tmpPath, tmpSchemaPath, codegenPromise } = await Codegen(options, testCodegenOptions);

  const envelop = CreateApp(options).buildApp(buildOptions);
  await app.register(envelop.plugin);

  const port = await getPort();

  await new Promise((resolve, reject) => {
    app.listen(port).then(resolve, reject);

    TearDownPromises.push(new PLazy<void>(resolve => app.close(resolve)));
  });

  const pool = getRequestPool(port);

  return {
    ...pool,
    envelop,
    tmpPath,
    tmpSchemaPath,
    codegenPromise,
    app,
    GraphQLWSWebsocketsClient: createGraphQLWSWebsocketsClient(pool.address, websocketPath, graphqlWsClientOptions),
    SubscriptionsTransportWebsocketsClient: createSubscriptionsTransportWebsocketsClient(
      pool.address,
      websocketPath,
      subscriptionsTransportClientOptions
    ),
  };
}

export async function startHTTPServer({
  options = {},
  buildOptions,
  testCodegenOptions,
}: StartTestServerOptions<import('../src/http').EnvelopAppOptions, import('../src/http').BuildAppOptions>) {
  const { CreateApp } = await import('../src/http');

  const { tmpPath, tmpSchemaPath, codegenPromise } = await Codegen(options, testCodegenOptions);

  const envelop = CreateApp(options).buildApp(buildOptions);

  const server = (await import('http')).createServer((req, res) => {
    envelop.requestHandler(req, res);
  });

  const port = await getPort();

  await new Promise<void>(resolve => {
    server.listen(port, () => {
      resolve();
    });

    TearDownPromises.push(
      new PLazy<void>((resolve, reject) =>
        server.close(err => {
          if (err) return reject(err);
          resolve();
        })
      )
    );
  });

  return { ...getRequestPool(port), envelop, tmpPath, tmpSchemaPath, codegenPromise };
}

export async function startHapiServer({
  options = {},
  buildOptions,
  testCodegenOptions,
}: StartTestServerOptions<import('../src/hapi').EnvelopAppOptions, import('../src/hapi').BuildAppOptions>) {
  const { CreateApp } = await import('../src/hapi');

  const port = await getPort();

  const server = (await import('@hapi/hapi')).server({
    port,
    host: 'localhost',
  });

  const { tmpPath, tmpSchemaPath, codegenPromise } = await Codegen(options, testCodegenOptions);

  const envelop = CreateApp(options).buildApp(buildOptions);

  await server.register(envelop.plugin);

  await server.start();

  TearDownPromises.push(
    LazyPromise(async () => {
      await server.stop();
    })
  );

  const pool = getRequestPool(port);

  return {
    ...pool,
    envelop,
    tmpPath,
    tmpSchemaPath,
    codegenPromise,
  };
}

export async function startKoaServer({
  options = {},
  buildOptions = {},
  testCodegenOptions,
}: StartTestServerOptions<import('../src/koa').EnvelopAppOptions, import('../src/koa').BuildAppOptions>) {
  const Koa = (await import('koa')).default;
  const KoaRouter = (await import('@koa/router')).default;

  const app = new Koa();

  const router = new KoaRouter();

  const { CreateApp } = await import('../src/koa');

  const { tmpPath, tmpSchemaPath, codegenPromise } = await Codegen(options, testCodegenOptions);

  await CreateApp(options).buildApp({ router, ...buildOptions });

  app.use(router.routes()).use(router.allowedMethods());

  const port = await getPort();

  await new Promise<void>(resolve => {
    const server = app.listen(port, resolve);

    TearDownPromises.push(new PLazy(resolve => server.close(resolve)));
  });

  return { ...getRequestPool(port), tmpPath, tmpSchemaPath, codegenPromise };
}

export async function startNextJSServer() {
  const app = (await import('fastify')).default({
    pluginTimeout: 20000,
  });

  app.addContentTypeParser('application/json', (_req, body, done) => {
    done(null, body);
  });

  const FastifyNext = (await import('fastify-nextjs')).default;

  const NextJSDir = resolve(__dirname, './nextjs');

  app
    .register(FastifyNext, {
      dir: NextJSDir,
      dev: false,
      logLevel: 'warn',
    })
    .after(async () => {
      if (!app.next) return;
      app.next('*', { method: 'POST', schema: {} });
    });

  const port = await getPort();

  await new Promise((resolve, reject) => {
    app.listen(port).then(resolve, reject);

    TearDownPromises.push(new PLazy<void>(resolve => app.close(resolve)));
  });

  const pool = getRequestPool(port, '/api/graphql');

  return { ...pool, NextJSDir };
}

function getRequestPool(port: number, path = '/graphql') {
  const address = `http://127.0.0.1:${port}`;
  const requestPool = new Pool(address, {
    connections: 5,
  });

  TearDownPromises.push(LazyPromise(async () => requestPool.close()));

  return {
    address,
    async request(options: RequestOptions) {
      const { body } = await requestPool.request(options);

      return getStringFromStream(body);
    },

    async requestRaw(options: RequestOptions) {
      const { body, ...rest } = await requestPool.request(options);

      return { body: getStringFromStream(body), ...rest };
    },
    async query<TData, TVariables>(
      document: TypedDocumentNode<TData, TVariables> | string,
      variables?: TVariables
    ): Promise<ExecutionResult<TData>> {
      const { body, headers } = await requestPool.request({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: Readable.from(JSON.stringify({ query: typeof document === 'string' ? document : print(document), variables }), {
          objectMode: false,
        }),
        path,
      });

      if (!headers['content-type']?.startsWith('application/json')) {
        console.error({
          body: await getStringFromStream(body),
          headers,
        });
        throw Error('Unexpected content type received: ' + headers['content-type']);
      }

      return getJSONFromStream(body);
    },
  };
}

function getStringFromStream(stream: import('stream').Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    stream.on('data', chunk => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      try {
        resolve(Buffer.concat(chunks).toString('utf-8'));
      } catch (err) {
        reject(err);
      }
    });
  });
}

function getJSONFromStream<T>(stream: import('stream').Readable): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    stream.on('data', chunk => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
      } catch (err) {
        reject(err);
      }
    });
  });
}

export function createUploadFileBody(content: string) {
  const body = new FormData();

  const uploadFilename = 'a.png';

  const query = print(UploadFileDocument);
  const operations = {
    query,
    variables: { file: null },
  };

  body.append('operations', JSON.stringify(operations));
  body.append('map', JSON.stringify({ '1': ['variables.file'] }));
  body.append('1', content, { filename: uploadFilename });

  return body;
}

export function createGraphQLWSWebsocketsClient(
  httpUrl: string,
  path = '/graphql',
  options: Partial<GraphQLWSClientOptions> = {}
) {
  const url = new URL(httpUrl + path);

  url.protocol = url.protocol.replace('http', 'ws');

  const client = createGraphQLWSClient({
    url: url.href,
    webSocketImpl: ws,
    ...options,
  });

  TearDownPromises.push(
    LazyPromise(async () => {
      try {
        await client.dispose();
      } catch (err) {}
    })
  );

  function subscribe<TResult = unknown>(query: string | TypedDocumentNode<TResult>, onData: (data: TResult) => void) {
    let unsubscribe = () => {};

    const done = new Promise<void>((resolve, reject) => {
      unsubscribe = client.subscribe(
        {
          query: isDocumentNode(query) ? print(query) : query,
        },
        {
          next: onData,
          error: reject,
          complete: resolve,
        }
      );
    });

    return {
      done,
      unsubscribe,
    };
  }

  return { subscribe };
}

export function createSubscriptionsTransportWebsocketsClient(
  httpUrl: string,
  path = '/graphql',
  options: Partial<SubscriptionsTransportClientOptions> = {}
) {
  const url = new URL(httpUrl + path);

  url.protocol = url.protocol.replace('http', 'ws');

  const client = new SubscriptionsTransportClient(
    url.href,
    {
      lazy: true,
      ...options,
    },
    ws
  );

  TearDownPromises.push(
    LazyPromise(async () => {
      client.close();
    })
  );

  function subscribe<TResult = unknown>(query: string | TypedDocumentNode<TResult>, onData: (data: TResult) => void) {
    let unsubscribe = () => {};

    const done = new Promise<void>((resolve, reject) => {
      const { subscribe } = client.request({
        query: isDocumentNode(query) ? print(query) : query,
      });

      const result = subscribe({
        next: onData as any,
        error: reject,
        complete: resolve,
      });
      unsubscribe = result.unsubscribe;
    });

    return {
      done,
      unsubscribe,
    };
  }

  return { subscribe };
}
