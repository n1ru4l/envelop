import { GraphQLSchema, isSchema } from 'graphql';

import { useSchema } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';

import { cleanObject, toPlural } from './utils/object';
import { LazyPromise } from './utils/promise';

import type { IExecutableSchemaDefinition } from '@graphql-tools/schema';
import type { MergeSchemasConfig } from '@graphql-tools/merge';
import type { Plugin } from '@envelop/types';
import type { Application, Module } from 'graphql-modules';
import type { ScalarsModule } from './scalars';
import type { EnvelopContext, EnvelopResolvers } from './types';

export type FilteredMergeSchemasConfig = Omit<MergeSchemasConfig, 'schemas'>;

export interface EnvelopExecutableSchemaDefinition<TContext = EnvelopContext>
  extends Omit<IExecutableSchemaDefinition<TContext>, 'resolvers'> {
  resolvers?: EnvelopResolvers | EnvelopResolvers[];
}

export type EnvelopSchemaDefinition<TContext = EnvelopContext> =
  | GraphQLSchema
  | Promise<GraphQLSchema>
  | EnvelopExecutableSchemaDefinition<TContext>
  | Promise<EnvelopExecutableSchemaDefinition<TContext>>;

export interface SchemaBuilderFactoryOptions {
  scalarsModulePromise?: Promise<ScalarsModule | null>;
  mergeSchemasConfig?: FilteredMergeSchemasConfig;
}

export interface PrepareSchemaOptions {
  schema: EnvelopSchemaDefinition<never> | EnvelopSchemaDefinition<never>[];
  appPlugins: Plugin[];
  appModules: Module[];
  modulesApplication?: Application;
}

export interface WithSchemaBuilding<TContext> {
  /**
   * Pre-built schemas
   */
  schema?: EnvelopSchemaDefinition<TContext> | EnvelopSchemaDefinition<TContext>[];

  /**
   * Configure configuration of schema merging
   */
  mergeSchemasConfig?: FilteredMergeSchemasConfig;
}

const Merge = LazyPromise(() => {
  return import('@graphql-tools/merge');
});

export function SchemaBuilderFactory({
  scalarsModulePromise,
  mergeSchemasConfig,
}: SchemaBuilderFactoryOptions): (options: PrepareSchemaOptions) => Promise<void> {
  return async function PrepareSchema({ schema, appModules, modulesApplication, appPlugins }: PrepareSchemaOptions) {
    const scalarsModule = await scalarsModulePromise;

    const scalarsModuleSchema =
      scalarsModule &&
      LazyPromise(() => {
        return makeExecutableSchema({
          typeDefs: scalarsModule.typeDefs,
          resolvers: scalarsModule.resolvers,
        });
      });

    const schemas = await Promise.all(
      toPlural(schema).map(async schemaValuePromise => {
        const schemaValue = await schemaValuePromise;
        if (isSchema(schemaValue)) {
          if (!scalarsModuleSchema) return schemaValue;

          return (await Merge).mergeSchemasAsync({
            ...cleanObject(mergeSchemasConfig),
            schemas: [await scalarsModuleSchema, schemaValue],
          });
        }

        return makeExecutableSchema({
          ...schemaValue,
          typeDefs: scalarsModule ? [...toPlural(schemaValue.typeDefs), scalarsModule.typeDefs] : schemaValue.typeDefs,
          resolvers: scalarsModule ? [...toPlural(schemaValue.resolvers || []), scalarsModule.resolvers] : schemaValue.resolvers,
        });
      })
    );

    let mergedSchema: GraphQLSchema;

    const modulesSchemaList = appModules.length && modulesApplication ? [modulesApplication.schema] : [];

    if (schemas.length > 1) {
      mergedSchema = await (
        await Merge
      ).mergeSchemasAsync({
        ...cleanObject(mergeSchemasConfig),
        schemas: [...modulesSchemaList, ...schemas],
      });
    } else if (schemas[0]) {
      mergedSchema = modulesSchemaList[0]
        ? await (
            await Merge
          ).mergeSchemasAsync({
            ...cleanObject(mergeSchemasConfig),
            schemas: [...modulesSchemaList, schemas[0]],
          })
        : schemas[0];
    } else {
      throw Error('No GraphQL Schema specified!');
    }

    appPlugins.push(useSchema(mergedSchema));
  };
}
