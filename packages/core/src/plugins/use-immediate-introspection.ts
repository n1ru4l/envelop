import type { Plugin } from '@envelop/types';
import type { ValidationRule } from 'graphql';

const OnNonIntrospectionFieldReachedValidationRule =
  (onNonIntrospectionField: () => void): ValidationRule =>
  () => {
    return {
      Field(field) {
        if (!field.name.value.startsWith('__')) {
          onNonIntrospectionField();
        }
      },
    };
  };

const fastIntroSpectionSymbol = Symbol('fastIntrospection');

/**
 * In case a GraphQL operation only contains introspection fields the context building can be skipped completely.
 * With this plugin any further context extensions will be skipped.
 */
export const useImmediateIntrospection = (): Plugin => {
  return {
    onValidate({ addValidationRule }) {
      let isIntrospectionOnly = true;
      addValidationRule(
        OnNonIntrospectionFieldReachedValidationRule(() => {
          isIntrospectionOnly = false;
        })
      );

      return function afterValidate({ extendContext }) {
        if (isIntrospectionOnly) {
          extendContext({ [fastIntroSpectionSymbol]: true });
        }
      };
    },
    onContextBuilding({ context, breakContextBuilding }) {
      if (context[fastIntroSpectionSymbol]) {
        // hijack and skip all other context related stuff.
        // We dont need a context!
        breakContextBuilding();
      }
    },
  };
};
