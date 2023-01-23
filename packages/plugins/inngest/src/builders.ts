import jsonStableStringify from 'fast-json-stable-stringify';
import fastRedact from 'fast-redact';

import { decamelize } from 'humps';
import { hashSHA256 } from './hash-sha256';
import { getOperation } from './tools';
import type { InngestDataOptions, InngestEventOptions, InngestUserContextOptions } from './types';

const buildOperationId = async (options: InngestEventOptions): Promise<string> => {
  const tokens = [
    options.documentString,
    options.params.args.operationName ?? '',
    jsonStableStringify(options.params.args.variableValues ?? {}),
  ].join('|');

  const operationId = await hashSHA256(tokens);

  options.logger.debug({ custom: { tokens, operationId } }, '>>>>>>>>>>> buildOperationId tokens');

  return operationId;
};

const buildOperationName = async (options: InngestEventOptions) => {
  let operationName = options.params?.args?.operationName;

  if (!operationName) {
    const operationId = await buildOperationId(options);
    operationName = `anonymous-${operationId}`;
  }

  return decamelize(operationName, {
    separator: '-',
  });
};

export const buildDataPayload = async (options: InngestDataOptions) => {
  options.logger.debug('>>>>>>>>>>> in data');

  const payload = {
    ...options.result.data,
    __graphql: {
      operation: getOperation(options.params),
      operationName: options.params?.args?.operationName,
      operationId: await buildOperationName(options),
      variables: options.params.args.variableValues,
    },
  };

  if (options.redaction) {
    options.logger.debug({ custom: options.redaction }, '>>>>>>>>>>> REDACTing with options');

    const redact = fastRedact(options.redaction);

    const redactedData = JSON.parse(redact(payload) as string);

    options.logger.debug({ custom: redactedData }, '>>>>>>>>>>> REDACTED data');

    return redactedData;
  }

  return payload;
};

export const buildEventName = async (options: InngestEventOptions) => {
  options.logger.debug('>> in eventName');

  const operationName = await buildOperationName(options);
  const operation = getOperation(options.params);

  const name = `${options.eventNamePrefix}/${operationName}.${operation}`.toLowerCase();

  return name as string;
};

// TODO: support a custom user context function
export const buildUserContext = (options: InngestUserContextOptions) => {
  options.logger.debug('>> in user');
  return {
    currentUser: options.params.args.contextValue.currentUser,
  };
};
