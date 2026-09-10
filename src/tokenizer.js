'use strict';

const { replaceAllLiteral } = require('./javaUtil');
const { SemverType } = require('./semverType');

/**
 * Mirrors com.vdurmont.semver4j.Tokenizer.
 * Converts an NPM/Cocoapods requirement string into a list of tokens.
 */

/**
 * The different types of tokens (unary operators, binary operators, delimiters
 * and versions). Mirrors Tokenizer.TokenType.
 */
class TokenType {
  constructor(name, character, unary, supportedTypes) {
    this.name = name;
    this.character = character; // Character or null
    this.unary = unary;
    this.supportedTypes = supportedTypes; // array of SemverType
  }

  isUnary() {
    return this.unary;
  }

  supports(type) {
    for (const t of this.supportedTypes) {
      if (t === type) return true;
    }
    return false;
  }

  toString() {
    return this.name;
  }
}

// Unary operators: ~ ^ = < <= > >=
TokenType.TILDE = new TokenType('TILDE', '~', true, [SemverType.COCOAPODS, SemverType.NPM]);
TokenType.CARET = new TokenType('CARET', '^', true, [SemverType.NPM]);
TokenType.EQ = new TokenType('EQ', '=', true, [SemverType.NPM]);
TokenType.LT = new TokenType('LT', '<', true, [SemverType.COCOAPODS, SemverType.NPM]);
TokenType.LTE = new TokenType('LTE', '\u2264', true, [SemverType.COCOAPODS, SemverType.NPM]);
TokenType.GT = new TokenType('GT', '>', true, [SemverType.COCOAPODS, SemverType.NPM]);
TokenType.GTE = new TokenType('GTE', '\u2265', true, [SemverType.COCOAPODS, SemverType.NPM]);

// Binary operators: - ||
TokenType.HYPHEN = new TokenType('HYPHEN', '-', false, [SemverType.NPM]);
TokenType.OR = new TokenType('OR', '|', false, [SemverType.NPM]);
TokenType.AND = new TokenType('AND', null, false, []);

// Delimiters: ( )
TokenType.OPENING = new TokenType('OPENING', '(', false, [SemverType.NPM]);
TokenType.CLOSING = new TokenType('CLOSING', ')', false, [SemverType.NPM]);

// Special
TokenType.VERSION = new TokenType('VERSION', null, false, []);

TokenType.values = function () {
  return [
    TokenType.TILDE, TokenType.CARET, TokenType.EQ, TokenType.LT, TokenType.LTE,
    TokenType.GT, TokenType.GTE, TokenType.HYPHEN, TokenType.OR, TokenType.AND,
    TokenType.OPENING, TokenType.CLOSING, TokenType.VERSION,
  ];
};

/**
 * A token in a requirement string. Has a type and a value if it is of type
 * VERSION. Mirrors Tokenizer.Token.
 */
class Token {
  constructor(type, value = null) {
    this.type = type;
    this.value = value;
  }

  append(c) {
    if (this.value == null) this.value = '';
    this.value += c;
  }
}

// SPECIAL_CHARS: Map<SemverType, Map<char, Token>>
const SPECIAL_CHARS = new Map();
for (const type of SemverType.values()) {
  SPECIAL_CHARS.set(type, new Map());
}
for (const tokenType of TokenType.values()) {
  if (tokenType.character != null) {
    for (const type of SemverType.values()) {
      if (tokenType.supports(type)) {
        SPECIAL_CHARS.get(type).set(tokenType.character, new Token(tokenType));
      }
    }
  }
}

/**
 * Takes a requirement string and creates a list of tokens.
 * Mirrors Tokenizer.tokenize.
 */
function tokenize(requirement, type) {
  const specialChars = SPECIAL_CHARS.get(type);

  // Replace the tokens made of 2 chars
  if (type === SemverType.COCOAPODS) {
    requirement = replaceAllLiteral(requirement, '~>', '~');
  } else if (type === SemverType.NPM) {
    requirement = replaceAllLiteral(requirement, '||', '|');
  }
  requirement = replaceAllLiteral(requirement, '<=', '\u2264');
  requirement = replaceAllLiteral(requirement, '>=', '\u2265');

  const tokens = [];
  let previousToken = null;

  const chars = Array.from(requirement);
  let token = null;
  for (const c of chars) {
    if (c === ' ') continue;

    if (specialChars.has(c)) {
      if (token != null) {
        tokens.push(token);
        previousToken = token;
        token = null;
      }

      const current = specialChars.get(c);
      if (current.type.isUnary() && previousToken != null && previousToken.type === TokenType.VERSION) {
        // Handling ranges like "≥1.2.3 <4.5.6" by inserting an "AND" operator
        tokens.push(new Token(TokenType.AND));
      }

      tokens.push(current);
      previousToken = current;
    } else {
      if (token == null) {
        token = new Token(TokenType.VERSION);
      }
      token.append(c);
    }
  }

  if (token != null) {
    tokens.push(token);
  }

  return tokens;
}

module.exports = { Tokenizer: { tokenize }, tokenize, Token, TokenType };
