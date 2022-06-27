import { Plugin } from '@envelop/core';
import { createFilterOperationTypeRule, AllowedOperations } from './filter-operation-type-rule.js';

export { AllowedOperations };

export const useFilterAllowedOperations = (allowedOperations: AllowedOperations): Plugin => {
  return {
    onValidate: ({ addValidationRule }) => {
      addValidationRule(createFilterOperationTypeRule(allowedOperations));
    },
  };
};

export { createFilterOperationTypeRule };
