import jsonStableStringify from 'fast-json-stable-stringify';
import fastRedact from 'fast-redact';

import { decamelize } from 'humps';
import { hashSHA256 } from './hash-sha256';
import { USE_INNGEST_DEFAULT_EVENT_PREFIX, USE_INNGEST_ANONYMOUS_EVENT_PREFIX } from './index';
import { getOperationName, getOperation, buildTypeIdentifiers } from './schema-helpers';
import type {
  UseInngestDataOptions,
  UseInngestEventOptions,
  UseInngestUserContextOptions,
  BuildEventNameFunction,
  UseInngestEventNameFunctionOptions,
  BuildEventNamePrefixFunction,
  BuildUserContextFunction,
  UseInngestEventNamePrefixFunctionOptions,
} from './types';

/**
 * buildOperationId
 *
 * @param options UseInngestDataEventOptions
 * @returns string Operation ID
 */
export const buildOperationId = async (options: UseInngestEventOptions): Promise<string> => {
  const tokens = [
    options.documentString,
    getOperationName(options) ?? '',
    jsonStableStringify(options.params.args.variableValues ?? {}),
  ].join('|');

  const operationId = await hashSHA256(tokens);

  return operationId;
};

/**
 * buildOperationNameForEventName
 *
 * @param options UseInngestDataEventOptions
 * @returns string Operation name for event
 */
export const buildOperationNameForEventName = async (options: UseInngestEventOptions) => {
  let operationName = getOperationName(options);

  if (!operationName) {
    const operationId = await buildOperationId(options);
    operationName = `${USE_INNGEST_ANONYMOUS_EVENT_PREFIX}-${operationId}`;
  }

  return decamelize(operationName, {
    separator: '-',
  });
};

/**
 * buildEventPayload
 *
 * @param options UseInngestDataOptions
 * @returns Object Event payload
 */
export const buildEventPayload = async (options: UseInngestDataOptions) => {
  const { identifiers, types } = await buildTypeIdentifiers(options);

  let variables = options.params.args.variableValues || {};
  let result = {};

  if (options.includeResultData) {
    result = options.result;
  }

  if (options.redaction) {
    const redact = fastRedact(options.redaction);
    result = JSON.parse(redact(result) as string);
    variables = JSON.parse(redact(variables) as string);
  }

  const payload = {
    variables,
    identifiers,
    types,
    result,
    operation: {
      id: await buildOperationNameForEventName(options),
      name: getOperationName(options) || '',
      type: getOperation(options.params),
    },
  };

  return payload;
};

/**
 * buildEventNamePrefix
 *
 * @param options UseInngestEventNamePrefixFunctionOptions
 * @returns string Prefix for event name
 */
export const buildEventNamePrefix: BuildEventNamePrefixFunction = async (
  options: UseInngestEventNamePrefixFunctionOptions
) => {
  return USE_INNGEST_DEFAULT_EVENT_PREFIX;
};

/**
 * buildEventName
 *
 * @param options UseInngestEventNameFunctionOptions
 * @returns string Event name
 */
export const buildEventName: BuildEventNameFunction = async (options: UseInngestEventNameFunctionOptions) => {
  const operationName = await buildOperationNameForEventName(options);
  const operation = getOperation(options.params);

  const name = `${options.eventNamePrefix}/${operationName}.${operation}`.toLowerCase();

  return name as string;
};

/**
 * buildUserContext
 *
 * @param options UseInngestUserContextOptions
 * @returns Object User info
 */
export const buildUserContext: BuildUserContextFunction = (options: UseInngestUserContextOptions) => {
  return {};
};
