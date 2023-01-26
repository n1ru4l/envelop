import { buildEventName } from './builders';
import { allowOperation, isAnonymousOperation, isIntrospectionQuery } from './tools';
import { InngestDataOptions } from './types';

// TODO: skip list of schema coordinates -- response  c Query.findPost 4000
export const shouldSendEvent = async (options: InngestDataOptions) => {
  options.logger.debug('>> in shouldSendEvent');

  const allowedOperation = allowOperation(options);
  const isAnonymous = isAnonymousOperation(options.params);
  const isIntrospection = isIntrospectionQuery(options.params);
  const hasErrors = options.result?.errors !== undefined && options.result.errors.length > 0;

  const eventName = await buildEventName(options);

  if (!allowedOperation) {
    options.logger.warn(`Blocking event ${eventName} because it is not an allowed operation.`);

    return false;
  }

  if (isAnonymous && options.allowAnonymousOperations) {
    options.logger.warn(`Sending event ${eventName} because anonymous operations are allowed.`);

    return true;
  }

  if (isIntrospection && options.allowIntrospection) {
    options.logger.warn(`Sending event ${eventName} because introspection queries are allowed.`);

    return true;
  }

  if (hasErrors && options.allowErrors) {
    options.logger.warn(`Sending event ${eventName} because sending errors is allowed.`);

    return true;
  }

  const shouldSend = !isIntrospection && !hasErrors;

  if (shouldSend) {
    options.logger.warn(
      `Sending event${eventName} because it is allowed due to introspection ${isIntrospection} or errors ${hasErrors}`
    );
  } else {
    options.logger.warn(
      `Blocking event ${eventName} because it is not allowed due to introspection ${isIntrospection} or errors ${hasErrors}`
    );
  }

  return shouldSend;
};
