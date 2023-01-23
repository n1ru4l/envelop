import jsonStableStringify from 'fast-json-stable-stringify';
import fastRedact from 'fast-redact';

import { decamelize } from 'humps';
import { hashSHA256 } from './hash-sha256';
import { Kind, OperationDefinitionNode } from 'graphql';
import { getOperation } from './tools';
import type { InngestDataOptions, InngestEventOptions, InngestUserContextOptions } from './types';

const extractOperationName = (options: InngestEventOptions): string => {
  const args = options.params.args;
  const rootOperation = args.document.definitions.find(
    // @ts-expect-error TODO: not sure how we will make it dev friendly
    definitionNode => definitionNode.kind === Kind.OPERATION_DEFINITION
  ) as OperationDefinitionNode;
  const operationName = args.operationName || rootOperation.name?.value || undefined;

  options.logger.info({ operationName }, '>>>>>>>>>>> in extractOperationName');

  return operationName;
};

export const buildOperationId = async (options: InngestEventOptions): Promise<string> => {
  const tokens = [
    options.documentString,
    extractOperationName(options) ?? '',
    jsonStableStringify(options.params.args.variableValues ?? {}),
  ].join('|');

  const operationId = await hashSHA256(tokens);

  options.logger.info({ custom: { tokens, operationId } }, '>>>>>>>>>>> buildOperationId tokens');

  return operationId;
};

const buildOperationNameForEventName = async (options: InngestEventOptions) => {
  options.logger.info({ custom: options.params?.args }, '>>>>>>>>>>> args');

  let operationName = extractOperationName(options);

  if (!operationName) {
    const operationId = await buildOperationId(options);
    operationName = `anonymous-${operationId}`;
  }

  return decamelize(operationName, {
    separator: '-',
  });
};

export const buildDataPayload = async (options: InngestDataOptions) => {
  options.logger.info('>>>>>>>>>>> in data');

  const payload = {
    ...options.result.data,
    __graphql: {
      operation: getOperation(options.params),
      operationName: extractOperationName(options),
      operationId: await buildOperationNameForEventName(options),
      variables: options.params.args.variableValues,
    },
  };

  if (options.redaction) {
    options.logger.info({ custom: options.redaction }, '>>>>>>>>>>> REDACTing with options');

    const redact = fastRedact(options.redaction);

    const redactedData = JSON.parse(redact(payload) as string);

    options.logger.info({ custom: redactedData }, '>>>>>>>>>>> REDACTED data');

    return redactedData;
  }

  options.logger.info({ custom: payload }, '>>>>>>>>>>> payload data');

  return payload;
};

export const buildEventName = async (options: InngestEventOptions) => {
  options.logger.info('>> in eventName');

  const operationName = await buildOperationNameForEventName(options);
  const operation = getOperation(options.params);

  const name = `${options.eventNamePrefix}/${operationName}.${operation}`.toLowerCase();
  options.logger.info({ custom: name }, '>>>>>>>>>>> buildEventName');

  return name as string;
};

// TODO: support a custom user context function
export const buildUserContext = (options: InngestUserContextOptions) => {
  options.logger.info('>> in user');
  return {
    currentUser: options.params.args.contextValue.currentUser,
  };
};
