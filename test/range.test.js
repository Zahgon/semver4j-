'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');

const { Range, RangeOperator } = require('../index');

describe('RangeTest', () => {

test('isSatisfiedBy_EQ', () => {
  const range = new Range('1.2.3', RangeOperator.EQ);

  // SAME VERSION
  assert.strictEqual(range.isSatisfiedBy('1.2.3'), true);

  // GREATER
  assert.strictEqual(range.isSatisfiedBy('2.2.3'), false); // major
  assert.strictEqual(range.isSatisfiedBy('1.3.3'), false); // minor
  assert.strictEqual(range.isSatisfiedBy('1.2.4'), false); // patch

  // LOWER
  assert.strictEqual(range.isSatisfiedBy('0.2.3'), false); // major
  assert.strictEqual(range.isSatisfiedBy('1.1.3'), false); // minor
  assert.strictEqual(range.isSatisfiedBy('1.2.2'), false); // patch

  const rangeWithSuffix = new Range('1.2.3-alpha', RangeOperator.EQ);
  assert.strictEqual(rangeWithSuffix.isSatisfiedBy('1.2.3'), false); // null suffix
  assert.strictEqual(rangeWithSuffix.isSatisfiedBy('1.2.3-beta'), false); // non null suffix
});

test('isSatisfiedBy_LT', () => {
  const range = new Range('1.2.3', RangeOperator.LT);
  assert.strictEqual(range.isSatisfiedBy('1.2.3'), false);
  assert.strictEqual(range.isSatisfiedBy('1.2.4'), false);
  assert.strictEqual(range.isSatisfiedBy('1.2.2'), true);
});

test('isSatisfiedBy_LTE', () => {
  const range = new Range('1.2.3', RangeOperator.LTE);
  assert.strictEqual(range.isSatisfiedBy('1.2.3'), true);
  assert.strictEqual(range.isSatisfiedBy('1.2.4'), false);
  assert.strictEqual(range.isSatisfiedBy('1.2.2'), true);
});

test('isSatisfiedBy_GT', () => {
  const range = new Range('1.2.3', RangeOperator.GT);
  assert.strictEqual(range.isSatisfiedBy('1.2.3'), false);
  assert.strictEqual(range.isSatisfiedBy('1.2.2'), false);
  assert.strictEqual(range.isSatisfiedBy('1.2.4'), true);
});

test('isSatisfiedBy_GTE', () => {
  const range = new Range('1.2.3', RangeOperator.GTE);
  assert.strictEqual(range.isSatisfiedBy('1.2.3'), true);
  assert.strictEqual(range.isSatisfiedBy('1.2.2'), false);
  assert.strictEqual(range.isSatisfiedBy('1.2.4'), true);
});

test('prettyString', () => {
  assert.strictEqual(new Range('1.2.3', RangeOperator.EQ).toString(), '=1.2.3');
  assert.strictEqual(new Range('1.2.3', RangeOperator.LT).toString(), '<1.2.3');
  assert.strictEqual(new Range('1.2.3', RangeOperator.LTE).toString(), '<=1.2.3');
  assert.strictEqual(new Range('1.2.3', RangeOperator.GT).toString(), '>1.2.3');
  assert.strictEqual(new Range('1.2.3', RangeOperator.GTE).toString(), '>=1.2.3');
});

test('testEquals', () => {
  const range = new Range('1.2.3', RangeOperator.EQ);
  assert.ok(range.equals(range));
  assert.ok(!range.equals(null));
  assert.ok(!range.equals('string'));
  assert.ok(!range.equals(new Range('1.2.3', RangeOperator.GTE)));
  assert.ok(!range.equals(new Range('1.2.4', RangeOperator.EQ)));
});

test('testHashCode', () => {
  const range = new Range('1.2.3', RangeOperator.EQ);
  assert.strictEqual(range.hashCode(), range.hashCode());
  assert.notStrictEqual(range.hashCode(), new Range('1.2.3', RangeOperator.GTE).hashCode());
  assert.notStrictEqual(range.hashCode(), new Range('1.2.4', RangeOperator.EQ).hashCode());
});

});
