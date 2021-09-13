/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Parser } from 'graphql/language/parser';
import { TokenKind, Kind } from 'graphql';

export class FragmentArgumentCompatibleParser extends Parser {
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
          arguments: this.parseArguments(),
          directives: this.parseDirectives(),
          loc: this.loc(start),
        };
      }

      return {
        kind: Kind.FRAGMENT_SPREAD,
        name: this.parseFragmentName(),
        directives: this.parseDirectives(),
        loc: this.loc(start),
      };
    }

    return {
      kind: Kind.INLINE_FRAGMENT,
      typeCondition: hasTypeCondition ? this.parseNamedType() : undefined,
      directives: this.parseDirectives(),
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
        directives: this.parseDirectives(),
        selectionSet: this.parseSelectionSet(),
        loc: this.loc(start),
      };
    }

    return {
      kind: Kind.FRAGMENT_DEFINITION,
      name,
      typeCondition: (this.expectKeyword('on'), this.parseNamedType()),
      directives: this.parseDirectives(),
      selectionSet: this.parseSelectionSet(),
      loc: this.loc(start),
    };
  }
}
