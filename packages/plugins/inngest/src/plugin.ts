import { Plugin, handleStreamOrSingleExecutionResult } from '@envelop/core';
import { OperationTypeNode } from 'graphql';

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
  sendOperations = [OperationTypeNode.QUERY, OperationTypeNode.MUTATION],
  sendAnonymousOperations = false,
  sendErrors = false,
  sendIntrospection = false,
  denylist,
  includeResultData = false,
  redaction = undefined,
  logging,
}: UseInngestPluginOptions): Plugin => {
  const logger = buildLogger({ logging });
  const getDocumentString = defaultGetDocumentString;

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(useCacheDocumentString());
    },
    async onExecute(onExecuteParams) {
      const eventNamePrefix = await buildEventNamePrefixFunction({ params: onExecuteParams, logger });
      const eventName = await buildEventNameFunction({
        params: onExecuteParams,
        documentString: getDocumentString(onExecuteParams.args),
        eventNamePrefix,
        logger,
      });

      return {
        async onExecuteDone(payload) {
          return handleStreamOrSingleExecutionResult(payload, async ({ result }) => {
            if (
              await shouldSendEvent({
                eventName,
                params: onExecuteParams,
                result,
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
                  result,
                  logger,
                  redaction,
                  includeResultData,
                }),
                user: await buildUserContextFunction({ params: onExecuteParams, logger }),
              });
            }
          });
        },
      };
    },
  };
};
