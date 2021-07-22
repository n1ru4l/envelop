import { GraphQLSchema } from 'graphql';
import { DefaultContext, Maybe, Plugin } from '@envelop/types';

export const useSchema = (schema: GraphQLSchema | ((context: Maybe<DefaultContext>) => GraphQLSchema)): Plugin => {
  return {
    onEnveloped({ setSchema, context }) {
      setSchema(schema instanceof GraphQLSchema ? schema : schema(context));
    },
  };
};

export const useAsyncSchema = (schemaPromise: Promise<GraphQLSchema>): Plugin => {
  return {
    onPluginInit({ setSchema }) {
      schemaPromise.then(schemaObj => {
        setSchema(schemaObj);
      });
    },
  };
};
