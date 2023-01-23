import { isAnonymousOperation, isIntrospectionQuery } from './tools';
import { InngestDataOptions } from './types';

export const shouldSendEvent = (options: InngestDataOptions) => {
  options.logger.debug('>> in shouldSendEvent');

  const isAnonymous = isAnonymousOperation(options.params);
  const isIntrospection = isIntrospectionQuery(options.params);
  const hasErrors = options.result?.errors && options.result.errors.length > 0;

  if (isAnonymous && options.skipAnonymousOperations) {
    options.logger.warn('blocking event because it is an anonymous operation and we want to skip them');

    return false;
  }

  if (isIntrospection && options.includeIntrospection) {
    options.logger.warn('sending event because it is an including introspection query');

    return true;
  }

  if (hasErrors && options.includeErrors) {
    options.logger.warn('sending event because it want to send errors');

    return true;
  }

  const shouldSend = !isIntrospection && !hasErrors;

  if (shouldSend) {
    options.logger.warn(
      `sending event because it is allowed due to introspection ${isIntrospection} or errors ${hasErrors}`
    );
  } else {
    options.logger.warn(`blocking event because introspection ${isIntrospection} or errors ${hasErrors}`);
  }

  return shouldSend;
};
