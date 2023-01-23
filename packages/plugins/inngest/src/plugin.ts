import { Plugin, handleStreamOrSingleExecutionResult } from '@envelop/core';
import type { ClientOptions } from 'inngest';

import { buildDataPayload, buildEventName, buildUserContext } from './builders';
import { defaultGetDocumentString, useCacheDocumentString } from './cache-document-str';
import { createInngestClient } from './client';
import { buildLogger } from './logger';
import { shouldSendEvent } from './should-send-event';
import type { UseInngestPluginOptions } from './types';

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
  const getDocumentString = defaultGetDocumentString;
  const eventNamePrefix = options.eventNamePrefix || 'graphql';

  const logger = buildLogger(options);

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
              shouldSendEvent({
                params: onExecuteParams,
                result,
                includeErrors: options.includeErrors,
                includeIntrospection: options.includeIntrospection,
                skipAnonymousOperations: options.skipAnonymousOperations,
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
                data: options.skipData
                  ? {}
                  : await buildDataPayload({
                      params: onExecuteParams,
                      result,
                      logger,
                      redaction: options.redaction,
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
