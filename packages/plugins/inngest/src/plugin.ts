import { Plugin, handleStreamOrSingleExecutionResult } from '@envelop/core';
import { OperationTypeNode } from 'graphql';

import { buildEventPayload, buildEventName, buildUserContext } from './builders';
import { defaultGetDocumentString, useCacheDocumentString } from './cache-document-str';
import { buildLogger } from './logger';
import { shouldSendEvent } from './should-send-event';
import type { UseInngestPluginOptions, UseInngestCommonOptions } from './types';

export const defaultUseInngestPluginOptions: UseInngestCommonOptions = {
  eventNamePrefix: 'graphql', // functioin to build the event name and default the the one i have already
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
  // console.log(typeof options.inngestClient);
  const client = options.inngestClient;

  // if (client === undefined) {
  //   throw new Error('Inngest client is not defined');
  // }

  // clean up this code
  // const optionsToUSe = {
  //   ...defaultUseInngestPluginOptions,
  //   ...options,
  // }

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
