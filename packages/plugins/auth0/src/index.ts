import { PluginFn } from '@guildql/types';
import createClient from 'jwks-rsa';
import { verify, decode } from 'jsonwebtoken';

export type ContextWithAuth0 = {
  [key: string]: unknown;
};

export type Auth0Options = {
  domain: string;
  audience: string;
  algorithms: string[];
};

export const useAuth0 = (options: Auth0Options): PluginFn => api => {
  const jwksClient = createClient({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${options.domain}/.well-known/jwks.json`,
  });

  const decodeAndValidateAuth0Token = async (token: string): Promise<{ sub?: string; [key: string]: any }> => {
    const decodedToken = (decode(token, { complete: true }) as Record<string, { kid?: string }>) || {};
    const secret = await jwksClient.getSigningKeyAsync(decodedToken.header.kid);
    const signingKey = secret.getPublicKey();
    const decoded = verify(token, signingKey, {
      algorithms: options.algorithms,
      audience: options.audience,
      issuer: `https://${options.domain}/`,
    }) as { sub: string };

    return decoded;
  };

  api.on('beforeExecute', support => {
    const params = support.getExecutionParams();
  });
};
