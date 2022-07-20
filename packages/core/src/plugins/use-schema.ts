import { GraphQLSchema } from '@envelop/graphql';
import { DefaultContext, Maybe, Plugin } from '@envelop/types';

export const useSchema = (schema: GraphQLSchema): Plugin => {
  return {
    onPluginInit({ setSchema }) {
      setSchema(schema);
    },
  };
};

export const useLazyLoadedSchema = (schemaLoader: (context: Maybe<DefaultContext>) => GraphQLSchema): Plugin => {
  return {
    onEnveloped({ setSchema, context }) {
      setSchema(schemaLoader(context));
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
