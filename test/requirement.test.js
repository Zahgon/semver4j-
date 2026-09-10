'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');

const { Requirement, RequirementOperator, Range, RangeOperator, Semver } = require('../index');
const SemverType = Semver.SemverType;

function assertIsRange(requirement, version, operator) {
  assert.strictEqual(requirement.req1, null);
  assert.strictEqual(requirement.op, null);
  assert.strictEqual(requirement.req2, null);
  const range = requirement.range;
  assert.ok(range.version.isEquivalentTo(version));
  assert.strictEqual(range.op, operator);
}

function rangeTest4(req, lower, upper, upperStrict) {
  rangeTest5(req, lower, false, upper, upperStrict);
}

function rangeTest5(req, lower, lowerStrict, upper, upperStrict) {
  assert.strictEqual(req.range, null);
  assert.strictEqual(req.op, RequirementOperator.AND);

  const req1 = req.req1;
  const lowOp = lowerStrict ? RangeOperator.GT : RangeOperator.GTE;
  assert.strictEqual(req1.range.op, lowOp);
  assert.strictEqual(req1.range.version.getValue(), lower);

  const req2 = req.req2;
  const upOp = upperStrict ? RangeOperator.LT : RangeOperator.LTE;
  assert.strictEqual(req2.range.op, upOp);
  assert.strictEqual(req2.range.version.getValue(), upper);
}

function tildeTest(requirement, lower, upper, type) {
  const req = Requirement.tildeRequirement(requirement, type);
  rangeTest4(req, lower, upper, true);
}

function caretTest(requirement, lower, upper) {
  const req = Requirement.caretRequirement(requirement, SemverType.NPM);
  rangeTest4(req, lower, upper, true);
}

function hyphenTest(reqLower, reqUpper, lower, upper, upperStrict) {
  const req = Requirement.hyphenRequirement(reqLower, reqUpper, SemverType.NPM);
  rangeTest4(req, lower, upper, upperStrict);
}

describe('RequirementTest', () => {

test('buildStrict', () => {
  assertIsRange(Requirement.buildStrict('1.2.3'), '1.2.3', RangeOperator.EQ);
});

test('buildLoose', () => {
  assertIsRange(Requirement.buildLoose('0.27'), '0.27', RangeOperator.EQ);
});

test('buildNPM_with_a_full_version', () => {
  assertIsRange(Requirement.buildNPM('1.2.3'), '1.2.3', RangeOperator.EQ);
});

test('buildNPM_with_a_version_with_a_leading_v', () => {
  assertIsRange(Requirement.buildNPM('v1.2.3'), '1.2.3', RangeOperator.EQ);
  assertIsRange(Requirement.buildNPM('v 1.2.3'), '1.2.3', RangeOperator.EQ);
});

test('buildNPM_with_a_version_with_a_leading_equal', () => {
  assertIsRange(Requirement.buildNPM('=1.2.3'), '1.2.3', RangeOperator.EQ);
  assertIsRange(Requirement.buildNPM('= 1.2.3'), '1.2.3', RangeOperator.EQ);
});

test('buildNPM_with_a_range', () => {
  rangeTest4(Requirement.buildNPM('>=1.2.3 <4.5.6'), '1.2.3', '4.5.6', true);
});

test('buildNPM_with_a_OR_operator', () => {
  const req = Requirement.buildNPM('>=1.2.3 || >4.5.6');
  assert.strictEqual(req.range, null);
  assert.strictEqual(req.op, RequirementOperator.OR);

  const req1 = req.req1;
  assert.strictEqual(req1.range.op, RangeOperator.GTE);
  assert.strictEqual(req1.range.version.getValue(), '1.2.3');

  const req2 = req.req2;
  assert.strictEqual(req2.range.op, RangeOperator.GT);
  assert.strictEqual(req2.range.version.getValue(), '4.5.6');
});

test('buildNPM_with_OR_and_AND_operators', () => {
  const req = Requirement.buildNPM('>1.2.1 <1.2.8 || >2.0.0 <3.0.0');
  assert.strictEqual(req.range, null);
  assert.strictEqual(req.op, RequirementOperator.OR);

  const req1 = req.req1;
  assert.strictEqual(req1.range, null);
  assert.strictEqual(req1.op, RequirementOperator.AND);

  const req1_1 = req1.req1;
  assert.strictEqual(req1_1.op, null);
  assert.strictEqual(req1_1.range.op, RangeOperator.GT);
  assert.strictEqual(req1_1.range.version.getValue(), '1.2.1');

  const req1_2 = req1.req2;
  assert.strictEqual(req1_2.op, null);
  assert.strictEqual(req1_2.range.op, RangeOperator.LT);
  assert.strictEqual(req1_2.range.version.getValue(), '1.2.8');

  const req2 = req.req2;
  assert.strictEqual(req2.range, null);
  assert.strictEqual(req2.op, RequirementOperator.AND);

  const req2_1 = req2.req1;
  assert.strictEqual(req2_1.op, null);
  assert.strictEqual(req2_1.range.op, RangeOperator.GT);
  assert.strictEqual(req2_1.range.version.getValue(), '2.0.0');

  const req2_2 = req2.req2;
  assert.strictEqual(req2_2.op, null);
  assert.strictEqual(req2_2.range.op, RangeOperator.LT);
  assert.strictEqual(req2_2.range.version.getValue(), '3.0.0');
});

test('tildeRequirement_npm_full_version', () => {
  tildeTest('1.2.3', '1.2.3', '1.3.0', SemverType.NPM);
});

test('tildeRequirement_npm_only_major_and_minor', () => {
  tildeTest('1.2', '1.2.0', '1.3.0', SemverType.NPM);
  tildeTest('1.2.x', '1.2.0', '1.3.0', SemverType.NPM);
  tildeTest('1.2.*', '1.2.0', '1.3.0', SemverType.NPM);
});

test('tildeRequirement_npm_only_major', () => {
  tildeTest('1', '1.0.0', '2.0.0', SemverType.NPM);
  tildeTest('1.x', '1.0.0', '2.0.0', SemverType.NPM);
  tildeTest('1.x.x', '1.0.0', '2.0.0', SemverType.NPM);
  tildeTest('1.*', '1.0.0', '2.0.0', SemverType.NPM);
  tildeTest('1.*.*', '1.0.0', '2.0.0', SemverType.NPM);
});

test('tildeRequirement_npm_full_version_major_0', () => {
  tildeTest('0.2.3', '0.2.3', '0.3.0', SemverType.NPM);
});

test('tildeRequirement_npm_only_major_and_minor_with_major_0', () => {
  tildeTest('0.2', '0.2.0', '0.3.0', SemverType.NPM);
  tildeTest('0.2.x', '0.2.0', '0.3.0', SemverType.NPM);
  tildeTest('0.2.*', '0.2.0', '0.3.0', SemverType.NPM);
});

test('tildeRequirement_npm_only_major_with_major_0', () => {
  tildeTest('0', '0.0.0', '1.0.0', SemverType.NPM);
  tildeTest('0.x', '0.0.0', '1.0.0', SemverType.NPM);
  tildeTest('0.x.x', '0.0.0', '1.0.0', SemverType.NPM);
  tildeTest('0.*', '0.0.0', '1.0.0', SemverType.NPM);
  tildeTest('0.*.*', '0.0.0', '1.0.0', SemverType.NPM);
});

test('tildeRequirement_npm_with_suffix', () => {
  tildeTest('1.2.3-beta.2', '1.2.3-beta.2', '1.3.0', SemverType.NPM);
});

test('caretRequirement_npm_full_version', () => {
  caretTest('1.2.3', '1.2.3', '2.0.0');
});

test('caretRequirement_npm_full_version_with_major_0', () => {
  caretTest('0.2.3', '0.2.3', '0.3.0');
});

test('caretRequirement_npm_full_version_with_major_and_minor_0', () => {
  caretTest('0.0.3', '0.0.3', '0.0.4');
});

test('caretRequirement_npm_with_suffix', () => {
  caretTest('1.2.3-beta.2', '1.2.3-beta.2', '2.0.0');
});

test('caretRequirement_npm_with_major_and_minor_0_and_suffix', () => {
  caretTest('0.0.3-beta', '0.0.3-beta', '0.0.4');
});

test('caretRequirement_npm_without_patch', () => {
  caretTest('1.2', '1.2.0', '2.0.0');
  caretTest('1.2.x', '1.2.0', '2.0.0');
  caretTest('1.2.*', '1.2.0', '2.0.0');
});

test('caretRequirement_npm_with_only_major', () => {
  caretTest('1', '1.0.0', '2.0.0');
  caretTest('1.x', '1.0.0', '2.0.0');
  caretTest('1.x.x', '1.0.0', '2.0.0');
  caretTest('1.*', '1.0.0', '2.0.0');
  caretTest('1.*.*', '1.0.0', '2.0.0');
});

test('caretRequirement_npm_with_only_major_0', () => {
  caretTest('0', '0.0.0', '1.0.0');
  caretTest('0.x', '0.0.0', '1.0.0');
  caretTest('0.x.x', '0.0.0', '1.0.0');
  caretTest('0.*', '0.0.0', '1.0.0');
  caretTest('0.*.*', '0.0.0', '1.0.0');
});

test('caretRequirement_npm_without_patch_with_major_and_minor_0', () => {
  caretTest('0.0', '0.0.0', '0.1.0');
  caretTest('0.0.x', '0.0.0', '0.1.0');
  caretTest('0.0.*', '0.0.0', '0.1.0');
});

test('hyphenRequirement', () => {
  hyphenTest('1.2.3', '2.3.4', '1.2.3', '2.3.4', false);
});

test('hyphenRequirement_with_partial_lower_bound', () => {
  hyphenTest('1.2', '2.3.4', '1.2.0', '2.3.4', false);
  hyphenTest('1.2.x', '2.3.4', '1.2.0', '2.3.4', false);
  hyphenTest('1.2.*', '2.3.4', '1.2.0', '2.3.4', false);

  hyphenTest('1', '2.3.4', '1.0.0', '2.3.4', false);
  hyphenTest('1.x', '2.3.4', '1.0.0', '2.3.4', false);
  hyphenTest('1.x.x', '2.3.4', '1.0.0', '2.3.4', false);
  hyphenTest('1.*', '2.3.4', '1.0.0', '2.3.4', false);
  hyphenTest('1.*.*', '2.3.4', '1.0.0', '2.3.4', false);
});

test('hyphenRequirement_with_partial_upper_bound', () => {
  hyphenTest('1.2.3', '2.3', '1.2.3', '2.4.0', true);
  hyphenTest('1.2.3', '2.3.x', '1.2.3', '2.4.0', true);
  hyphenTest('1.2.3', '2.3.*', '1.2.3', '2.4.0', true);

  hyphenTest('1.2.3', '2', '1.2.3', '3.0.0', true);
  hyphenTest('1.2.3', '2.x', '1.2.3', '3.0.0', true);
  hyphenTest('1.2.3', '2.x.x', '1.2.3', '3.0.0', true);
  hyphenTest('1.2.3', '2.*', '1.2.3', '3.0.0', true);
  hyphenTest('1.2.3', '2.*.*', '1.2.3', '3.0.0', true);
});

test('buildNPM_with_hyphen', () => {
  const reqs = [
    Requirement.buildNPM('1.2.3-2.3.4'),
    Requirement.buildNPM('1.2.3 -2.3.4'),
    Requirement.buildNPM('1.2.3- 2.3.4'),
    Requirement.buildNPM('1.2.3 - 2.3.4'),
  ];
  for (const req of reqs) {
    rangeTest4(req, '1.2.3', '2.3.4', false);
  }
});

test('buildNPM_with_a_wildcard', () => {
  const req = Requirement.buildNPM('*');
  assert.strictEqual(req.op, null);
  assert.strictEqual(req.req1, null);
  assert.strictEqual(req.req2, null);
  assert.strictEqual(req.range.op, RangeOperator.GTE);
  assert.ok(new Semver('0.0.0').equals(req.range.version));
});

test('buildCocoapods_with_a_tilde', () => {
  const reqs = [
    Requirement.buildCocoapods(' ~> 1.2.3 '),
    Requirement.buildCocoapods(' ~> 1.2.3'),
    Requirement.buildCocoapods('~> 1.2.3 '),
    Requirement.buildCocoapods(' ~>1.2.3 '),
    Requirement.buildCocoapods('~>1.2.3 '),
    Requirement.buildCocoapods('~> 1.2.3'),
    Requirement.buildCocoapods('~>1.2.3'),
  ];
  for (const req of reqs) {
    rangeTest4(req, '1.2.3', '1.3.0', true);
  }
});

test('buildCocoapods_with_a_wildcard', () => {
  const req = Requirement.buildCocoapods('*');
  assert.strictEqual(req.op, null);
  assert.strictEqual(req.req1, null);
  assert.strictEqual(req.req2, null);
  assert.strictEqual(req.range.op, RangeOperator.GTE);
  assert.ok(new Semver('0.0.0').equals(req.range.version));
});

test('buildIvy_with_a_dynamic_patch', () => {
  const req = Requirement.buildIvy('1.2.+');
  assert.strictEqual(req.op, RequirementOperator.AND);
  assert.strictEqual(req.range, null);
  assertIsRange(req.req1, '1.2.0', RangeOperator.GTE);
  assertIsRange(req.req2, '1.3.0', RangeOperator.LT);
});

test('buildIvy_with_a_dynamic_minor', () => {
  const req = Requirement.buildIvy('1.+');
  assert.strictEqual(req.op, RequirementOperator.AND);
  assert.strictEqual(req.range, null);
  assertIsRange(req.req1, '1.0.0', RangeOperator.GTE);
  assertIsRange(req.req2, '2.0.0', RangeOperator.LT);
});

test('buildIvy_with_latest', () => {
  assertIsRange(Requirement.buildIvy('latest.integration'), '0.0.0', RangeOperator.GTE);
});

test('buildIvy_with_mathematical_bounded_ranges', () => {
  rangeTest5(Requirement.buildIvy('[1.0,2.0]'), '1.0.0', false, '2.0.0', false);
  rangeTest5(Requirement.buildIvy('[1.0,2.0['), '1.0.0', false, '2.0.0', true);
  rangeTest5(Requirement.buildIvy(']1.0,2.0]'), '1.0.0', true, '2.0.0', false);
  rangeTest5(Requirement.buildIvy(']1.0,2.0['), '1.0.0', true, '2.0.0', true);
});

test('buildIvy_with_mathematical_unbounded_ranges', () => {
  assertIsRange(Requirement.buildIvy('[1.0,)'), '1.0.0', RangeOperator.GTE);
  assertIsRange(Requirement.buildIvy(']1.0,)'), '1.0.0', RangeOperator.GT);
  assertIsRange(Requirement.buildIvy('(,2.0]'), '2.0.0', RangeOperator.LTE);
  assertIsRange(Requirement.buildIvy('(,2.0['), '2.0.0', RangeOperator.LT);
});

test('isSatisfiedBy_with_a_loose_type', () => {
  const req = Requirement.buildLoose('1.3.2');
  assert.strictEqual(req.isSatisfiedBy('0.27'), false);
  assert.strictEqual(req.isSatisfiedBy('1.3.2'), true);
  assert.strictEqual(req.isSatisfiedBy('1.5'), false);
});

test('isSatisfiedBy_with_a_complex_example', () => {
  const req = Requirement.buildNPM('1.x || >=2.5.0 || 5.0.0 - 7.2.3');
  assert.strictEqual(req.isSatisfiedBy('1.2.3'), true);
  assert.strictEqual(req.isSatisfiedBy('2.5.2'), true);
  assert.strictEqual(req.isSatisfiedBy('0.2.3'), false);
});

test('isSatisfiedBy_with_a_range', () => {
  let called = null;
  const range = new Range('1.2.3', RangeOperator.EQ);
  range.isSatisfiedBy = (v) => { called = v; return true; };
  const requirement = new Requirement(range, null, null, null);
  const version = new Semver('1.2.3');
  requirement.isSatisfiedBy(version);
  assert.strictEqual(called, version);
});

test('isSatisfiedBy_with_subRequirements_AND_first_is_true', () => {
  const version = new Semver('1.2.3');
  let c1 = null; let c2 = null;
  const req1 = new Requirement(null, null, null, null);
  req1.isSatisfiedBy = (v) => { c1 = v; return true; };
  const req2 = new Requirement(null, null, null, null);
  req2.isSatisfiedBy = (v) => { c2 = v; return true; };
  const requirement = new Requirement(null, req1, RequirementOperator.AND, req2);
  requirement.isSatisfiedBy(version);
  assert.strictEqual(c1, version);
  assert.strictEqual(c2, version);
});

test('isSatisfiedBy_with_subRequirements_AND_first_is_false', () => {
  const version = new Semver('1.2.3');
  let c1 = null; let c2Called = false;
  const req1 = new Requirement(null, null, null, null);
  req1.isSatisfiedBy = (v) => { c1 = v; return false; };
  const req2 = new Requirement(null, null, null, null);
  req2.isSatisfiedBy = () => { c2Called = true; return true; };
  const requirement = new Requirement(null, req1, RequirementOperator.AND, req2);
  requirement.isSatisfiedBy(version);
  assert.strictEqual(c1, version);
  assert.strictEqual(c2Called, false);
});

test('isSatisfiedBy_with_subRequirements_OR_first_is_true', () => {
  const version = new Semver('1.2.3');
  let c1 = null; let c2Called = false;
  const req1 = new Requirement(null, null, null, null);
  req1.isSatisfiedBy = (v) => { c1 = v; return true; };
  const req2 = new Requirement(null, null, null, null);
  req2.isSatisfiedBy = () => { c2Called = true; return true; };
  const requirement = new Requirement(null, req1, RequirementOperator.OR, req2);
  requirement.isSatisfiedBy(version);
  assert.strictEqual(c1, version);
  assert.strictEqual(c2Called, false);
});

test('isSatisfiedBy_with_subRequirements_OR_first_is_false', () => {
  const version = new Semver('1.2.3');
  let c1 = null; let c2 = null;
  const req1 = new Requirement(null, null, null, null);
  req1.isSatisfiedBy = (v) => { c1 = v; return false; };
  const req2 = new Requirement(null, null, null, null);
  req2.isSatisfiedBy = (v) => { c2 = v; return true; };
  const requirement = new Requirement(null, req1, RequirementOperator.OR, req2);
  requirement.isSatisfiedBy(version);
  assert.strictEqual(c1, version);
  assert.strictEqual(c2, version);
});

test('npm_isSatisfiedBy_with_an_empty_string', () => {
  const req = Requirement.buildNPM('');
  assert.strictEqual(req.isSatisfiedBy('1.2.3'), true);
  assert.strictEqual(req.isSatisfiedBy('2.5.2'), true);
  assert.strictEqual(req.isSatisfiedBy('0.2.3'), true);
});

test('isSatisfiedBy_with_a_star', () => {
  const req = Requirement.buildNPM('*');
  assert.strictEqual(req.isSatisfiedBy('1.2.3'), true);
  assert.strictEqual(req.isSatisfiedBy('2.5.2'), true);
  assert.strictEqual(req.isSatisfiedBy('0.2.3'), true);
});

test('isSatisfiedBy_with_latest', () => {
  const req = Requirement.buildNPM('latest');
  assert.strictEqual(req.isSatisfiedBy('1.2.3'), true);
  assert.strictEqual(req.isSatisfiedBy('2.5.2'), true);
  assert.strictEqual(req.isSatisfiedBy('0.2.3'), true);
});

test('tildeRequirement_cocoapods', () => {
  tildeTest('0.1.2', '0.1.2', '0.2.0', SemverType.COCOAPODS);
  tildeTest('1.1.2', '1.1.2', '1.2.0', SemverType.COCOAPODS);

  tildeTest('0.1', '0.1.0', '1.0.0', SemverType.COCOAPODS);
  tildeTest('1.1', '1.1.0', '2.0.0', SemverType.COCOAPODS);

  let req = Requirement.tildeRequirement('0', SemverType.COCOAPODS);
  assert.strictEqual(req.op, null);
  assert.strictEqual(req.range.op, RangeOperator.GTE);
  assert.ok(req.range.version.isEquivalentTo('0.0.0'));

  req = Requirement.tildeRequirement('1', SemverType.COCOAPODS);
  assert.strictEqual(req.op, null);
  assert.strictEqual(req.range.op, RangeOperator.GTE);
  assert.ok(req.range.version.isEquivalentTo('1.0.0'));
});

test('prettyString', () => {
  assert.strictEqual(Requirement.buildNPM('latest').toString(), '>=0.0.0');
  assert.strictEqual(Requirement.buildNPM('*').toString(), '>=0.0.0');
  assert.strictEqual(Requirement.buildNPM('1.*').toString(), '>=1.0.0 <2.0.0');
  assert.strictEqual(Requirement.buildNPM('1.x').toString(), '>=1.0.0 <2.0.0');
  assert.strictEqual(Requirement.buildNPM('1.0.0').toString(), '=1.0.0');
  assert.strictEqual(Requirement.buildNPM('=1.0.0').toString(), '=1.0.0');
  assert.strictEqual(Requirement.buildNPM('v1.0.0').toString(), '=1.0.0');
  assert.strictEqual(Requirement.buildNPM('<1.0.0').toString(), '<1.0.0');
  assert.strictEqual(Requirement.buildNPM('<=1.0.0').toString(), '<=1.0.0');
  assert.strictEqual(Requirement.buildNPM('>1.0.0').toString(), '>1.0.0');
  assert.strictEqual(Requirement.buildNPM('>=1.0.0').toString(), '>=1.0.0');
  assert.strictEqual(Requirement.buildNPM('~1.0.0').toString(), '>=1.0.0 <1.1.0');
  assert.strictEqual(Requirement.buildNPM('^1.0.0').toString(), '>=1.0.0 <2.0.0');
  assert.strictEqual(Requirement.buildNPM('1.x || >=2.5.0 || 5.0.0 - 7.2.3').toString(), '>=1.0.0 <2.0.0 || >=2.5.0 || >=5.0.0 <=7.2.3');

  assert.strictEqual(Requirement.buildCocoapods('~>1.2.0').toString(), '>=1.2.0 <1.3.0');

  assert.strictEqual(Requirement.buildIvy('[1.0,2.0]').toString(), '>=1.0.0 <=2.0.0');
  assert.strictEqual(Requirement.buildIvy('[1.0,2.0[').toString(), '>=1.0.0 <2.0.0');
  assert.strictEqual(Requirement.buildIvy(']1.0,2.0]').toString(), '>1.0.0 <=2.0.0');
  assert.strictEqual(Requirement.buildIvy(']1.0,2.0[').toString(), '>1.0.0 <2.0.0');
  assert.strictEqual(Requirement.buildIvy('[1.0,)').toString(), '>=1.0.0');
  assert.strictEqual(Requirement.buildIvy(']1.0,)').toString(), '>1.0.0');
  assert.strictEqual(Requirement.buildIvy('(,2.0]').toString(), '<=2.0.0');
  assert.strictEqual(Requirement.buildIvy('(,2.0[').toString(), '<2.0.0');
});

test('testEquals', () => {
  const requirement = Requirement.buildStrict('1.2.3');
  assert.ok(requirement.equals(requirement));
  assert.ok(requirement.equals(Requirement.buildStrict('1.2.3')));
  assert.ok(requirement.equals(Requirement.buildLoose('1.2.3')));
  assert.ok(requirement.equals(Requirement.buildNPM('=1.2.3')));
  assert.ok(requirement.equals(Requirement.buildIvy('1.2.3')));
  assert.ok(requirement.equals(Requirement.buildCocoapods('1.2.3')));
  assert.ok(!requirement.equals(null));
  assert.ok(!requirement.equals('string'));
  assert.ok(!requirement.equals(Requirement.buildStrict('1.2.4')));
  assert.ok(!requirement.equals(Requirement.buildNPM('>1.2.3')));
});

test('testHashCode', () => {
  const requirement = Requirement.buildStrict('1.2.3');
  assert.strictEqual(requirement.hashCode(), requirement.hashCode());
  assert.strictEqual(requirement.hashCode(), Requirement.buildStrict('1.2.3').hashCode());
  assert.strictEqual(requirement.hashCode(), Requirement.buildLoose('1.2.3').hashCode());
  assert.strictEqual(requirement.hashCode(), Requirement.buildNPM('=1.2.3').hashCode());
  assert.strictEqual(requirement.hashCode(), Requirement.buildIvy('1.2.3').hashCode());
  assert.strictEqual(requirement.hashCode(), Requirement.buildCocoapods('1.2.3').hashCode());
  assert.notStrictEqual(requirement.hashCode(), Requirement.buildStrict('1.2.4').hashCode());
  assert.notStrictEqual(requirement.hashCode(), Requirement.buildNPM('>1.2.3').hashCode());
});

});
