import { NoSchemaIntrospectionCustomRule } from 'graphql';
import { Plugin } from '@envelop/types';

export const useDisableIntrospection = (): Plugin => {
  return {
    onValidate: ({ addValidationRule }) => {
      addValidationRule(NoSchemaIntrospectionCustomRule);
    },
  };
};
