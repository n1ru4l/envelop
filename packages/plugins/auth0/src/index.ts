/* eslint-disable no-console */
/* eslint-disable dot-notation */
import { Plugin } from '@envelop/types';
import * as JwksRsa from 'jwks-rsa';
import { decode, verify, VerifyOptions, DecodeOptions } from 'jsonwebtoken';

export type Auth0PluginOptions = {
  domain: string;
  audience: string;

  preventUnauthenticatedAccess?: boolean;
  onError?: (error: Error) => void;

  extractTokenFn?: (context: unknown) => Promise<string> | string;
  jwksClientOptions?: JwksRsa.Options;
  jwtVerifyOptions?: VerifyOptions;
  jwtDecodeOptions?: DecodeOptions;
  extendContextField?: string;
  tokenType?: string;
  headerName?: string;
};

export class UnauthenticatedError extends Error {}

export const useAuth0 = (options: Auth0PluginOptions): Plugin => {
  const jkwsClient = new JwksRsa.JwksClient({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${options.domain}/.well-known/jwks.json`,
    ...(options.jwksClientOptions || {}),
  });

  const contextField = options.extendContextField || '_auth0';
  const tokenType = options.tokenType || 'Bearer';
  const headerName = options.headerName || 'authorization';

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
        if (headers[headerName] && typeof headers[headerName] === 'string') {
          const authHeader = headers[headerName] || '';
          const split = authHeader.split(' ');

          if (split.length !== 2) {
            throw new Error(`Invalid value provided for header "${headerName}"!`);
          } else {
            const [type, value] = split;

            if (type !== tokenType) {
              throw new Error(`Unsupported token type provided: ${type}!`);
            } else {
              return value;
            }
          }
        }
      }

      return null;
    });

  const verifyToken = async (token: string): Promise<any> => {
    const decodedToken = (decode(token, { complete: true, ...(options.jwtDecodeOptions || {}) }) as Record<string, { kid?: string }>) || {};

    if (decodedToken && decodedToken.header && decodedToken.header.kid) {
      const secret = await jkwsClient.getSigningKey(decodedToken.header.kid);
      const signingKey = secret.getPublicKey();
      const decoded = verify(token, signingKey, {
        algorithms: ['RS256'],
        audience: options.audience,
        issuer: `https://${options.domain}/`,
        ...(options.jwtVerifyOptions || {}),
      }) as { sub: string };

      return decoded;
    } else {
      throw new Error(`Failed to decode authentication token!`);
    }
  };

  return {
    async onContextBuilding({ context, extendContext }) {
      try {
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
      } catch (e) {
        if (options.onError) {
          options.onError(e);
        } else {
          throw e;
        }
      }
    },
  };
};
