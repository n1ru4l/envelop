import { DefaultContext, Maybe, Plugin } from '@envelop/types';

export const useSchema = (schema: any): Plugin => {
  return {
    onPluginInit({ setSchema }) {
      setSchema(schema);
    },
  };
};

export const useLazyLoadedSchema = (schemaLoader: (context: Maybe<DefaultContext>) => any): Plugin => {
  return {
    onEnveloped({ setSchema, context }) {
      setSchema(schemaLoader(context));
    },
  };
};
