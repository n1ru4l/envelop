import { Plugin } from '@envelop/types';
import { createFilterOperationTypeRule, AllowedOperations } from './filter-operation-type-rule';

export const useFilterAllowedOperations = (allowedOperations: AllowedOperations): Plugin => {
  return {
    onValidate: ({ addValidationRule }) => {
      addValidationRule(createFilterOperationTypeRule(allowedOperations));
    },
  };
};

export { createFilterOperationTypeRule };
