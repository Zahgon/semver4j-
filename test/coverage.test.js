'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  Semver,
  SemverType,
  VersionDiff,
  SemverException,
  Range,
  RangeOperator,
  Requirement,
  RequirementOperator,
  TokenType,
} = require('../index');

describe('CoverageTest', () => {
  test('isLowerThanOrEqualTo returns true for lower and equal, false for greater', () => {
    const v = new Semver('1.2.3');
    assert.strictEqual(v.isLowerThanOrEqualTo('1.2.4'), true);
    assert.strictEqual(v.isLowerThanOrEqualTo('1.2.3'), true);
    assert.strictEqual(v.isLowerThanOrEqualTo('1.2.2'), false);
    assert.strictEqual(v.isLowerThanOrEqualTo(new Semver('2.0.0')), true);
  });

  test('getOriginalValue preserves the untrimmed constructor argument', () => {
    const raw = '  1.2.3-BETA+sha  ';
    const v = new Semver(raw);
    assert.strictEqual(v.getOriginalValue(), raw);
    assert.strictEqual(v.getValue(), '1.2.3-BETA+sha');
  });

  test('RangeOperator.values lists all five operators', () => {
    const vals = RangeOperator.values();
    assert.deepStrictEqual(
      vals,
      [RangeOperator.EQ, RangeOperator.LT, RangeOperator.LTE, RangeOperator.GT, RangeOperator.GTE]
    );
  });

  test('VersionDiff.values lists all six diff kinds', () => {
    const vals = VersionDiff.values();
    assert.strictEqual(vals.length, 6);
    assert.deepStrictEqual(
      vals,
      [
        VersionDiff.NONE,
        VersionDiff.MAJOR,
        VersionDiff.MINOR,
        VersionDiff.PATCH,
        VersionDiff.SUFFIX,
        VersionDiff.BUILD,
      ]
    );
  });

  test('SemverType.toString returns the constant name', () => {
    assert.strictEqual(SemverType.NPM.toString(), 'NPM');
    assert.strictEqual(SemverType.STRICT.toString(), 'STRICT');
    assert.strictEqual(VersionDiff.MAJOR.toString(), 'MAJOR');
  });

  test('TokenType.toString returns the token name', () => {
    assert.strictEqual(TokenType.TILDE.toString(), 'TILDE');
    assert.strictEqual(TokenType.VERSION.toString(), 'VERSION');
  });

  test('RequirementOperator.toString returns the operator name', () => {
    assert.strictEqual(RequirementOperator.AND.toString(), 'AND');
    assert.strictEqual(RequirementOperator.OR.toString(), 'OR');
  });

  test('a unary operator with no operand exhausts the RPN iterator and raises', () => {
    // Tokenizes to a single GT with nothing to consume as its operand, so the
    // reverse-polish evaluator calls next() on an empty iterator. That path
    // raises NoSuchElementException internally, rethrown as SemverException.
    assert.throws(() => Requirement.buildNPM('>'), SemverException);
  });

  test('Range string constructor parses as LOOSE and is satisfiable', () => {
    const range = new Range('1.2.3', RangeOperator.GTE);
    assert.strictEqual(range.version.getType(), SemverType.LOOSE);
    assert.strictEqual(range.isSatisfiedBy('1.2.4'), true);
  });
});
