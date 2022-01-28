import type { Plugin } from '@envelop/types';
import { ValidationRule } from 'graphql';

const IsIntrospectionOnlyOperation =
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

export const useFastIntrospection = (): Plugin => {
  return {
    onValidate({ addValidationRule }) {
      let isIntrospectionOnly = true;
      addValidationRule(
        IsIntrospectionOnlyOperation(() => {
          isIntrospectionOnly = false;
        })
      );

      return function afterValidate({ extendContext }) {
        if (isIntrospectionOnly) {
          extendContext({ [fastIntroSpectionSymbol]: true });
        }
      };
    },
    onContextBuilding({ context, shortCircuitContext }) {
      if (context[fastIntroSpectionSymbol]) {
        // hijack and skip all other context related stuff.
        // We dont need a context!

        shortCircuitContext(
          new Proxy(context, {
            get(target, key) {
              if (key in target) {
                return target[key];
              }
              throw new Error(`Cannot access '${String(key)}'`);
            },
            set() {
              throw new Error('Forbidden.');
            },
          })
        );
      }
    },
  };
};
