'use strict';

// Discriminating tests for the suffix (pre-release) comparison path.
//
// When two versions share major/minor/patch, Semver.isGreaterThan walks the
// dot-separated suffix tokens. A token pair that does not both parse as
// integers falls back to a *case-insensitive* string comparison in the Java
// original (String#compareToIgnoreCase). The existing suite only ever compares
// same-case identifiers (alpha/beta/rc), so it never distinguishes a
// case-insensitive ordering from JavaScript's default code-unit ordering, in
// which every uppercase letter sorts before every lowercase one.
//
// These cases use mixed-case identifiers where the two orderings disagree.

const { test } = require('node:test');
const assert = require('node:assert');

const { Semver } = require('../index');

test('isGreaterThan_mixed_case_suffix', () => {
  // beta > alpha, regardless of case
  assert.strictEqual(new Semver('1.0.0-Beta').isGreaterThan('1.0.0-alpha'), true);
  // rc > beta, across the first (non-numeric) token
  assert.strictEqual(new Semver('1.0.0-RC.1').isGreaterThan('1.0.0-beta.5'), true);
  // alpha < beta -> not greater
  assert.strictEqual(new Semver('1.0.0-Alpha').isGreaterThan('1.0.0-beta'), false);
});

test('isLowerThan_mixed_case_suffix', () => {
  assert.strictEqual(new Semver('1.0.0-alpha').isLowerThan('1.0.0-Beta'), true);
  assert.strictEqual(new Semver('1.0.0-beta.5').isLowerThan('1.0.0-RC.1'), true);
  // Beta is not lower than alpha
  assert.strictEqual(new Semver('1.0.0-Beta').isLowerThan('1.0.0-alpha'), false);
});

test('isGreaterThanOrEqualTo_mixed_case_suffix', () => {
  assert.strictEqual(new Semver('1.0.0-Beta').isGreaterThanOrEqualTo('1.0.0-alpha'), true);
  assert.strictEqual(new Semver('1.0.0-alpha').isGreaterThanOrEqualTo('1.0.0-Beta'), false);
});

test('compareTo_mixed_case_suffix', () => {
  assert.strictEqual(new Semver('1.0.0-Beta').compareTo(new Semver('1.0.0-alpha')), 1);
  assert.strictEqual(new Semver('1.0.0-alpha').compareTo(new Semver('1.0.0-Beta')), -1);
});

test('sort_mixed_case_suffix', () => {
  // Java case-insensitive order: alpha < Beta < RC. Code-unit order would
  // instead yield [Beta, RC, alpha] because 'B' < 'R' < 'a'.
  const list = [new Semver('1.0.0-RC'), new Semver('1.0.0-Beta'), new Semver('1.0.0-alpha')];
  list.sort((a, b) => a.compareTo(b));
  assert.deepStrictEqual(list.map((s) => s.getValue()), ['1.0.0-alpha', '1.0.0-Beta', '1.0.0-RC']);
});

test('same_case_ordering_preserved', () => {
  // Regression guard: the existing all-lowercase ordering is unchanged.
  assert.strictEqual(new Semver('1.0.0-beta').isGreaterThan('1.0.0-alpha'), true);
  assert.strictEqual(new Semver('1.0.0-rc.1').isGreaterThan('1.0.0-beta.11'), true);
});
