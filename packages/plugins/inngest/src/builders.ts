import jsonStableStringify from 'fast-json-stable-stringify';
import fastRedact from 'fast-redact';

import { decamelize } from 'humps';
import { hashSHA256 } from './hash-sha256';
import { extractOperationName, getOperation } from './tools';
import type { InngestDataOptions, InngestEventOptions, InngestUserContextOptions } from './types';

export const buildOperationId = async (options: InngestEventOptions): Promise<string> => {
  const tokens = [
    options.documentString,
    extractOperationName(options) ?? '',
    jsonStableStringify(options.params.args.variableValues ?? {}),
  ].join('|');

  const operationId = await hashSHA256(tokens);

  options.logger.debug({ custom: { tokens, operationId } }, '>>>>>>>>>>> buildOperationId tokens');

  return operationId;
};

export const buildOperationNameForEventName = async (options: InngestEventOptions) => {
  options.logger.debug({ custom: options.params?.args }, '>>>>>>>>>>> args');

  let operationName = extractOperationName(options);

  if (!operationName) {
    const operationId = await buildOperationId(options);
    operationName = `anonymous-${operationId}`;
  }

  return decamelize(operationName, {
    separator: '-',
  });
};

export const buildEventName = async (options: InngestEventOptions) => {
  options.logger.debug('>> in eventName');

  const operationName = await buildOperationNameForEventName(options);
  const operation = getOperation(options.params);

  const name = `${options.eventNamePrefix}/${operationName}.${operation}`.toLowerCase();
  options.logger.debug({ custom: name }, '>>>>>>>>>>> buildEventName');

  return name as string;
};

export const buildDataPayload = async (options: InngestDataOptions) => {
  options.logger.debug('>>>>>>>>>>> in data');

  const payload = {
    ...options.result.data,
    __graphql: {
      operation: getOperation(options.params),
      operationName: extractOperationName(options) || '',
      operationId: await buildOperationNameForEventName(options),
      variables: options.params.args.variableValues || {},
    },
  };

  if (options.redaction) {
    options.logger.debug({ custom: options.redaction }, '>>>>>>>>>>> REDACTing with options');

    const redact = fastRedact(options.redaction);

    const redactedData = JSON.parse(redact(payload) as string);

    options.logger.debug({ custom: redactedData }, '>>>>>>>>>>> REDACTED data');

    return redactedData;
  }

  options.logger.debug({ custom: payload }, '>>>>>>>>>>> payload data');

  return payload;
};

// TODO: support a custom user context function
export const buildUserContext = (options: InngestUserContextOptions) => {
  options.logger.debug('>> in user');
  return {
    currentUser: options.params.args.contextValue.currentUser,
  };
};
