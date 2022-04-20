import { GraphQLSchema } from 'graphql';
import { DefaultContext, Maybe, Plugin, PromiseOrValue } from '@envelop/types';
import { isPromise } from '../utils';

export const useSchema = (schema: GraphQLSchema): Plugin => {
  return {
    onPluginInit({ setSchema }) {
      setSchema(schema);
    },
  };
};

export const useLazyLoadedSchema = (schemaLoader: (context: Maybe<DefaultContext>) => PromiseOrValue<GraphQLSchema>): Plugin => {
  let schemaSet$: PromiseOrValue<void>;
  return {
    onEnveloped({ setSchema, context }) {
      const schema$ = schemaLoader(context);
      if (isPromise(schema$)) {
        schemaSet$ = schema$.then(schemaObj => {
          setSchema(schemaObj);
        });
      } else {
        setSchema(schema$);
      }
    },
    onExecute() {
      if (schemaSet$) {
        return schemaSet$;
      }
      return undefined;
    },
  };
};

export const useAsyncSchema = (schema$: PromiseOrValue<GraphQLSchema>): Plugin => {
  let schemaSet$: PromiseOrValue<void>;
  return {
    onPluginInit({ setSchema }) {
      if (isPromise(schema$)) {
        schemaSet$ = schema$.then(schemaObj => {
          setSchema(schemaObj);
        });
      } else {
        setSchema(schema$);
      }
    },
    onContextBuilding() {
      return () => {
        if (schemaSet$) {
          return schemaSet$;
        }
        return undefined;
      };
    },
  };
};
