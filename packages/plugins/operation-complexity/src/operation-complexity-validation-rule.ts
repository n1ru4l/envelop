import {
  ExecutionArgs,
  GraphQLNamedType,
  GraphQLType,
  isEnumType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isUnionType,
} from 'graphql';
import { ExtendedValidationRule } from 'packages/plugins/extended-validation/src';

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

/** Symbol for retrieving the field costs from the context object. */
export const fieldCostsSymbol = Symbol('fieldCosts');

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

    return {
      Field() {
        const fieldDef = context.getFieldDef();

        if (fieldDef == null) {
          return;
        }

        // eslint-disable-next-line dot-notation
        if (typeof fieldDef.extensions?.['queryComplexity']?.['cost'] === 'number') {
          // eslint-disable-next-line dot-notation
          totalCost += fieldDef.extensions['queryComplexity']['cost'];
          return;
        }

        // TODO: how should we handle list fields without pagination?
        // It might make sense to only handle them POST this rule and not in a pre-computation
        // Maybe it might make sense to configure a default value for lists?
        // TODO: handle Connections/pagination
        const unwrappedFieldType = unwrapType(fieldDef.type);

        // eslint-disable-next-line dot-notation
        if (typeof unwrappedFieldType.extensions?.['queryComplexity']?.['cost'] === 'number') {
          // eslint-disable-next-line dot-notation
          totalCost += unwrappedFieldType.extensions['queryComplexity']['cost'];
        } else if (isScalarType(unwrappedFieldType)) {
          totalCost += fieldCosts.scalar;
        } else if (isEnumType(unwrappedFieldType)) {
          totalCost += fieldCosts.enum;
        } else if (isObjectType(unwrappedFieldType)) {
          totalCost += fieldCosts.object;
        } else if (isUnionType(unwrappedFieldType)) {
          totalCost += fieldCosts.union;
        } else if (isInterfaceType(unwrappedFieldType)) {
          totalCost += fieldCosts.interface;
        }
      },
      Document: {
        leave() {
          params.reportTotalCost(totalCost, executionArgs);
        },
      },
    };
  };
};

function unwrapType(type: GraphQLType): GraphQLNamedType {
  if (isNonNullType(type) || isListType(type)) {
    return unwrapType(type.ofType);
  }

  return type;
}
