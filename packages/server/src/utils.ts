import hyperId from 'hyperid';
import { EventsHandler, AllEvents } from '@guildql/types';

const generateUuid = hyperId({ fixedLength: true });

export async function emitAsync<K extends keyof AllEvents>(emitter: EventsHandler, event: K, payload: Parameters<AllEvents[K]>[0]): Promise<void> {
  for (const listener of emitter.listeners(event)) {
    await listener(payload as any);
  }
}

export function getRequestId(contextValue: Record<string, any>): string {
  if (contextValue && typeof contextValue === 'object') {
    // 1. Try to get requestId directory from the context
    if (contextValue.requestId) {
      if (typeof contextValue.requestId === 'string' || typeof contextValue.requestId === 'number') {
        return contextValue.requestId.toString();
      } else if (typeof contextValue.requestId === 'function') {
        return contextValue.requestId();
      }
    }
    // 2. Then, check for request and look for popular ways to set the operation id
    else if (contextValue.req || contextValue.request) {
      const headers = (contextValue.req || contextValue.request || {}).headers || {};
      const fromHeader = headers['request-id'] || headers['x-request-id'] || headers['x-correlation-id'];

      if (fromHeader) {
        return fromHeader;
      }
    }
  }

  return generateUuid();
}
