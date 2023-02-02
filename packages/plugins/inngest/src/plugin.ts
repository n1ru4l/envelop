import { ExecutionResult, Plugin } from '@envelop/core';
// import type { OperationTypeNode } from 'graphql';

import { buildEventPayload, buildEventName, buildEventNamePrefix, buildUserContext } from './event-helpers';
import { defaultGetDocumentString, useCacheDocumentString } from './cache-document-str';
import { buildLogger } from './logger';
import { shouldSendEvent } from './should-send-event';
import type { UseInngestPluginOptions } from './types';

/**
 * Sends GraphQL operation events to Inngest
 *
 * @param options UseInngestPluginOptions
 */
export const useInngest = ({
  inngestClient,
  buildEventNameFunction = buildEventName,
  buildEventNamePrefixFunction = buildEventNamePrefix,
  buildUserContextFunction = buildUserContext,
  sendOperations = ['query', 'mutation'],
  sendAnonymousOperations = false,
  sendErrors = false,
  sendIntrospection = false,
  denylist,
  includeRawResult = false,
  redactRawResultOptions = undefined,
  logging = false,
}: UseInngestPluginOptions): Plugin => {
  const logger = buildLogger({ logging });
  const getDocumentString = defaultGetDocumentString;

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(useCacheDocumentString());
    },
    async onExecute(onExecuteParams) {
      return {
        async onExecuteDone({ result }) {
          try {
            const eventNamePrefix = await buildEventNamePrefixFunction({ params: onExecuteParams, logger });
            const eventName = await buildEventNameFunction({
              params: onExecuteParams,
              documentString: getDocumentString(onExecuteParams.args),
              eventNamePrefix,
              logger,
            });

            if (
              await shouldSendEvent({
                eventName,
                params: onExecuteParams,
                result: result as ExecutionResult,
                sendOperations,
                sendErrors,
                sendIntrospection,
                sendAnonymousOperations,
                denylist,
                logger,
              })
            ) {
              await inngestClient.send({
                name: eventName,
                data: await buildEventPayload({
                  eventName,
                  params: onExecuteParams,
                  result: result as ExecutionResult,
                  includeRawResult,
                  redactRawResultOptions,
                  logger,
                }),
                user: await buildUserContextFunction({ params: onExecuteParams, logger }),
              });
            }
          } catch (error) {
            logger.error(error, 'Error sending event to Inngest');
          }
        },
      };
    },
  };
};
