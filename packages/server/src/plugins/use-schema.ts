import { GraphQLSchema } from 'graphql';
import { PluginFn } from '@guildql/types';

export const useSchema = (schema: GraphQLSchema): PluginFn => api => {
  api.on('onInit', support => {
    support.replaceSchema(schema);
  });
};
