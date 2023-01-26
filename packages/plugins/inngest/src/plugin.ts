import type { ClientOptions } from 'inngest';

import { Plugin, handleStreamOrSingleExecutionResult } from '@envelop/core';
import { OperationTypeNode } from 'graphql';

import { buildEventPayload, buildEventName, buildUserContext } from './builders';
import { defaultGetDocumentString, useCacheDocumentString } from './cache-document-str';
import { createInngestClient } from './client';
import { buildLogger } from './logger';
import { shouldSendEvent } from './should-send-event';
import type { UseInngestPluginOptions } from './types';

export const defaultUseInngestPluginOptions: UseInngestPluginOptions = {
  eventNamePrefix: 'graphql',
  allowedOperations: [OperationTypeNode.QUERY, OperationTypeNode.MUTATION],
  allowAnonymousOperations: false,
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
  const client =
    typeof options.inngestClient === 'object'
      ? createInngestClient(options.inngestClient as ClientOptions)
      : options.inngestClient;

  if (client === undefined) {
    throw new Error('Inngest client is not defined');
  }

  const allowedOperations = options.allowedOperations ?? defaultUseInngestPluginOptions.allowedOperations;

  const allowAnonymousOperations =
    options.allowAnonymousOperations ?? defaultUseInngestPluginOptions.allowAnonymousOperations;
  const allowErrors = options.allowErrors ?? defaultUseInngestPluginOptions.allowErrors;
  const allowIntrospection = options.allowIntrospection ?? defaultUseInngestPluginOptions.allowIntrospection;
  const includeResultData = options.includeResultData ?? defaultUseInngestPluginOptions.includeResultData;

  const eventNamePrefix = options.eventNamePrefix ?? defaultUseInngestPluginOptions.eventNamePrefix;
  const redaction = options.redaction ?? defaultUseInngestPluginOptions.redaction;

  const logger = buildLogger(options);

  const getDocumentString = defaultGetDocumentString;

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(useCacheDocumentString());
    },
    async onExecute(onExecuteParams) {
      logger.debug('>>>>>>>>>>> in useInngest onExecute');
      return {
        onExecuteDone(payload) {
          logger.debug('>>>>>>>>>>> in onExecuteDone');

          return handleStreamOrSingleExecutionResult(payload, async ({ result }) => {
            if (
              await shouldSendEvent({
                params: onExecuteParams,
                result,
                allowedOperations,
                allowErrors,
                allowIntrospection,
                allowAnonymousOperations,
                logger,
              })
            ) {
              await client.send({
                name: await buildEventName({
                  params: onExecuteParams,
                  documentString: getDocumentString(onExecuteParams.args),
                  eventNamePrefix,
                  logger,
                }),
                data: await buildEventPayload({
                  params: onExecuteParams,
                  result,
                  logger,
                  redaction,
                  includeResultData,
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
