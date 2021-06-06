import { createModule, gql, Module } from 'graphql-modules';

import type { resolvers as scalarResolvers } from 'graphql-scalars';
import type { IScalarTypeResolver } from '@graphql-tools/utils';
import type { DocumentNode, GraphQLScalarType } from 'graphql';
import type { WithGraphQLUpload } from './upload';
import type { BaseEnvelopAppOptions } from './app';

export type ScalarsConfig = '*' | { [k in keyof typeof scalarResolvers]?: boolean | 1 | 0 } | Array<keyof typeof scalarResolvers>;

export type ScalarResolvers = Record<string, IScalarTypeResolver>;

export interface WithScalars {
  /**
   * Add scalars
   */
  scalars?: ScalarsConfig;
}

export interface ScalarsModule {
  typeDefs: DocumentNode;
  module: Module;
  resolvers: ScalarResolvers;
}

export async function createScalarsModule(
  scalars: ScalarsConfig | undefined,
  { GraphQLUpload }: BaseEnvelopAppOptions<never> & WithGraphQLUpload
): Promise<ScalarsModule | null> {
  if (!scalars) return getScalarsModule();

  const { typeDefs: scalarTypeDefs, resolvers: scalarResolvers } = await import('graphql-scalars');

  if (scalars === '*') return getScalarsModule(scalarTypeDefs, scalarResolvers);

  if (Array.isArray(scalars)) {
    const scalarsNames = scalars.reduce((acum, scalarName) => {
      if (scalarName in scalarResolvers) acum.push(`scalar ${scalarName}`);
      return acum;
    }, [] as string[]);

    if (!scalarsNames.length) return getScalarsModule();

    const resolvers = scalars.reduce((acum, scalarName) => {
      const resolver = (scalarResolvers as ScalarResolvers)[scalarName];

      if (resolver) acum[scalarName] = resolver;
      return acum;
    }, {} as ScalarResolvers);

    return getScalarsModule(scalarsNames, resolvers);
  }

  const scalarsNames = Object.entries(scalars).reduce((acum, [scalarName, value]) => {
    if (value && scalarName in scalarResolvers) acum.push(`scalar ${scalarName}`);
    return acum;
  }, [] as string[]);

  if (!scalarsNames.length) return getScalarsModule();

  const resolvers = Object.keys(scalars).reduce((acum, scalarName) => {
    const resolver = (scalarResolvers as ScalarResolvers)[scalarName];

    if (resolver) acum[scalarName] = resolver;
    return acum;
  }, {} as ScalarResolvers);

  return getScalarsModule(scalarsNames, resolvers);

  async function getScalarsModule(scalarsNames?: string[], resolvers?: ScalarResolvers): Promise<ScalarsModule | null> {
    const UploadScalarResolver: GraphQLScalarType | null = GraphQLUpload
      ? (await import('graphql-upload/public/GraphQLUpload.js')).default
      : null;

    if (UploadScalarResolver) {
      (scalarsNames ||= []).push('scalar Upload');

      (resolvers ||= {}).Upload = UploadScalarResolver;
    }

    if (scalarsNames && resolvers) {
      const typeDefs = gql(scalarsNames.join('\n'));

      return {
        typeDefs,
        resolvers,
        module: createModule({
          id: 'scalars',
          typeDefs,
          resolvers,
        }),
      };
    }

    return null;
  }
}
