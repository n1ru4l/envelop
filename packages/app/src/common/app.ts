import { Application, createApplication, gql, Module } from 'graphql-modules';

import { Envelop, envelop, Plugin } from '@envelop/core';
import { useGraphQLModules } from '@envelop/graphql-modules';

import { handleCache, WithCache } from './cache';
import { RegisterDataLoader, RegisterDataLoaderFactory } from './dataloader';
import { RegisterModule, RegisterModuleFactory, WithGraphQLModules } from './modules';
import { createScalarsModule, ScalarsModule, WithScalars } from './scalars';
import { SchemaBuilderFactory, WithSchemaBuilding } from './schema';
import { uniqueArray } from './utils/object';

import type { handleRequest } from './request';

export type AdapterFactory<T> = (envelop: Envelop<unknown>, modulesApplication: Application) => T;

export interface BaseEnvelopBuilder {
  /**
   * Create and/or Register a GraphQL Module
   */
  registerModule: RegisterModule;

  /**
   * Create and Register a DataLoader
   */
  registerDataLoader: RegisterDataLoader;

  /**
   * GraphQL Tag Parser
   */
  gql: typeof gql;

  /**
   * List of current GraphQL Modules
   *
   * > _You can safely mutate this list_
   */
  modules: Module[];

  /**
   * List of current Envelop Plugins
   *
   * > _You can safely mutate this list_
   */
  plugins: Plugin[];

  /**
   * Created scalars module, you might only use this for testing purposes
   */
  scalarsModulePromise: Promise<ScalarsModule | null>;
}

export interface InternalAppBuildOptions<T> {
  prepare?: (appBuilder: BaseEnvelopBuilder) => void | Promise<void>;
  adapterFactory: AdapterFactory<T>;
}

export interface BuiltApp<T> {
  app: T;
  getEnveloped: Envelop<unknown>;
}

export interface EnvelopAppFactoryType extends BaseEnvelopBuilder {
  appBuilder<T>(opts: InternalAppBuildOptions<T>): Promise<BuiltApp<T>>;
}

export interface BaseEnvelopAppOptions<TContext>
  extends WithGraphQLModules,
    WithSchemaBuilding<TContext>,
    WithScalars,
    WithCache {
  /**
   * Custom Envelop Plugins
   */
  plugins?: Plugin[];

  /**
   * **Advanced usage only**
   *
   * Override `handleRequest` logic
   */
  customHandleRequest?: typeof handleRequest;

  /**
   * Allow batched queries
   *
   * > Specify a number to set the maximum (inclusive) amount of batched queries allowed
   *
   * @default false
   */
  allowBatchedQueries?: boolean | number;
}

export function createEnvelopAppFactory<TContext>(
  config: BaseEnvelopAppOptions<TContext>,
  {
    preBuild,
    afterBuilt,
  }: {
    preBuild?: (plugins: Plugin[]) => void | Promise<void>;
    afterBuilt?: (getEnveloped: Envelop<unknown>) => void | Promise<void>;
  } = {}
): EnvelopAppFactoryType {
  const { mergeSchemasConfig, plugins, modules, scalars } = config;
  const factoryModules = uniqueArray(modules);
  const factoryPlugins = uniqueArray(plugins);

  const { registerModuleState, registerModule } = RegisterModuleFactory(factoryModules);

  const registerDataLoader = RegisterDataLoaderFactory(factoryPlugins);

  const scalarsModulePromise = createScalarsModule(scalars, config);

  const prepareSchema = SchemaBuilderFactory({
    scalarsModulePromise,
    mergeSchemasConfig,
  });

  async function appBuilder<T>({
    adapterFactory,
    prepare,
  }: {
    prepare?: (appBuilder: BaseEnvelopBuilder) => Promise<void> | void;
    adapterFactory: AdapterFactory<T>;
  }): Promise<BuiltApp<T>> {
    try {
      if (prepare) await prepare(baseAppBuilder);

      return getApp();
    } finally {
      factoryModules.length = 0;
      factoryPlugins.length = 0;
      if (config.modules) factoryModules.push(...config.modules);
      if (config.plugins) factoryPlugins.push(...config.plugins);
      registerModuleState.acumId = 0;
    }

    async function getApp() {
      const appModules = uniqueArray(factoryModules);
      const appPlugins = uniqueArray(factoryPlugins);

      const scalarsModule = await scalarsModulePromise;

      if (scalarsModule?.module && appModules.length) appModules.push(scalarsModule.module);

      const modulesApplication = createApplication({
        ...config.GraphQLModules,
        modules: uniqueArray(appModules),
      });

      if (appModules.length) appPlugins.push(useGraphQLModules(modulesApplication));

      const cachePromise = handleCache(config, appPlugins);

      const schemaPromise = config.schema
        ? prepareSchema({
            appModules,
            appPlugins,
            schema: config.schema,
            modulesApplication,
          })
        : null;

      await Promise.all([schemaPromise, cachePromise]);

      if (preBuild) await preBuild(appPlugins);

      const getEnveloped = envelop({
        plugins: uniqueArray(appPlugins),
      });

      if (afterBuilt) await afterBuilt(getEnveloped);

      return {
        app: adapterFactory(getEnveloped, modulesApplication),
        getEnveloped,
      };
    }
  }

  const baseAppBuilder: BaseEnvelopBuilder = {
    registerModule,
    registerDataLoader,
    gql,
    modules: factoryModules,
    plugins: factoryPlugins,
    scalarsModulePromise,
  };

  return { ...baseAppBuilder, appBuilder };
}

export * from './request';

export { gql } from 'graphql-modules';
