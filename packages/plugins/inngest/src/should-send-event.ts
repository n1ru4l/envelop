import { allowOperation, isAnonymousOperation, isIntrospectionQuery } from './tools';
import { UseInngestDataOptions } from './types';

// TODO: skip list of schema coordinates -- response  c Query.findPost 4000
export const shouldSendEvent = async (options: UseInngestDataOptions) => {
  options.logger.debug('>> in shouldSendEvent');

  const allowedOperation = allowOperation(options);
  const isAnonymous = isAnonymousOperation(options.params);
  const isIntrospection = isIntrospectionQuery(options.params);
  const hasErrors = options.result?.errors !== undefined && options.result.errors.length > 0;

  const eventName = options.eventName;

  if (!allowedOperation) {
    options.logger.warn(`Blocking event ${eventName} because it is not an configured operation.`);

    return false;
  }

  if (isAnonymous && options.sendAnonymousOperations) {
    options.logger.warn(`Sending event ${eventName} because anonymous operations are configured.`);

    return true;
  }

  if (isIntrospection && options.sendIntrospection) {
    options.logger.warn(`Sending event ${eventName} because introspection queries are configured.`);

    return true;
  }

  if (hasErrors && options.sendErrors) {
    options.logger.warn(`Sending event ${eventName} because sending errors is configured.`);

    return true;
  }

  const shouldSend = !isIntrospection && !hasErrors;

  if (shouldSend) {
    options.logger.warn(
      `Sending event ${eventName} because it is an introspection ${isIntrospection} or error ${hasErrors}`
    );
  } else {
    options.logger.warn(
      `Blocking event ${eventName} because it is not an introspection ${isIntrospection} or error ${hasErrors}`
    );
  }

  return shouldSend;
};
