import { Plugin, useExtendContext } from '@envelop/core';
import { ExtendedValidationRule, useExtendedValidation } from '@envelop/extended-validation';
import {
  GraphQLType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLError,
  isUnionType,
  FieldNode,
  GraphQLObjectType,
  isObjectType,
  isInterfaceType,
} from 'graphql';

type PromiseOrValue<T> = T | Promise<T>;

const getWrappedType = (graphqlType: GraphQLType): Exclude<GraphQLType, GraphQLList<any> | GraphQLNonNull<any>> => {
  if (graphqlType instanceof GraphQLList || graphqlType instanceof GraphQLNonNull) {
    return getWrappedType(graphqlType.ofType);
  }
  return graphqlType;
};

const OPERATION_PERMISSIONS_SYMBOL = Symbol('OPERATION_PERMISSIONS_SYMBOL');

const getWildcardTypes = (scope: Set<string>): Set<string> => {
  const wildcardTypes = new Set<string>();
  for (const item of scope) {
    if (item.endsWith('*')) {
      const [typeName] = item.split('.');
      wildcardTypes.add(typeName);
    }
  }
  return wildcardTypes;
};

const toSet = (input: string | Set<string>) => (typeof input === 'string' ? new Set([input]) : input);

type ScopeContext = {
  allowAll: boolean;
  wildcardTypes: Set<string>;
  schemaCoordinates: Set<string>;
};

const getContext = (input: unknown): ScopeContext => {
  if (typeof input !== 'object' || !input || !(OPERATION_PERMISSIONS_SYMBOL in input)) {
    throw new Error('OperationScopeRule was used without context.');
  }
  return input[OPERATION_PERMISSIONS_SYMBOL];
};

type OperationScopeRuleOptions = {
  formatError: (schemaCoordinate: string) => string;
};

/**
 * Validate whether a user is allowed to execute a certain GraphQL operation.
 */
const OperationScopeRule =
  (options: OperationScopeRuleOptions): ExtendedValidationRule =>
  (context, executionArgs) => {
    const permissionContext = getContext(executionArgs.contextValue);

    const handleField = (node: FieldNode, objectType: GraphQLObjectType) => {
      const schemaCoordinate = `${objectType.name}.${node.name.value}`;

      if (
        !permissionContext.allowAll &&
        !permissionContext.wildcardTypes.has(objectType.name) &&
        !permissionContext.schemaCoordinates.has(schemaCoordinate)
      ) {
        context.reportError(new GraphQLError(options.formatError(schemaCoordinate), [node]));
      }
    };

    return {
      Field(node) {
        const parentType = context.getParentType();
        if (parentType) {
          const wrappedType = getWrappedType(parentType);

          if (isObjectType(wrappedType)) {
            handleField(node, wrappedType);
          } else if (isUnionType(wrappedType)) {
            for (const objectType of wrappedType.getTypes()) {
              handleField(node, objectType);
            }
          } else if (isInterfaceType(wrappedType)) {
            for (const objectType of executionArgs.schema.getImplementations(wrappedType).objects) {
              handleField(node, objectType);
            }
          }
        }
      },
    };
  };

type OperationScopeOptions<TContext> = {
  getPermissions: (context: TContext) => PromiseOrValue<Set<string> | string>;
  formatError?: OperationScopeRuleOptions['formatError'];
};

const defaultFormatError = (schemaCoordinate: string) => `Insufficient permissions for selecting '${schemaCoordinate}'.`;

export const useOperationFieldPermissions = <TContext>(opts: OperationScopeOptions<TContext>): Plugin => {
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useExtendedValidation({
          rules: [
            OperationScopeRule({
              formatError: opts.formatError ?? defaultFormatError,
            }),
          ],
        })
      );

      addPlugin(
        useExtendContext(async context => {
          const permissions = await opts.getPermissions(context as TContext);

          const schemaCoordinates = toSet(permissions);
          const wildcardTypes = getWildcardTypes(schemaCoordinates);

          const scopeContext: ScopeContext = {
            schemaCoordinates,
            wildcardTypes,
            allowAll: schemaCoordinates.has('*'),
          };

          return {
            [OPERATION_PERMISSIONS_SYMBOL]: scopeContext,
          };
        })
      );
    },
  };
};
