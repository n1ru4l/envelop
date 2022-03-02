import { DefaultContext, Plugin } from '@envelop/core';
import {
  DirectiveNode,
  FieldNode,
  getNamedType,
  GraphQLError,
  GraphQLField,
  GraphQLObjectType,
  isInterfaceType,
  isIntrospectionType,
  isObjectType,
  isUnionType,
} from 'graphql';
import { useExtendedValidation } from '@envelop/extended-validation';

export class UnauthenticatedError extends GraphQLError {}

export type ResolveUserFn<UserType, ContextType = DefaultContext> = (
  context: ContextType
) => null | UserType | Promise<UserType | null>;

export type ValidateUserFnParams<UserType> = {
  /** The user object. */
  user: UserType;
  /** The field node from the operation that is being validated. */
  fieldNode: FieldNode;
  /** The object type which has the field that is being validated. */
  objectType: GraphQLObjectType;
  /** The directive node used for the authentication (If using an SDL flow). */
  fieldAuthDirectiveNode: DirectiveNode | undefined;
  /** The extensions used for authentication (If using an extension based flow). */
  fieldAuthExtension: unknown | undefined;
};

export type ValidateUserFn<UserType> = (params: ValidateUserFnParams<UserType>) => void | UnauthenticatedError;

export const DIRECTIVE_SDL = /* GraphQL */ `
  directive @auth on FIELD_DEFINITION
`;

export const SKIP_AUTH_DIRECTIVE_SDL = /* GraphQL */ `
  directive @skipAuth on FIELD_DEFINITION
`;

export type GenericAuthPluginOptions<UserType extends {} = {}, ContextType extends DefaultContext = DefaultContext> = {
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
  contextFieldName?: 'currentUser' | string;
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
      directiveOrExtensionFieldName?: 'skipAuth' | string;
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
       * @default auth
       */
      directiveOrExtensionFieldName?: 'auth' | string;
      /**
       * Customize how the user is validated. E.g. apply authorization role based validation.
       * The validation is applied during the extended validation phase.
       * @default `defaultProtectSingleValidateFn`
       */
      validateUser?: ValidateUserFn<UserType>;
    }
);

export function defaultProtectAllValidateFn<UserType>(params: ValidateUserFnParams<UserType>): void | UnauthenticatedError {
  if (params.user == null && !params.fieldAuthDirectiveNode && !params.fieldAuthExtension) {
    const schemaCoordinate = `${params.objectType.name}.${params.fieldNode.name.value}`;
    return new UnauthenticatedError(`Accessing '${schemaCoordinate}' requires authentication.`, [params.fieldNode]);
  }
}

export function defaultProtectSingleValidateFn<UserType>(params: ValidateUserFnParams<UserType>): void | UnauthenticatedError {
  if (params.user == null && (params.fieldAuthDirectiveNode || params.fieldAuthExtension)) {
    const schemaCoordinate = `${params.objectType.name}.${params.fieldNode.name.value}`;
    return new UnauthenticatedError(`Accessing '${schemaCoordinate}' requires authentication.`, [params.fieldNode]);
  }
}

export const useGenericAuth = <UserType extends {} = {}, ContextType extends DefaultContext = DefaultContext>(
  options: GenericAuthPluginOptions<UserType, ContextType>
): Plugin<{
  validateUser: ValidateUserFn<UserType>;
}> => {
  const contextFieldName = options.contextFieldName || 'currentUser';

  if (options.mode === 'protect-all' || options.mode === 'protect-granular') {
    const directiveOrExtensionFieldName =
      options.directiveOrExtensionFieldName ?? (options.mode === 'protect-all' ? 'skipAuth' : 'auth');
    const validateUser =
      options.validateUser ?? (options.mode === 'protect-all' ? defaultProtectAllValidateFn : defaultProtectSingleValidateFn);
    const extractAuthMeta = (
      input: GraphQLField<any, any>
    ): { fieldAuthDirectiveNode: DirectiveNode | undefined; fieldAuthExtension: unknown } => {
      return {
        fieldAuthExtension: input.extensions?.[directiveOrExtensionFieldName],
        fieldAuthDirectiveNode: input.astNode?.directives?.find(
          directive => directive.name.value === directiveOrExtensionFieldName
        ),
      };
    };

    return {
      onPluginInit({ addPlugin }) {
        addPlugin(
          useExtendedValidation({
            rules: [
              function AuthorizationExtendedValidationRule(context, args) {
                const user = (args.contextValue as any)[contextFieldName];

                const handleField = (fieldNode: FieldNode, objectType: GraphQLObjectType) => {
                  const field = objectType.getFields()[fieldNode.name.value];
                  if (field == null) {
                    // field is null/undefined if this is an introspection field
                    return;
                  }

                  const { fieldAuthExtension, fieldAuthDirectiveNode } = extractAuthMeta(field);
                  const error = validateUser({
                    user,
                    fieldNode,
                    objectType,
                    fieldAuthDirectiveNode,
                    fieldAuthExtension,
                  });
                  if (error) {
                    context.reportError(error);
                  }
                };

                return {
                  Field(node) {
                    const fieldType = getNamedType(context.getParentType()!);
                    if (isIntrospectionType(fieldType)) {
                      return false;
                    }

                    if (isObjectType(fieldType)) {
                      handleField(node, fieldType);
                    } else if (isUnionType(fieldType)) {
                      for (const objectType of fieldType.getTypes()) {
                        handleField(node, objectType);
                      }
                    } else if (isInterfaceType(fieldType)) {
                      for (const objectType of args.schema.getImplementations(fieldType).objects) {
                        handleField(node, objectType);
                      }
                    }
                    return undefined;
                  },
                };
              },
            ],
          })
        );
      },
      async onContextBuilding({ context, extendContext }) {
        const user = await options.resolveUserFn(context as unknown as ContextType);
        extendContext({
          [contextFieldName]: user,
        } as unknown as ContextType);
      },
    };
  } else if (options.mode === 'resolve-only') {
    return {
      async onContextBuilding({ context, extendContext }) {
        const user = await options.resolveUserFn(context as unknown as ContextType);

        extendContext({
          [contextFieldName]: user,
        } as unknown as ContextType);
      },
    };
  }

  return {};
};
