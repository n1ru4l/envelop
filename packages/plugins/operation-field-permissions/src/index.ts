import {
  FieldNode,
  getNamedType,
  GraphQLError,
  GraphQLObjectType,
  isInterfaceType,
  isIntrospectionType,
  isObjectType,
  isUnionType,
} from 'graphql';
import { Plugin } from '@envelop/core';
import { ExtendedValidationRule, useExtendedValidation } from '@envelop/extended-validation';

type PromiseOrValue<T> = T | Promise<T>;

/**
 * Returns a set of type names that allow access to all fields in the type.
 */
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

const toSet = (input: string | Set<string>) =>
  typeof input === 'string' ? new Set([input]) : input;

type ScopeContext = {
  allowAll: boolean;
  wildcardTypes: Set<string>;
  schemaCoordinates: Set<string>;
};

const scopeContextMap = new WeakMap<any, ScopeContext>();

const getContext = (input: unknown): ScopeContext => {
  if (typeof input !== 'object' || !input) {
    throw new Error('OperationScopeRule was used without context.');
  }
  const scopeContext = scopeContextMap.get(input);
  if (!scopeContext) {
    throw new Error('OperationScopeRule was used without context.');
  }
  return scopeContext;
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
        // We should use GraphQLError once the object constructor lands in stable GraphQL.js
        // and useMaskedErrors supports it.
        const error = new GraphQLError(options.formatError(schemaCoordinate));
        (error as any).nodes = [node];
        context.reportError(error);
      }
    };

    return {
      Field(node) {
        const type = context.getType();
        if (type) {
          const namedType = getNamedType(type);
          if (isIntrospectionType(namedType)) {
            return false;
          }
        }

        const parentType = context.getParentType();
        if (parentType) {
          if (isIntrospectionType(parentType)) {
            return false;
          }

          // We handle objects, interface and union permissions differently.
          // When accessing an an object field, we check simply run the check.
          if (isObjectType(parentType)) {
            handleField(node, parentType);
          }

          // To allow a union case, every type in the union has to be allowed/
          // If one of the types doesn't permit access we should throw a validation error.
          if (isUnionType(parentType)) {
            for (const objectType of parentType.getTypes()) {
              handleField(node, objectType);
            }
          }

          // Same goes for interfaces. Every implementation should allow the access of the given
          // field to pass the validation rule.
          if (isInterfaceType(parentType)) {
            for (const objectType of executionArgs.schema.getImplementations(parentType).objects) {
              handleField(node, objectType);
            }
          }
        }

        return undefined;
      },
    };
  };

type OperationScopeOptions<TContext> = {
  getPermissions: (context: TContext) => PromiseOrValue<Set<string> | string>;
  formatError?: OperationScopeRuleOptions['formatError'];
};

const defaultFormatError = (schemaCoordinate: string) =>
  `Insufficient permissions for selecting '${schemaCoordinate}'.`;

export const useOperationFieldPermissions = <TContext extends Record<string, any>>(
  opts: OperationScopeOptions<TContext>,
): Plugin<TContext> => {
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useExtendedValidation({
          rules: [
            OperationScopeRule({
              formatError: opts.formatError ?? defaultFormatError,
            }),
          ],
        }),
      );
    },
    async onContextBuilding({ context }) {
      const permissions = await opts.getPermissions(context as TContext);

      // Schema coordinates is a set of type-name field-name strings that
      // describe the position of a field in the schema.
      const schemaCoordinates = toSet(permissions);
      const wildcardTypes = getWildcardTypes(schemaCoordinates);

      const scopeContext: ScopeContext = {
        schemaCoordinates,
        wildcardTypes,
        allowAll: schemaCoordinates.has('*'),
      };

      scopeContextMap.set(context, scopeContext);
    },
  };
};
