import type { Plugin } from '@envelop/types';
import { Kind, OperationDefinitionNode } from 'graphql';

const fastIntroSpectionSymbol = Symbol('fastIntrospection');

/**
 * In case a GraphQL operation only contains introspection fields the context building can be skipped completely.
 * With this plugin any further context extensions will be skipped.
 */
export const useImmediateIntrospection = (): Plugin<{
  [fastIntroSpectionSymbol]?: boolean;
}> => {
  return {
    onValidate({ setValidationFn, validateFn }) {
      let isIntrospectionOnly = false;
      setValidationFn((schema, node, ...args) => {
        const operations = node.definitions.filter((n): n is OperationDefinitionNode => n.kind === Kind.OPERATION_DEFINITION);

        if (operations.some(operation => operation.operation !== 'query')) {
          return validateFn(schema, node, ...args);
        }

        const query = operations[0];
        const selections = query.selectionSet.selections.map(node => (node.kind === Kind.FIELD ? node.name.value : 'fragment'));
        if (selections.every(node => node.startsWith('__'))) {
          isIntrospectionOnly = true;
        }
        return validateFn(schema, node, ...args);
      });

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
