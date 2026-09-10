'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const { Semver, SemverException, Requirement } = require('../index');
const SemverType = Semver.SemverType;
const VersionDiff = Semver.VersionDiff;

function assertIsSemver(semver, value, major, minor, patch, suffixTokens, build) {
  assert.strictEqual(semver.getValue(), value);
  assert.strictEqual(semver.getMajor(), major);
  assert.strictEqual(semver.getMinor(), minor);
  assert.strictEqual(semver.getPatch(), patch);
  assert.strictEqual(semver.getSuffixTokens().length, suffixTokens.length);
  for (let i = 0; i < suffixTokens.length; i++) {
    assert.strictEqual(semver.getSuffixTokens()[i], suffixTokens[i]);
  }
  assert.strictEqual(semver.getBuild(), build);
}

test('constructor_with_empty_build_fails', () => {
  assert.throws(() => new Semver('1.0.0+'), SemverException);
});

test('default_constructor_test_full_version', () => {
  const version = '1.2.3-beta.11+sha.0nsfgkjkjsdf';
  assertIsSemver(new Semver(version), version, 1, 2, 3, ['beta', '11'], 'sha.0nsfgkjkjsdf');
});

test('default_constructor_test_only_major_and_minor', () => {
  assert.throws(() => new Semver('1.2-beta.11+sha.0nsfgkjkjsdf'), SemverException);
});

test('default_constructor_test_only_major', () => {
  assert.throws(() => new Semver('1-beta.11+sha.0nsfgkjkjsdf'), SemverException);
});

test('npm_constructor_test_full_version', () => {
  const version = '1.2.3-beta.11+sha.0nsfgkjkjsdf';
  assertIsSemver(new Semver(version, SemverType.NPM), version, 1, 2, 3, ['beta', '11'], 'sha.0nsfgkjkjsdf');
});

test('npm_constructor_test_only_major_and_minor', () => {
  const version = '1.2-beta.11+sha.0nsfgkjkjsdf';
  assertIsSemver(new Semver(version, SemverType.NPM), version, 1, 2, null, ['beta', '11'], 'sha.0nsfgkjkjsdf');
});

test('npm_constructor_test_only_major', () => {
  const version = '1-beta.11+sha.0nsfgkjkjsdf';
  assertIsSemver(new Semver(version, SemverType.NPM), version, 1, null, null, ['beta', '11'], 'sha.0nsfgkjkjsdf');
});

test('npm_constructor_with_leading_v', () => {
  const version = 'v1.2.3-beta.11+sha.0nsfgkjkjsdf';
  assertIsSemver(new Semver(version, SemverType.NPM), '1.2.3-beta.11+sha.0nsfgkjkjsdf', 1, 2, 3, ['beta', '11'], 'sha.0nsfgkjkjsdf');

  const versionWithSpace = 'v 1.2.3-beta.11+sha.0nsfgkjkjsdf';
  assertIsSemver(new Semver(versionWithSpace, SemverType.NPM), '1.2.3-beta.11+sha.0nsfgkjkjsdf', 1, 2, 3, ['beta', '11'], 'sha.0nsfgkjkjsdf');
});

test('cocoapods_constructor_test_full_version', () => {
  const version = '1.2.3-beta.11+sha.0nsfgkjkjsdf';
  assertIsSemver(new Semver(version, SemverType.COCOAPODS), version, 1, 2, 3, ['beta', '11'], 'sha.0nsfgkjkjsdf');
});

test('cocoapods_constructor_test_only_major_and_minor', () => {
  const version = '1.2-beta.11+sha.0nsfgkjkjsdf';
  assertIsSemver(new Semver(version, SemverType.COCOAPODS), version, 1, 2, null, ['beta', '11'], 'sha.0nsfgkjkjsdf');
});

test('cocoapods_constructor_test_only_major', () => {
  const version = '1-beta.11+sha.0nsfgkjkjsdf';
  assertIsSemver(new Semver(version, SemverType.COCOAPODS), version, 1, null, null, ['beta', '11'], 'sha.0nsfgkjkjsdf');
});

test('loose_constructor_test_only_major_and_minor', () => {
  const version = '1.2-beta.11+sha.0nsfgkjkjsdf';
  assertIsSemver(new Semver(version, SemverType.LOOSE), version, 1, 2, null, ['beta', '11'], 'sha.0nsfgkjkjsdf');
});

test('loose_constructor_test_only_major', () => {
  const version = '1-beta.11+sha.0nsfgkjkjsdf';
  assertIsSemver(new Semver(version, SemverType.LOOSE), version, 1, null, null, ['beta', '11'], 'sha.0nsfgkjkjsdf');
});

test('default_constructor_test_myltiple_hyphen_signs', () => {
  const version = '1.2.3-beta.1-1.ab-c+sha.0nsfgkjkjs-df';
  assertIsSemver(new Semver(version), version, 1, 2, 3, ['beta', '1-1', 'ab-c'], 'sha.0nsfgkjkjs-df');
});

test('statisfies_works_will_all_the_types', () => {
  for (const type of SemverType.values()) {
    const semver = new Semver('1.2.3', type);
    assert.strictEqual(semver.satisfies('1.2.3'), true);
    assert.strictEqual(semver.satisfies('4.5.6'), false);
  }
});

test('isGreaterThan_test', () => {
  assert.strictEqual(new Semver('1.0.0-alpha.1').isGreaterThan('1.0.0-alpha'), true);
  assert.strictEqual(new Semver('1.0.0-alpha.beta').isGreaterThan('1.0.0-alpha.1'), true);
  assert.strictEqual(new Semver('1.0.0-beta').isGreaterThan('1.0.0-alpha.beta'), true);
  assert.strictEqual(new Semver('1.0.0-beta.2').isGreaterThan('1.0.0-beta'), true);
  assert.strictEqual(new Semver('1.0.0-beta.11').isGreaterThan('1.0.0-beta.2'), true);
  assert.strictEqual(new Semver('1.0.0-rc.1').isGreaterThan('1.0.0-beta.11'), true);
  assert.strictEqual(new Semver('1.0.0').isGreaterThan('1.0.0-rc.1'), true);

  assert.strictEqual(new Semver('1.0.0-alpha').isGreaterThan('1.0.0-alpha.1'), false);
  assert.strictEqual(new Semver('1.0.0-alpha.1').isGreaterThan('1.0.0-alpha.beta'), false);
  assert.strictEqual(new Semver('1.0.0-alpha.beta').isGreaterThan('1.0.0-beta'), false);
  assert.strictEqual(new Semver('1.0.0-beta').isGreaterThan('1.0.0-beta.2'), false);
  assert.strictEqual(new Semver('1.0.0-beta.2').isGreaterThan('1.0.0-beta.11'), false);
  assert.strictEqual(new Semver('1.0.0-beta.11').isGreaterThan('1.0.0-rc.1'), false);
  assert.strictEqual(new Semver('1.0.0-rc.1').isGreaterThan('1.0.0'), false);

  assert.strictEqual(new Semver('1.0.0').isGreaterThan('1.0.0'), false);
  assert.strictEqual(new Semver('1.0.0-alpha.12').isGreaterThan('1.0.0-alpha.12'), false);

  assert.strictEqual(new Semver('0.0.1').isGreaterThan('5.0.0'), false);
  assert.strictEqual(new Semver('1.0.0-alpha.12.ab-c').isGreaterThan('1.0.0-alpha.12.ab-c'), false);
});

test('isLowerThan_test', () => {
  assert.strictEqual(new Semver('1.0.0-alpha.1').isLowerThan('1.0.0-alpha'), false);
  assert.strictEqual(new Semver('1.0.0-alpha.beta').isLowerThan('1.0.0-alpha.1'), false);
  assert.strictEqual(new Semver('1.0.0-beta').isLowerThan('1.0.0-alpha.beta'), false);
  assert.strictEqual(new Semver('1.0.0-beta.2').isLowerThan('1.0.0-beta'), false);
  assert.strictEqual(new Semver('1.0.0-beta.11').isLowerThan('1.0.0-beta.2'), false);
  assert.strictEqual(new Semver('1.0.0-rc.1').isLowerThan('1.0.0-beta.11'), false);
  assert.strictEqual(new Semver('1.0.0').isLowerThan('1.0.0-rc.1'), false);

  assert.strictEqual(new Semver('1.0.0-alpha').isLowerThan('1.0.0-alpha.1'), true);
  assert.strictEqual(new Semver('1.0.0-alpha.1').isLowerThan('1.0.0-alpha.beta'), true);
  assert.strictEqual(new Semver('1.0.0-alpha.beta').isLowerThan('1.0.0-beta'), true);
  assert.strictEqual(new Semver('1.0.0-beta').isLowerThan('1.0.0-beta.2'), true);
  assert.strictEqual(new Semver('1.0.0-beta.2').isLowerThan('1.0.0-beta.11'), true);
  assert.strictEqual(new Semver('1.0.0-beta.11').isLowerThan('1.0.0-rc.1'), true);
  assert.strictEqual(new Semver('1.0.0-rc.1').isLowerThan('1.0.0'), true);

  assert.strictEqual(new Semver('1.0.0').isLowerThan('1.0.0'), false);
  assert.strictEqual(new Semver('1.0.0-alpha.12').isLowerThan('1.0.0-alpha.12'), false);
  assert.strictEqual(new Semver('1.0.0-alpha.12.x-yz').isLowerThan('1.0.0-alpha.12.x-yz'), false);
});

test('isEquivalentTo_isEqualTo_and_build', () => {
  const semver = new Semver('1.0.0+ksadhjgksdhgksdhgfj');
  const version2 = '1.0.0+sdgfsdgsdhsdfgdsfgf';
  assert.strictEqual(semver.isEqualTo(version2), false);
  assert.strictEqual(semver.isEquivalentTo(version2), true);
});

test('statisfies_calls_the_requirement', () => {
  let called = null;
  const req = new Requirement(null, null, null, null);
  req.isSatisfiedBy = (v) => { called = v; return true; };
  const semver = new Semver('1.2.2');
  semver.satisfies(req);
  assert.strictEqual(called, semver);
});

test('withIncMajor_test', () => {
  const semver = new Semver('1.2.3-Beta.4+SHA123456789');
  assert.strictEqual(semver.withIncMajor(2).isEqualTo('3.2.3-Beta.4+SHA123456789'), true);
});

test('withIncMinor_test', () => {
  const semver = new Semver('1.2.3-Beta.4+SHA123456789');
  assert.strictEqual(semver.withIncMinor(2).isEqualTo('1.4.3-Beta.4+SHA123456789'), true);
});

test('withIncPatch_test', () => {
  const semver = new Semver('1.2.3-Beta.4+SHA123456789');
  assert.strictEqual(semver.withIncPatch(2).isEqualTo('1.2.5-Beta.4+SHA123456789'), true);
});

test('withClearedSuffix_test', () => {
  const semver = new Semver('1.2.3-Beta.4+SHA123456789');
  assert.strictEqual(semver.withClearedSuffix().isEqualTo('1.2.3+SHA123456789'), true);
});

test('withClearedBuild_test', () => {
  const semver = new Semver('1.2.3-Beta.4+sha123456789');
  assert.strictEqual(semver.withClearedBuild().isEqualTo('1.2.3-Beta.4'), true);
});

test('withClearedBuild_test_multiple_hyphen_signs', () => {
  const semver = new Semver('1.2.3-Beta.4-test+sha12345-6789');
  assert.strictEqual(semver.withClearedBuild().isEqualTo('1.2.3-Beta.4-test'), true);
});

test('withClearedSuffixAndBuild_test', () => {
  const semver = new Semver('1.2.3-Beta.4+SHA123456789');
  assert.strictEqual(semver.withClearedSuffixAndBuild().isEqualTo('1.2.3'), true);
});

test('withSuffix_test_change_suffix', () => {
  const semver = new Semver('1.2.3-Alpha.4+SHA123456789');
  const result = semver.withSuffix('Beta.1');
  assert.strictEqual(result.toString(), '1.2.3-Beta.1+SHA123456789');
  assert.deepStrictEqual(result.getSuffixTokens(), ['Beta', '1']);
});

test('withSuffix_test_add_suffix', () => {
  const semver = new Semver('1.2.3+SHA123456789');
  const result = semver.withSuffix('Beta.1');
  assert.strictEqual(result.toString(), '1.2.3-Beta.1+SHA123456789');
  assert.deepStrictEqual(result.getSuffixTokens(), ['Beta', '1']);
});

test('withBuild_test_change_build', () => {
  const semver = new Semver('1.2.3-Alpha.4+SHA123456789');
  const result = semver.withBuild('SHA987654321');
  assert.strictEqual(result.toString(), '1.2.3-Alpha.4+SHA987654321');
  assert.strictEqual(result.getBuild(), 'SHA987654321');
});

test('withBuild_test_add_build', () => {
  const semver = new Semver('1.2.3-Alpha.4');
  const result = semver.withBuild('SHA987654321');
  assert.strictEqual(result.toString(), '1.2.3-Alpha.4+SHA987654321');
  assert.strictEqual(result.getBuild(), 'SHA987654321');
});

test('nextMajor_test', () => {
  const semver = new Semver('1.2.3-beta.4+sha123456789');
  assert.strictEqual(semver.nextMajor().isEqualTo('2.0.0'), true);
});

test('nextMinor_test', () => {
  const semver = new Semver('1.2.3-beta.4+sha123456789');
  assert.strictEqual(semver.nextMinor().isEqualTo('1.3.0'), true);
});

test('nextPatch_test', () => {
  const semver = new Semver('1.2.3-beta.4+sha123456789');
  assert.strictEqual(semver.nextPatch().isEqualTo('1.2.4'), true);
});

test('toStrict_test', () => {
  const versionGroups = [
    ['3.0.0-beta.4+sha123456789', '3.0-beta.4+sha123456789', '3-beta.4+sha123456789'],
    ['3.0.0+sha123456789', '3.0+sha123456789', '3+sha123456789'],
    ['3.0.0-beta.4', '3.0-beta.4', '3-beta.4'],
    ['3.0.0', '3.0', '3'],
  ];
  const types = [SemverType.NPM, SemverType.IVY, SemverType.LOOSE, SemverType.COCOAPODS];

  for (const versions of versionGroups) {
    const strict = new Semver(versions[0]);
    assert.ok(strict.equals(strict.toStrict()));
    for (const type of types) {
      for (const version of versions) {
        const sem = new Semver(version, type);
        assert.ok(strict.equals(sem.toStrict()),
          `${strict} != ${sem.toStrict()} (from ${version} / ${type})`);
      }
    }
  }
});

test('diff', () => {
  const sem = new Semver('1.2.3-beta.4+sha899d8g79f87');
  assert.strictEqual(sem.diff('1.2.3-beta.4+sha899d8g79f87'), VersionDiff.NONE);
  assert.strictEqual(sem.diff('2.3.4-alpha.5+sha32iddfu987'), VersionDiff.MAJOR);
  assert.strictEqual(sem.diff('1.3.4-alpha.5+sha32iddfu987'), VersionDiff.MINOR);
  assert.strictEqual(sem.diff('1.2.4-alpha.5+sha32iddfu987'), VersionDiff.PATCH);
  assert.strictEqual(sem.diff('1.2.3-alpha.4+sha32iddfu987'), VersionDiff.SUFFIX);
  assert.strictEqual(sem.diff('1.2.3-beta.5+sha32iddfu987'), VersionDiff.SUFFIX);
  assert.strictEqual(sem.diff('1.2.3-beta.4+sha32iddfu987'), VersionDiff.BUILD);
  assert.strictEqual(sem.diff('1.2.3-beta.4+sha899-d8g79f87'), VersionDiff.BUILD);
});

test('compareTo_test', () => {
  const array = [
    new Semver('1.2.3'),
    new Semver('1.2.3-rc3'),
    new Semver('1.2.3-rc2'),
    new Semver('1.2.3-rc1'),
    new Semver('1.2.2'),
    new Semver('1.2.2-rc2'),
    new Semver('1.2.2-rc1'),
    new Semver('1.2.0'),
  ];
  const len = array.length;
  const list = array.slice();
  list.sort((a, b) => a.compareTo(b));
  for (let i = 0; i < list.length; i++) {
    assert.ok(array[len - 1 - i].equals(list[i]));
  }
});

test('compareTo_without_path_or_minor', () => {
  assert.strictEqual(new Semver('1.2.3', SemverType.LOOSE).isGreaterThan('1.2'), true);
  assert.strictEqual(new Semver('1.3', SemverType.LOOSE).isGreaterThan('1.2.3'), true);
  assert.strictEqual(new Semver('1.2.3', SemverType.LOOSE).isGreaterThan('1'), true);
  assert.strictEqual(new Semver('2', SemverType.LOOSE).isGreaterThan('1.2.3'), true);
});

test('getValue_returns_the_original_value_trimmed_and_with_the_same_case', () => {
  const version = '  1.2.3-BETA.11+sHa.0nSFGKjkjsdf  ';
  assert.strictEqual(new Semver(version).getValue(), '1.2.3-BETA.11+sHa.0nSFGKjkjsdf');
});

test('compareTo_with_buildNumber', () => {
  const v3 = new Semver('1.24.1-rc3+903423.234');
  const v4 = new Semver('1.24.1-rc3+903423.235');
  assert.strictEqual(v3.compareTo(v4), 0);
});

test('isStable_test', () => {
  assert.strictEqual(new Semver('1.2.3+sHa.0nSFGKjkjsdf').isStable(), true);
  assert.strictEqual(new Semver('1.2.3').isStable(), true);
  assert.strictEqual(new Semver('1.2.3-BETA.11+sHa.0nSFGKjkjsdf').isStable(), false);
  assert.strictEqual(new Semver('0.1.2+sHa.0nSFGKjkjsdf').isStable(), false);
  assert.strictEqual(new Semver('0.1.2').isStable(), false);
});
