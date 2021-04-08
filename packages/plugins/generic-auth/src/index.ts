import { Plugin } from '@envelop/types';

export class UnauthenticatedError extends Error {}

export type ExtractUserFn<UserType, ContextType = unknown> = (context: ContextType) => null | UserType | Promise<UserType>;
export type ValidateUserFn<UserType, ContextType = unknown> = (user: UserType, context: ContextType) => void | Promise<void>;

export const DIRECTIVE_SDL = /* GraphQL */ `
  directive @auth on FIELD_DEFINITION
`;

export type GenericAuthPluginOptions<UserType, ContextType> = {
  /**
   * Here you can implement any custom sync/async code, and use the context built so far in Envelop and the HTTP request
   * to find the current user.
   * Common practice is to use a JWT token here, validate it, and use the payload as-is, or fetch the user from an external services.
   * Make sure to either return `null` or the user object.
   */
  extractUserFn: ExtractUserFn<UserType, ContextType>;
  /**
   * Here you can implement any custom to check if the user is valid and have access to the server.
   * This method is being triggered in different flows, besed on the mode you chose to implement.
   */
  validateUser?: ValidateUserFn<UserType, ContextType>;
  /**
   * Overrides the default field name for injecting the user into the execution `context`.
   * @default currentUser
   */
  contextFieldName?: string;
} & (
  | {
      /**
       * This mode offers complete protection for the entire API.
       * It protects your entire GraphQL schema, by validating the user before executing the request.
       */
      mode: 'authenticate-all';
    }
  | {
      /**
       * Just extracts the user and inject to authenticated user into the `context`.
       * User validation needs to be implemented by you, in your resolvers.
       */
      mode: 'just-extract';
    }
  | {
      /**
       * Extracts the user and inject to authenticated user into the `context`.
       * And checks for `@auth` directives usages to run validation automatically.
       */
      mode: 'auth-directive';
      /**
       * Extends the schema with the directive definition.
       * @default false
       */
      addDirectiveToSchema?: boolean;
    }
);

export const useGenericAuth = <UserType extends {}, ContextType = unknown>(
  options: GenericAuthPluginOptions<UserType, ContextType>
): Plugin => {
  return {};
};
