import { Plugin, handleStreamOrSingleExecutionResult } from '@envelop/core';
import { OperationTypeNode } from 'graphql';

import { buildEventPayload, buildEventName, buildUserContext } from './builders';
import { defaultGetDocumentString, useCacheDocumentString } from './cache-document-str';
import { buildLogger } from './logger';
import { shouldSendEvent } from './should-send-event';
import type { UseInngestPluginOptions, UseInngestConfig } from './types';

export const defaultUseInngestPluginOptions: UseInngestConfig = {
  eventNamePrefix: 'graphql', // functioin to build the event name and default the the one i have already
  buildEventNameFunction: buildEventName, // remove the prefix???
  // buildUserContextFunction: buildUserContext,
  allowedOperations: [OperationTypeNode.QUERY, OperationTypeNode.MUTATION],
  allowAnonymousOperations: false, // change allow to
  allowErrors: false,
  allowIntrospection: false,
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

  if (!buildEventNameFunction) {
    throw Error('buildEventNameFunction is required');
  }

  const logger = buildLogger(config);

  const getDocumentString = defaultGetDocumentString;

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(useCacheDocumentString());
    },
    async onExecute(onExecuteParams) {
      return {
        async onExecuteDone(payload) {
          return handleStreamOrSingleExecutionResult(payload, async ({ result }) => {
            if (
              await shouldSendEvent({
                params: onExecuteParams,
                result,
                allowedOperations: config.allowedOperations,
                allowErrors: config.allowErrors,
                allowIntrospection: config.allowIntrospection,
                allowAnonymousOperations: config.allowAnonymousOperations,
                logger,
              })
            ) {
              await client.send({
                name: await buildEventNameFunction({
                  params: onExecuteParams,
                  documentString: getDocumentString(onExecuteParams.args),
                  eventNamePrefix: config.eventNamePrefix,
                  logger,
                }),
                data: await buildEventPayload({
                  params: onExecuteParams,
                  buildEventNameFunction,
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
