/* eslint-disable no-console */
/* eslint-disable dot-notation */
import { Plugin } from '@guildql/types';
import createClient, { ClientOptions } from 'jwks-rsa';
import { decode, verify, VerifyOptions, DecodeOptions } from 'jsonwebtoken';

export type Auth0PluginOptions = {
  domain: string;
  audience: string;

  preventUnauthenticatedAccess?: boolean;
  extractTokenFn?: (context: unknown) => Promise<string> | string;
  jwksClientOptions?: ClientOptions;
  jwtVerifyOptions?: VerifyOptions;
  jwtDecodeOptions?: DecodeOptions;
  extendContextField?: string;
};

export class UnauthenticatedError extends Error {}

export const useAuth0 = (options: Auth0PluginOptions): Plugin => {
  const jkwsClient = createClient({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${options.domain}/.well-known/jwks.json`,
    ...(options.jwksClientOptions || {}),
  });

  const contextField = options.extendContextField || '_auth0';

  const extractFn =
    options.extractTokenFn ||
    ((ctx = {}): string | null => {
      const req = ctx['req'] || ctx['request'] || {};
      const headers = req.headers || ctx['headers'] || null;

      if (!headers) {
        console.warn(
          `useAuth0 plugin unable to locate your request or headers on the execution context. Please make sure to pass that, or provide custom "extractTokenFn" function.`
        );
      } else {
        if (headers['authorization'] && typeof headers['authorization'] === 'string') {
          return headers['authorization'];
        }
      }

      return null;
    });

  const verifyToken = async (token: string): Promise<any> => {
    const decodedToken = (decode(token, { complete: true, ...(options.jwtDecodeOptions || {}) }) as Record<string, { kid?: string }>) || {};
    const secret = await jkwsClient.getSigningKeyAsync(decodedToken.header.kid);
    const signingKey = secret.getPublicKey();
    const decoded = verify(token, signingKey, {
      algorithms: ['RS256'],
      audience: options.audience,
      issuer: `https://${options.domain}/`,
      ...(options.jwtVerifyOptions || {}),
    }) as { sub: string };

    return decoded;
  };

  return {
    async onContextBuilding({ context, extendContext }) {
      const token = await extractFn(context);

      if (token) {
        const decodedPayload = await verifyToken(token);

        extendContext({
          [contextField]: decodedPayload,
        });
      } else {
        if (options.preventUnauthenticatedAccess) {
          throw new UnauthenticatedError(`Unauthenticated!`);
        }
      }
    },
  };
};
