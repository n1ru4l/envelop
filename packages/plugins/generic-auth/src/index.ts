import {
  ASTNode,
  ExecutionArgs,
  FieldNode,
  getNamedType,
  GraphQLError,
  GraphQLField,
  GraphQLInterfaceType,
  GraphQLObjectType,
  isInterfaceType,
  isIntrospectionType,
  isObjectType,
  isUnionType,
  OperationDefinitionNode,
} from 'graphql';
import { DefaultContext, Maybe, Plugin, PromiseOrValue } from '@envelop/core';
import { useExtendedValidation } from '@envelop/extended-validation';
import {
  createGraphQLError,
  getDirectiveExtensions,
  shouldIncludeNode,
} from '@graphql-tools/utils';

export type ResolveUserFn<UserType, ContextType = DefaultContext> = (
  context: ContextType,
) => PromiseOrValue<Maybe<UserType>>;

export type ValidateUserFnParams<UserType> = {
  /** The user object. */
  user: UserType;
  /** The field node from the operation that is being validated. */
  fieldNode: FieldNode;
  /** The parent type which has the field that is being validated. */
  parentType: GraphQLObjectType | GraphQLInterfaceType;
  /** The auth directive arguments for the type */
  typeAuthArgs?: Record<string, any>;
  /** The directives for the type */
  typeDirectives?: ReturnType<typeof getDirectiveExtensions>;
  /** Scopes that type requires */
  typeScopes?: string[][];
  /** Policies that type requires */
  typePolicies?: string[][];
  /** The object field */
  field: GraphQLField<any, any>;
  /** The auth directive arguments for the field */
  fieldAuthArgs?: Record<string, any>;
  /** The directives for the field */
  fieldDirectives?: ReturnType<typeof getDirectiveExtensions>;
  /** Scopes that field requires */
  fieldScopes?: string[][];
  /** Policies that field requires */
  fieldPolicies?: string[][];
  /** Extracted scopes from the user object */
  userScopes: string[];
  /** Policies for the user */
  userPolicies: string[];
  /** The args passed to the execution function (including operation context and variables) **/
  executionArgs: ExecutionArgs;
  /** Resolve path */
  path: ReadonlyArray<string | number>;
};

export type ValidateUserFn<UserType> = (
  params: ValidateUserFnParams<UserType>,
) => void | GraphQLError;

export const DIRECTIVE_SDL = /* GraphQL */ `
  directive @authenticated on FIELD_DEFINITION
`;

export const SKIP_AUTH_DIRECTIVE_SDL = /* GraphQL */ `
  directive @skipAuth on FIELD_DEFINITION
`;

export const REQUIRES_SCOPES_DIRECTIVE_SDL = /* GraphQL */ `
  directive @requiresScopes(scopes: [[String!]!]!) on FIELD_DEFINITION
`;

export const POLICY_DIRECTIVE_SDL = /* GraphQL */ `
  directive @policy(policies: [String!]!) on FIELD_DEFINITION
`;

export type GenericAuthPluginOptions<
  UserType extends {} = {},
  ContextType = DefaultContext,
  CurrentUserKey extends string = 'currentUser',
> = {
  /**
   * Here you can implement any custom sync/async code, and use the context built so far in Envelop and the HTTP request
   * to find the current user.
   * Common practice is to use a JWT token here, validate it, and use the payload as-is, or fetch the user from an external services.
   * Make sure to either return `null` or the user object.
   */
  resolveUserFn: ResolveUserFn<UserType, ContextType>;
  /**
   * Overrides the default field name for injecting the user into the execution `context`.
   * @default currentUser
   */
  contextFieldName?: CurrentUserKey;
  /**
   * Overrides the default directive name for marking a field that requires specific scopes.
   *
   * @default requiresScopes
   */
  scopesDirectiveName?: 'requiresScopes';
  /**
   * Extracts the scopes from the user object.
   *
   * @default defaultExtractScopes
   */
  extractScopes?(user: UserType): string[];
  /**
   * Overrides the default directive name for @policy directive
   *
   * @default policy
   */
  policyDirectiveName?: string;
  /**
   * Extracts the policies for the user object.
   */
  extractPolicies?(user: UserType, context: ContextType): PromiseOrValue<string[]>;
} & (
  | {
      /**
       * This mode offers complete protection for the entire API.
       * It protects your entire GraphQL schema, by validating the user before executing the request.
       * You can skip the validation using `@skipAuth` directive on a specific field.
       */
      mode: 'protect-all';
      /**
       * Overrides the default directive name or extension field for marking a field available for unauthorized users.
       * @default skipAuth
       */
      authDirectiveName?: 'skipAuth' | string;
      /**
       * Customize how the user is validated. E.g. apply authorization role based validation.
       * The validation is applied during the extended validation phase.
       * @default `defaultProtectAllValidateFn`
       */
      validateUser?: ValidateUserFn<UserType>;
    }
  | {
      /**
       * Just resolves the user and inject to authenticated user into the `context`.
       * User validation needs to be implemented by you, in your resolvers.
       */
      mode: 'resolve-only';
    }
  | {
      /**
       * resolves the user and inject to authenticated user into the `context`.
       * And checks for `@auth` directives usages to run validation automatically.
       */
      mode: 'protect-granular';
      /**
       * Overrides the default directive name or extension field for marking a field available only for authorized users.
       * @default authenticated
       */
      authDirectiveName?: 'authenticated' | string;
      /**
       * Customize how the user is validated. E.g. apply authorization role based validation.
       * The validation is applied during the extended validation phase.
       * @default `defaultProtectSingleValidateFn`
       */
      validateUser?: ValidateUserFn<UserType>;
      /**
       * Reject on unauthenticated requests.
       * @default true
       */
      rejectUnauthenticated?: boolean;
    }
);

export function createUnauthenticatedError(params?: {
  fieldNode?: FieldNode;
  path?: ReadonlyArray<string | number>;
  message?: string;
  statusCode?: number;
}) {
  return createGraphQLError(params?.message ?? 'Unauthorized field or type', {
    nodes: params?.fieldNode ? [params.fieldNode] : undefined,
    path: params?.path,
    extensions: {
      code: 'UNAUTHORIZED_FIELD_OR_TYPE',
      http: {
        status: params?.statusCode ?? 401,
      },
    },
  });
}

export function defaultProtectAllValidateFn<UserType>(
  params: ValidateUserFnParams<UserType>,
): void | GraphQLError {
  if (params.user == null && !params.fieldAuthArgs && !params.typeAuthArgs) {
    return createUnauthenticatedError({
      fieldNode: params.fieldNode,
      path: params.path,
    });
  }
  return validateScopes(params);
}

function areRolesValid(requiredRoles: string[][], userRoles: string[]) {
  for (const roles of requiredRoles) {
    if (roles.every(role => userRoles.includes(role))) {
      return true;
    }
  }
  return false;
}

function validateScopes<UserType>(params: ValidateUserFnParams<UserType>): void | GraphQLError {
  if (params.typeScopes && !areRolesValid(params.typeScopes, params.userScopes)) {
    return createUnauthenticatedError({
      fieldNode: params.fieldNode,
      path: params.path,
    });
  }
  if (params.fieldScopes && !areRolesValid(params.fieldScopes, params.userScopes)) {
    return createUnauthenticatedError({
      fieldNode: params.fieldNode,
      path: params.path,
    });
  }
}

function validatePolicies<UserType>(params: ValidateUserFnParams<UserType>): void | GraphQLError {
  if (params.typePolicies && !areRolesValid(params.typePolicies, params.userPolicies)) {
    return createUnauthenticatedError({
      fieldNode: params.fieldNode,
      path: params.path,
    });
  }
  if (params.fieldPolicies && !areRolesValid(params.fieldPolicies, params.userPolicies)) {
    return createUnauthenticatedError({
      fieldNode: params.fieldNode,
      path: params.path,
    });
  }
}
export function defaultProtectSingleValidateFn<UserType>(
  params: ValidateUserFnParams<UserType>,
): void | GraphQLError {
  if (params.user == null && (params.fieldAuthArgs || params.typeAuthArgs)) {
    return createUnauthenticatedError({
      fieldNode: params.fieldNode,
      path: params.path,
    });
  }
  const error = validateScopes(params);
  if (error) {
    return error;
  }
  return validatePolicies(params);
}

export function defaultExtractScopes<UserType>(user: UserType): string[] {
  if (user != null && typeof user === 'object' && 'scope' in user) {
    if (typeof user.scope === 'string') {
      return user.scope.split(' ');
    }
    if (Array.isArray(user.scope)) {
      return user.scope;
    }
  }
  return [];
}

export const useGenericAuth = <
  UserType extends {} = {},
  ContextType extends Record<any, any> = DefaultContext,
  CurrentUserKey extends string = 'currentUser',
>(
  options: GenericAuthPluginOptions<UserType, ContextType, CurrentUserKey>,
): Plugin<
  {
    validateUser: ValidateUserFn<UserType>;
  } & Record<CurrentUserKey, UserType>
> => {
  const contextFieldName = options.contextFieldName || 'currentUser';

  if (options.mode === 'protect-all' || options.mode === 'protect-granular') {
    const authDirectiveName =
      options.authDirectiveName ?? (options.mode === 'protect-all' ? 'skipAuth' : 'authenticated');
    const requiresScopesDirectiveName = options.scopesDirectiveName ?? 'requiresScopes';
    const policyDirectiveName = options.policyDirectiveName ?? 'policy';
    const validateUser =
      options.validateUser ??
      (options.mode === 'protect-all'
        ? defaultProtectAllValidateFn
        : defaultProtectSingleValidateFn);
    const extractScopes = options.extractScopes ?? defaultExtractScopes;

    const rejectUnauthenticated =
      'rejectUnauthenticated' in options ? options.rejectUnauthenticated !== false : true;

    const policiesByContext = new WeakMap<ContextType, string[]>();
    return {
      onPluginInit({ addPlugin }) {
        addPlugin(
          useExtendedValidation({
            rejectOnErrors: rejectUnauthenticated,
            rules: [
              function AuthorizationExtendedValidationRule(context, args) {
                const operations: Record<string, OperationDefinitionNode> = {};
                const fragments: Record<string, any> = {};
                for (const definition of args.document.definitions) {
                  if (definition.kind === 'OperationDefinition') {
                    operations[definition.name?.value ?? args.operationName ?? 'Anonymous'] =
                      definition;
                  } else if (definition.kind === 'FragmentDefinition') {
                    fragments[definition.name.value] = definition;
                  }
                }
                const user = (args.contextValue as any)[contextFieldName];

                const handleField = (
                  {
                    node: fieldNode,
                    path,
                  }: {
                    node: FieldNode;
                    key: string | number | undefined;
                    parent: ASTNode | readonly ASTNode[] | undefined;
                    path: readonly (string | number)[];
                    ancestors: readonly (ASTNode | readonly ASTNode[])[];
                  },
                  parentType: GraphQLInterfaceType | GraphQLObjectType,
                ) => {
                  const field = parentType.getFields()[fieldNode.name.value];
                  if (field == null) {
                    // field is null/undefined if this is an introspection field
                    return;
                  }

                  const schema = context.getSchema();
                  // @ts-expect-error - Fix this
                  const typeDirectives = parentType && getDirectiveExtensions(parentType, schema);
                  const typeAuthArgs = typeDirectives[authDirectiveName]?.[0];
                  const typeScopes = typeDirectives[requiresScopesDirectiveName]?.[0]?.scopes;
                  const typePolicies = typeDirectives[policyDirectiveName]?.[0]?.policies;
                  const fieldDirectives = getDirectiveExtensions(field, schema);
                  const fieldAuthArgs = fieldDirectives[authDirectiveName]?.[0];
                  const fieldScopes = fieldDirectives[requiresScopesDirectiveName]?.[0]?.scopes;
                  const fieldPolicies = fieldDirectives[policyDirectiveName]?.[0]?.policies;
                  const userScopes = extractScopes(user);
                  const policies = policiesByContext.get(context as unknown as ContextType) ?? [];

                  const resolvePath: (string | number)[] = [];

                  let curr: any = args.document;
                  for (const pathItem of path) {
                    curr = curr[pathItem];
                    if (curr?.kind === 'Field') {
                      resolvePath.push(curr.name.value);
                    }
                  }

                  return validateUser({
                    user,
                    fieldNode,
                    parentType,
                    typeScopes,
                    typePolicies,
                    typeAuthArgs,
                    typeDirectives,
                    executionArgs: args,
                    field,
                    fieldDirectives,
                    fieldAuthArgs,
                    fieldScopes,
                    fieldPolicies,
                    userScopes,
                    path: resolvePath,
                    userPolicies: policies,
                  });
                };

                return {
                  Field(node, key, parent, path, ancestors) {
                    if (!shouldIncludeNode(args.variableValues, node)) {
                      return;
                    }

                    const fieldType = getNamedType(context.getParentType()!);
                    if (isIntrospectionType(fieldType)) {
                      return node;
                    }

                    if (isUnionType(fieldType)) {
                      for (const objectType of fieldType.getTypes()) {
                        const error = handleField(
                          {
                            node,
                            key,
                            parent,
                            path,
                            ancestors,
                          },
                          objectType,
                        );
                        if (error) {
                          context.reportError(error);
                          return null;
                        }
                      }
                    } else if (isObjectType(fieldType) || isInterfaceType(fieldType)) {
                      const error = handleField(
                        {
                          node,
                          key,
                          parent,
                          path,
                          ancestors,
                        },
                        fieldType,
                      );
                      if (error) {
                        context.reportError(error);
                        return null;
                      }
                    }
                    return undefined;
                  },
                };
              },
            ],
          }),
        );
      },
      async onContextBuilding({ context, extendContext }) {
        const user = await options.resolveUserFn(context as unknown as ContextType);
        if (options.extractPolicies) {
          const policies = await options.extractPolicies(user!, context as unknown as ContextType);
          policiesByContext.set(context as unknown as ContextType, policies);
        }
        // @ts-expect-error - Fix this
        if (context[contextFieldName] !== user) {
          // @ts-expect-error - Fix this
          extendContext({
            [contextFieldName]: user,
          });
        }
      },
    };
  }
  if (options.mode === 'resolve-only') {
    return {
      async onContextBuilding({ context, extendContext }) {
        const user = await options.resolveUserFn(context as unknown as ContextType);

        extendContext({
          [contextFieldName]: user,
        } as any);
      },
    };
  }

  return {};
};
