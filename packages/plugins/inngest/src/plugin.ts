import { Plugin, handleStreamOrSingleExecutionResult } from '@envelop/core';
import { OperationTypeNode } from 'graphql';

import { buildEventPayload, buildEventName, buildEventNamePrefix, buildUserContext } from './builders';
import { defaultGetDocumentString, useCacheDocumentString } from './cache-document-str';
import { buildLogger } from './logger';
import { shouldSendEvent } from './should-send-event';
import type { UseInngestPluginOptions, UseInngestConfig } from './types';

export const defaultUseInngestPluginOptions: UseInngestConfig = {
  buildEventNameFunction: buildEventName,
  buildEventNamePrefixFunction: buildEventNamePrefix,
  // buildUserContextFunction: buildUserContext,
  sendOperations: [OperationTypeNode.QUERY, OperationTypeNode.MUTATION],
  sendAnonymousOperations: false,
  sendErrors: false,
  sendIntrospection: false,
  includeResultData: false,
};

/**
 * Sends GraphQL operation events to Inngest
 *
 * @param options UseInngestPluginOptions
 */
export const useInngest = (options: UseInngestPluginOptions): Plugin => {
  const client = options.inngestClient;

  const config = { ...defaultUseInngestPluginOptions, ...options };
  const buildEventNameFunction = config.buildEventNameFunction ?? defaultUseInngestPluginOptions.buildEventNameFunction;
  const buildEventNamePrefixFunction =
    config.buildEventNamePrefixFunction ?? defaultUseInngestPluginOptions.buildEventNamePrefixFunction;

  if (!buildEventNameFunction) {
    throw Error('buildEventNameFunction is required');
  }

  if (!buildEventNamePrefixFunction) {
    throw Error('buildEventNamePrefixFunction is required');
  }
  const logger = buildLogger(config);

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
                sendOperations: config.sendOperations,
                sendErrors: config.sendErrors,
                sendIntrospection: config.sendIntrospection,
                sendAnonymousOperations: config.sendAnonymousOperations,
                logger,
              })
            ) {
              await client.send({
                name: eventName,
                data: await buildEventPayload({
                  eventName,
                  params: onExecuteParams,
                  result,
                  logger,
                  redaction: config.redaction,
                  includeResultData: config.includeResultData,
                }),

                // TODO: support a custom user context function
                user: buildUserContext({ params: onExecuteParams, logger }),
              });
            }
          });
        },
      };
    },
  };
};
