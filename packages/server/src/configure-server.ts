import {
  DocumentNode,
  execute,
  ExecutionResult,
  getOperationAST,
  GraphQLError,
  GraphQLFieldResolver,
  GraphQLSchema,
  GraphQLTypeResolver,
  parse,
  print,
  validate,
} from 'graphql';
import { EventsHandler, ServerProxy, PluginFn } from '@guildql/types';
import { processRequest } from 'graphql-helix';
import { Maybe } from 'graphql/jsutils/Maybe';
import hyperId from 'hyperid';
import { getResolversFromSchema } from '@graphql-tools/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import { composeResolvers } from '@graphql-tools/resolvers-composition';

const generateUuid = hyperId({ fixedLength: true });

export async function configureServer(options: { plugins: PluginFn[]; initialSchema?: GraphQLSchema; emitter?: EventsHandler }): Promise<ServerProxy> {
  const emitter = options.emitter || new EventsHandler();
  const api = {
    on: emitter.on.bind(emitter),
  };
  let initDone = false;
  let schema: GraphQLSchema | undefined | null = options.initialSchema;

  const replaceSchema = (newSchema: GraphQLSchema) => {
    schema = newSchema;

    if (initDone) {
      emitter.emit('schemaChange', {
        getSchema: () => schema,
      });
    }
  };

  for (const plugin of options.plugins) {
    await plugin(api);
  }

  const customParse: typeof parse = (source, options) => {
    let result: DocumentNode | Error = null;
    let parseFn: typeof parse = parse;

    emitter.emit('beforeOperationParse', {
      getParams: () => ({ source, options }),
      getParseFn: () => parseFn,
      setParsedDocument: document => {
        result = document;
      },
      setParseFn: newFn => {
        parseFn = newFn;
      },
    });

    if (result === null) {
      try {
        result = parseFn(source, options);
      } catch (e) {
        result = e;
      }
    }

    emitter.emit('afterOperationParse', {
      getParams: () => ({ source, options }),
      getParseResult: () => result,
      replaceParseResult: newResult => {
        result = newResult;
      },
    });

    if (result instanceof Error) {
      throw result;
    }

    return result;
  };

  const customValidate: typeof validate = (schema, documentAST, rules, typeInfo, options) => {
    let validateFn = validate;
    let result: readonly GraphQLError[] = null;
    // TODO: Get the origin documentAST as param here?
    const document = print(documentAST);
    const params = { schema, documentAST, rules, typeInfo, options, document };

    emitter.emit('beforeValidate', {
      getValidationParams: () => params,
      setValidationErrors: (errors: GraphQLError[]) => {
        result = errors;
      },
      setValidationFn: newFunc => {
        validateFn = newFunc;
      },
      getValidationFn: () => validateFn,
    });

    if (result === null) {
      result = validateFn(schema, documentAST, rules, typeInfo, options);
    }

    emitter.emit('afterValidate', {
      getValidationParams: () => params,
      getErrors: () => result,
      isValid: () => result.length === 0,
    });

    return result;
  };

  const customContextFactory: Parameters<typeof processRequest>[0]['contextFactory'] = async executionContext => {
    let context = Object.freeze({});

    emitter.emit('beforeContextBuilding', {
      getExecutionContext: () => executionContext,
      getCurrentContext: () => context,
      replaceContext: newContext => {
        context = newContext;
      },
    });

    emitter.emit('afterContextBuilding', {
      getContext: () => context,
    });

    return context;
  };

  const customExecute = async (
    schema: GraphQLSchema,
    document: DocumentNode,
    rootValue?: any,
    contextValue?: any,
    variableValues?: Maybe<{ [key: string]: any }>,
    operationName?: Maybe<string>,
    fieldResolver?: Maybe<GraphQLFieldResolver<any, any>>,
    typeResolver?: Maybe<GraphQLTypeResolver<any, any>>
  ): Promise<ExecutionResult> => {
    // TODO: Generate operationId in a more simple way, maybe when https://github.com/contrawork/graphql-helix/pull/21 gets in
    const operationId = generateUuid();
    let execDoc = document;
    let execRootValue = rootValue;
    let execContext = contextValue;
    let execVariablesValue = variableValues;
    let executeFn = execute;
    const actualOperationName = operationName || getOperationAST(execDoc).name?.value;

    emitter.emit('beforeExecute', {
      extendContext: (obj: unknown) => {
        if (typeof obj === 'object') {
          execContext = { ...(execContext || {}), ...obj };
        }

        throw new Error(`Invalid context extension provided! Expected "object", got: "${JSON.stringify(obj)}"`);
      },
      getOperationId: () => operationId,
      getExecutionParams: () => ({
        isIntrospection: actualOperationName === 'IntrospectionQuery',
        schema,
        document: execDoc,
        rootValue: execRootValue,
        contextValue: execContext,
        variableValues: execVariablesValue,
        operationName,
        fieldResolver,
        typeResolver,
      }),
      setExecuteFn: (newExecute: typeof execute) => {
        executeFn = newExecute;
      },
      setDocument: newDocument => {
        execDoc = newDocument;
      },
      setRootValue: newValue => {
        execRootValue = newValue;
      },
      setContext: newContext => {
        execContext = newContext;
      },
      setVariables: newVariables => {
        execVariablesValue = newVariables;
      },
    });

    const result = await executeFn(schema, execDoc, execRootValue, execContext, execVariablesValue, operationName, fieldResolver, typeResolver);

    emitter.emit('afterExecute', {
      getOperationId: () => operationId,
      getResult: () => result,
      getExecutionParams: () => ({
        isIntrospection: actualOperationName === 'IntrospectionQuery',
        schema,
        document: execDoc,
        rootValue: execRootValue,
        contextValue: execContext,
        variableValues: execVariablesValue,
        operationName,
        fieldResolver,
        typeResolver,
      }),
    });

    return result;
  };

  emitter.emit('onInit', {
    getOriginalSchema: () => schema,
    replaceSchema,
  });
  initDone = true;

  emitter.emit('beforeSchemaReady', {
    getSchema: () => schema,
    getOriginalSchema: () => schema,
    replaceSchema,
    wrapResolvers: wrapping => {
      const extractResolvers = getResolversFromSchema(schema);
      const newResolvers = composeResolvers(extractResolvers, wrapping);

      schema = addResolversToSchema({
        schema,
        resolvers: newResolvers,
      });
    },
  });

  return {
    parse: customParse,
    validate: customValidate,
    contextFactory: customContextFactory,
    execute: customExecute as any,
    schema,
  };
}
