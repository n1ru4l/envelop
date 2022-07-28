import { Source } from '@graphql-tools/graphql';

export function operationIdFromSource(source: string | Source): string | undefined {
  return typeof source === 'string' && source.length && source.indexOf('{') === -1 ? source : undefined;
}
