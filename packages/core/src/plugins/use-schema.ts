import { GraphQLSchema } from 'graphql';
import { Plugin } from '@envelop/types';

export const useSchema = (schema: GraphQLSchema): Plugin => {
  return {
    onPluginInit({ setSchema }) {
      setSchema(schema);
    },
  };
};
