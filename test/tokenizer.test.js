'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const { Tokenizer, TokenType, Semver } = require('../index');
const SemverType = Semver.SemverType;

test('tokenize_NPM_tilde', () => {
  const tokens = Tokenizer.tokenize('~ 1.2.7', SemverType.NPM);
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0].type, TokenType.TILDE);
  assert.strictEqual(tokens[1].type, TokenType.VERSION);
  assert.strictEqual(tokens[1].value, '1.2.7');
});

test('tokenize_NPM_caret', () => {
  const tokens = Tokenizer.tokenize('^ 1.2.7   ', SemverType.NPM);
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0].type, TokenType.CARET);
  assert.strictEqual(tokens[1].type, TokenType.VERSION);
  assert.strictEqual(tokens[1].value, '1.2.7');
});

test('tokenize_NPM_lte', () => {
  const tokens = Tokenizer.tokenize('<=1.2.7', SemverType.NPM);
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0].type, TokenType.LTE);
  assert.strictEqual(tokens[1].type, TokenType.VERSION);
  assert.strictEqual(tokens[1].value, '1.2.7');
});

test('tokenize_NPM_lt', () => {
  const tokens = Tokenizer.tokenize('<1.2.7', SemverType.NPM);
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0].type, TokenType.LT);
  assert.strictEqual(tokens[1].type, TokenType.VERSION);
  assert.strictEqual(tokens[1].value, '1.2.7');
});

test('tokenize_NPM_gte', () => {
  const tokens = Tokenizer.tokenize('>=1.2.7', SemverType.NPM);
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0].type, TokenType.GTE);
  assert.strictEqual(tokens[1].type, TokenType.VERSION);
  assert.strictEqual(tokens[1].value, '1.2.7');
});

test('tokenize_NPM_gt', () => {
  const tokens = Tokenizer.tokenize('>1.2.7', SemverType.NPM);
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0].type, TokenType.GT);
  assert.strictEqual(tokens[1].type, TokenType.VERSION);
  assert.strictEqual(tokens[1].value, '1.2.7');
});

test('tokenize_NPM_eq', () => {
  const tokens = Tokenizer.tokenize('=1.2.7', SemverType.NPM);
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0].type, TokenType.EQ);
  assert.strictEqual(tokens[1].type, TokenType.VERSION);
  assert.strictEqual(tokens[1].value, '1.2.7');
});

test('tokenize_NPM_gte_major', () => {
  const tokens = Tokenizer.tokenize('>=1', SemverType.NPM);
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0].type, TokenType.GTE);
  assert.strictEqual(tokens[1].type, TokenType.VERSION);
  assert.strictEqual(tokens[1].value, '1');
});

test('tokenize_NPM_suffix', () => {
  const tokens = Tokenizer.tokenize('1.2.7-rc.1', SemverType.NPM);
  assert.strictEqual(tokens.length, 3);
  assert.strictEqual(tokens[0].type, TokenType.VERSION);
  assert.strictEqual(tokens[0].value, '1.2.7');
  assert.strictEqual(tokens[1].type, TokenType.HYPHEN);
  assert.strictEqual(tokens[2].type, TokenType.VERSION);
  assert.strictEqual(tokens[2].value, 'rc.1');
});

test('tokenize_NPM_or_suffix', () => {
  const tokens = Tokenizer.tokenize('1.2.7-rc.1 || 1.2.7-rc.2', SemverType.NPM);
  assert.strictEqual(tokens.length, 7);
  assert.strictEqual(tokens[0].type, TokenType.VERSION);
  assert.strictEqual(tokens[0].value, '1.2.7');
  assert.strictEqual(tokens[1].type, TokenType.HYPHEN);
  assert.strictEqual(tokens[2].type, TokenType.VERSION);
  assert.strictEqual(tokens[2].value, 'rc.1');
  assert.strictEqual(tokens[3].type, TokenType.OR);
  assert.strictEqual(tokens[4].type, TokenType.VERSION);
  assert.strictEqual(tokens[4].value, '1.2.7');
  assert.strictEqual(tokens[5].type, TokenType.HYPHEN);
  assert.strictEqual(tokens[6].type, TokenType.VERSION);
  assert.strictEqual(tokens[6].value, 'rc.2');
});

test('tokenize_NPM_or_hyphen', () => {
  const tokens = Tokenizer.tokenize('1.2.7 || 1.2.9 - 2.0.0', SemverType.NPM);
  assert.strictEqual(tokens.length, 5);
  assert.strictEqual(tokens[0].type, TokenType.VERSION);
  assert.strictEqual(tokens[0].value, '1.2.7');
  assert.strictEqual(tokens[1].type, TokenType.OR);
  assert.strictEqual(tokens[2].type, TokenType.VERSION);
  assert.strictEqual(tokens[2].value, '1.2.9');
  assert.strictEqual(tokens[3].type, TokenType.HYPHEN);
  assert.strictEqual(tokens[4].type, TokenType.VERSION);
  assert.strictEqual(tokens[4].value, '2.0.0');
});

test('tokenize_NPM_or_lte_parenthesis', () => {
  const tokens = Tokenizer.tokenize('1.2.7 || (<=1.2.9 || 2.0.0)', SemverType.NPM);
  assert.strictEqual(tokens.length, 8);
  assert.strictEqual(tokens[0].type, TokenType.VERSION);
  assert.strictEqual(tokens[0].value, '1.2.7');
  assert.strictEqual(tokens[1].type, TokenType.OR);
  assert.strictEqual(tokens[2].type, TokenType.OPENING);
  assert.strictEqual(tokens[3].type, TokenType.LTE);
  assert.strictEqual(tokens[4].type, TokenType.VERSION);
  assert.strictEqual(tokens[4].value, '1.2.9');
  assert.strictEqual(tokens[5].type, TokenType.OR);
  assert.strictEqual(tokens[6].type, TokenType.VERSION);
  assert.strictEqual(tokens[6].value, '2.0.0');
  assert.strictEqual(tokens[7].type, TokenType.CLOSING);
});

test('tokenize_NPM_or_and', () => {
  const tokens = Tokenizer.tokenize('>1.2.1 <1.2.8 || >2.0.0 <3.0.0', SemverType.NPM);
  assert.strictEqual(tokens.length, 11);
  assert.strictEqual(tokens[0].type, TokenType.GT);
  assert.strictEqual(tokens[1].type, TokenType.VERSION);
  assert.strictEqual(tokens[1].value, '1.2.1');
  assert.strictEqual(tokens[2].type, TokenType.AND);
  assert.strictEqual(tokens[3].type, TokenType.LT);
  assert.strictEqual(tokens[4].type, TokenType.VERSION);
  assert.strictEqual(tokens[4].value, '1.2.8');
  assert.strictEqual(tokens[5].type, TokenType.OR);
  assert.strictEqual(tokens[6].type, TokenType.GT);
  assert.strictEqual(tokens[7].type, TokenType.VERSION);
  assert.strictEqual(tokens[7].value, '2.0.0');
  assert.strictEqual(tokens[8].type, TokenType.AND);
  assert.strictEqual(tokens[9].type, TokenType.LT);
  assert.strictEqual(tokens[10].type, TokenType.VERSION);
  assert.strictEqual(tokens[10].value, '3.0.0');
});

test('tokenize_Cocoapods_tilde', () => {
  const tokens = Tokenizer.tokenize('~> 1.2.7', SemverType.COCOAPODS);
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0].type, TokenType.TILDE);
  assert.strictEqual(tokens[1].type, TokenType.VERSION);
  assert.strictEqual(tokens[1].value, '1.2.7');
});

test('tokenize_Cocoapods_lte', () => {
  const tokens = Tokenizer.tokenize('<=1.2.7', SemverType.COCOAPODS);
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0].type, TokenType.LTE);
  assert.strictEqual(tokens[1].type, TokenType.VERSION);
  assert.strictEqual(tokens[1].value, '1.2.7');
});
