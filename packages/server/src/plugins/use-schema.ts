import { GraphQLSchema } from 'graphql';
import { PluginFn } from '../types';

export const useSchema = (schema: GraphQLSchema): PluginFn => api => {
  api.on('onInit', support => {
    support.replaceSchema(schema);
  });
};
