import type { GraphQLSchema } from 'graphql';
import type { Plugin } from '@envelop/core';
import { pruneSchema, PruneSchemaOptions } from '@graphql-tools/utils';

export function usePrunedSchema(options: PruneSchemaOptions): Plugin {
  const prunedSchemas = new WeakSet<GraphQLSchema>();

  return {
    onSchemaChange({ schema, replaceSchema }) {
      if (prunedSchemas.has(schema)) {
        return;
      }

      const prunedSchema = pruneSchema(schema, options);
      prunedSchemas.add(prunedSchema);
      prunedSchema.extensions = {
        ...prunedSchema.extensions,
        ...schema.extensions,
      };

      replaceSchema(prunedSchema);
    },
  };
}
