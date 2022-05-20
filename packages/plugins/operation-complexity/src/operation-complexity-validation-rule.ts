import {
  ExecutionArgs,
  FieldNode,
  GraphQLField,
  GraphQLNamedType,
  isEnumType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isUnionType,
} from 'graphql';
import { ExtendedValidationRule } from '@envelop/extended-validation';
import { unwrapGraphQLType } from './unwrap-graphql-type';
import { getArgumentValues } from 'graphql/execution/values.js';
import { Maybe } from '@envelop/core';

export type OperationComplexityFieldCosts = {
  object: number;
  interface: number;
  union: number;
  scalar: number;
  enum: number;
};

export const defaultQueryComplexityFieldCosts: OperationComplexityFieldCosts = {
  object: 1,
  interface: 1,
  union: 1,
  scalar: 0,
  enum: 0,
};

export type OperationComplexityValidationRuleParams = {
  /** Use custom field costs. */
  fieldCosts?: Partial<OperationComplexityFieldCosts>;
  /** Report the total field cost for later usage. */
  reportTotalCost: (totalCost: number, executionArgs: ExecutionArgs) => void;
};
type ArgumentValues = Record<string, unknown>;

/** Handler that can be attached to a field for estimating the amount of returned edges/items. */
export type FieldCountHandler = (argumentValues: ArgumentValues) => number;

/** Symbol for retrieving the field costs from the context object. */
export const fieldCostsSymbol = Symbol('fieldCosts');

export type SharedExtensions = {
  /** The cost of this field. */
  cost?: number;
  /** The additional cost of this field. */
  additionalCost?: number;
};

export type QueryComplexityTypeExtensions = SharedExtensions;

export type QueryComplexityFieldExtensions = SharedExtensions & {
  /**
   * Handler for estimating the items returned from this field.
   * It will be multiplied with the score of the selection set of a given field.
   **/
  count?: FieldCountHandler;
  /**
   * Only apply the count multiplication at on given sub-field.
   * E.g. `edges`
   */
  countOn?: string;
};

/**
 * Validate whether a user is allowed to execute a certain GraphQL operation.
 */
export const OperationComplexityValidationRule = (params: OperationComplexityValidationRuleParams): ExtendedValidationRule => {
  return (context, executionArgs) => {
    const fieldCosts = {
      ...defaultQueryComplexityFieldCosts,
      ...params.fieldCosts,
      // Because we retrieve this lazily, after the rule has been specified we have this way of reading the costs from the context.
      // It is kind of an optimization.
      ...executionArgs.contextValue?.[fieldCostsSymbol],
    };

    let totalCost = 0;

    // keeps track of the nested connections that can occur in a stack.
    const paginationStack: Array<{
      fieldNode: FieldNode;
      count: number;
      subCost: number;
      currentDepth: number;
      // sometimes a paginated field does not immediately resolve to a list type
      // E.g. in the relay Connection spec countOn would be the 'edges' field.
      countOn?: string;
    }> = [];

    const addCost = (cost: number, field: GraphQLField<any, any>) => {
      if (paginationStack.length === 0) {
        // if we are not within a pagination context we can just add stuff
        totalCost += cost;
      } else if (!paginationStack[paginationStack.length - 1].countOn) {
        // if we do not start counting on a sub-field we can just add the cost to the current stack
        paginationStack[paginationStack.length - 1].subCost += cost;
      } else {
        // This is kind off messed up logic, but I could not find out a better way.
        // subSelection.currentDepth is incremented as we go deeper into the stack
        // so if countOn is used the field should only be added to subCost
        // if currentDepth is equal to 1. If it is not equal to 1

        const last = paginationStack[paginationStack.length - 1];

        if (last.currentDepth > 1) {
          last.subCost += cost;
        } else if (last.currentDepth === 1 && last.countOn === field.name) {
          last.subCost += cost;
        } else if (paginationStack.length > 1) {
          paginationStack[paginationStack.length - 2].subCost += cost;
        } else {
          totalCost += cost;
        }
      }
    };

    const getCost = (
      queryComplexityFieldExtensions: Maybe<QueryComplexityFieldExtensions>,
      unwrappedFieldType: GraphQLNamedType
    ) => {
      if (queryComplexityFieldExtensions?.cost) {
        return queryComplexityFieldExtensions.cost;
      } else if (isScalarType(unwrappedFieldType)) {
        return fieldCosts.scalar;
      } else if (isEnumType(unwrappedFieldType)) {
        return fieldCosts.enum;
      } else if (isObjectType(unwrappedFieldType)) {
        return fieldCosts.object;
      } else if (isUnionType(unwrappedFieldType)) {
        return fieldCosts.union;
      } else if (isInterfaceType(unwrappedFieldType)) {
        return fieldCosts.interface;
      }
      // this case should actually never happen.
      return 0;
    };

    return {
      Field: {
        enter(fieldNode) {
          const field = context.getFieldDef();

          if (field == null) {
            return;
          }

          if (paginationStack.length > 0) {
            paginationStack[paginationStack.length - 1].currentDepth += 1;
          }

          // eslint-disable-next-line dot-notation
          const fieldExtensions = field.extensions?.['queryComplexity'] as Maybe<QueryComplexityFieldExtensions>;

          if (fieldExtensions?.additionalCost) {
            addCost(fieldExtensions.additionalCost, field);
          }

          if (fieldExtensions?.cost) {
            addCost(fieldExtensions.cost, field);
            return;
          }

          const unwrappedFieldType = unwrapGraphQLType(field.type);

          // eslint-disable-next-line dot-notation
          const fieldTypeExtensions = unwrappedFieldType.extensions?.['queryComplexity'] as Maybe<QueryComplexityTypeExtensions>;

          if (fieldTypeExtensions?.additionalCost) {
            addCost(fieldTypeExtensions.additionalCost, field);
          }

          if (fieldExtensions?.count) {
            const count = fieldExtensions.count(getArgumentValues(field, fieldNode, executionArgs.variableValues));

            paginationStack.push({
              fieldNode,
              count,
              subCost: 0,
              countOn: fieldExtensions?.countOn,
              currentDepth: 0,
            });

            if (fieldExtensions?.countOn === undefined) {
              addCost(getCost(fieldTypeExtensions, unwrappedFieldType), field);
            }

            return;
          }

          addCost(getCost(fieldTypeExtensions, unwrappedFieldType), field);
        },
        leave(fieldNode) {
          if (paginationStack.length > 0) {
            paginationStack[paginationStack.length - 1].currentDepth -= 1;
          }

          if (paginationStack.length === 0 || paginationStack[paginationStack.length - 1].fieldNode !== fieldNode) {
            return;
          }
          const record = paginationStack.pop()!;
          if (paginationStack.length) {
            paginationStack[paginationStack.length - 1].subCost += record.count * record.subCost;
          } else {
            totalCost += record.count * record.subCost;
          }
        },
      },
      Document: {
        leave() {
          params.reportTotalCost(totalCost, executionArgs);
        },
      },
    };
  };
};
