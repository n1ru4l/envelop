import { Plugin } from '@envelop/types';
import { Parser, ParseOptions } from 'graphql/language/parser';
import { Lexer } from 'graphql/language/lexer';

import {
  TokenKind,
  Kind,
  Source,
  DocumentNode,
  visit,
  FragmentDefinitionNode,
  InlineFragmentNode,
  ArgumentNode,
  TokenKindEnum,
  Token,
} from 'graphql';

declare module 'graphql/language/parser' {
  export class Parser {
    constructor(source: string | Source, options?: ParseOptions);
    _lexer: Lexer;
    expectOptionalKeyword(word: string): boolean;
    expectToken(token: TokenKindEnum): void;
    peek(token: TokenKindEnum): boolean;
    parseFragmentName(): string;
    parseArguments(flag: boolean): any;
    parseDirectives(flag: boolean): any;
    loc(start: Token): any;
    parseNamedType(): any;
    parseSelectionSet(): any;
    expectKeyword(keyword: string): void;
    parseVariableDefinitions(): void;
    parseDocument(): DocumentNode;
  }
}

class FragmentArgumentCompatible extends Parser {
  parseFragment() {
    const start = this._lexer.token;
    this.expectToken(TokenKind.SPREAD);
    const hasTypeCondition = this.expectOptionalKeyword('on');
    if (!hasTypeCondition && this.peek(TokenKind.NAME)) {
      const name = this.parseFragmentName();
      if (this.peek(TokenKind.PAREN_L)) {
        return {
          kind: Kind.FRAGMENT_SPREAD,
          name,
          arguments: this.parseArguments(false),
          directives: this.parseDirectives(false),
          loc: this.loc(start),
        };
      }
      return {
        kind: Kind.FRAGMENT_SPREAD,
        name: this.parseFragmentName(),
        directives: this.parseDirectives(false),
        loc: this.loc(start),
      };
    }
    return {
      kind: Kind.INLINE_FRAGMENT,
      typeCondition: hasTypeCondition ? this.parseNamedType() : undefined,
      directives: this.parseDirectives(false),
      selectionSet: this.parseSelectionSet(),
      loc: this.loc(start),
    };
  }

  parseFragmentDefinition() {
    const start = this._lexer.token;
    this.expectKeyword('fragment');
    const name = this.parseFragmentName();
    if (this.peek(TokenKind.PAREN_L)) {
      return {
        kind: Kind.FRAGMENT_DEFINITION,
        name,
        variableDefinitions: this.parseVariableDefinitions(),
        typeCondition: (this.expectKeyword('on'), this.parseNamedType()),
        directives: this.parseDirectives(false),
        selectionSet: this.parseSelectionSet(),
        loc: this.loc(start),
      };
    }

    return {
      kind: Kind.FRAGMENT_DEFINITION,
      name,
      typeCondition: (this.expectKeyword('on'), this.parseNamedType()),
      directives: this.parseDirectives(false),
      selectionSet: this.parseSelectionSet(),
      loc: this.loc(start),
    };
  }
}

function pimpedParse(source: string | Source, options?: ParseOptions): DocumentNode {
  const parser = new FragmentArgumentCompatible(source, options);
  return parser.parseDocument();
}

export const useFragmentArguments = (): Plugin => {
  return {
    onParse({ setParseFn }) {
      setParseFn(pimpedParse);

      return ({ result, replaceParseResult }) => {
        if (result && 'kind' in result) {
          replaceParseResult(applySelectionSetFragmentArguments(result));
        }
      };
    },
  };
};

function applySelectionSetFragmentArguments(document: DocumentNode): DocumentNode | Error {
  const fragmentList = new Map<string, FragmentDefinitionNode>();
  for (const def of document.definitions) {
    if (def.kind !== 'FragmentDefinition') {
      continue;
    }
    fragmentList.set(def.name.value, def);
  }

  return visit(document, {
    FragmentSpread(fragmentNode) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (fragmentNode.arguments != null && fragmentNode.arguments.length) {
        const fragmentDef = fragmentList.get(fragmentNode.name.value);
        if (!fragmentDef) {
          return;
        }

        const fragmentArguments = new Map<string, ArgumentNode>();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        for (const arg of fragmentNode.arguments) {
          fragmentArguments.set(arg.name.value, arg);
        }

        const selectionSet = visit(fragmentDef.selectionSet, {
          Variable(variableNode) {
            const fragArg = fragmentArguments.get(variableNode.name.value);
            if (fragArg) {
              return fragArg.value;
            }

            return variableNode;
          },
        });

        const inlineFragment: InlineFragmentNode = {
          kind: 'InlineFragment',
          typeCondition: fragmentDef.typeCondition,
          selectionSet,
        };

        return inlineFragment;
      }
      return fragmentNode;
    },
  });
}
