'use strict';

/**
 * Mirrors com.vdurmont.semver4j.Semver.SemverType and Semver.VersionDiff.
 * Java enums are singletons; we model each constant as a frozen object with a
 * `name` and `ordinal`, plus a static `values()` returning them in declaration
 * order.
 */

class SemverType {
  constructor(name, ordinal) {
    this.name = name;
    this.ordinal = ordinal;
    Object.freeze(this);
  }

  toString() {
    return this.name;
  }
}

/**
 * The default type of version.
 * Major, minor and patch parts are required. Suffixes and build are optional.
 */
SemverType.STRICT = new SemverType('STRICT', 0);
/** Major part is required. Minor, patch, suffixes and build are optional. */
SemverType.LOOSE = new SemverType('LOOSE', 1);
/** Follows the rules of NPM. Supports ^, x, *, ~, and more. */
SemverType.NPM = new SemverType('NPM', 2);
/** Follows the rules of Cocoapods. */
SemverType.COCOAPODS = new SemverType('COCOAPODS', 3);
/** Follows the rules of ivy. Supports dynamic parts (eg: 4.2.+) and ranges. */
SemverType.IVY = new SemverType('IVY', 4);

SemverType.values = function () {
  return [
    SemverType.STRICT,
    SemverType.LOOSE,
    SemverType.NPM,
    SemverType.COCOAPODS,
    SemverType.IVY,
  ];
};

/** The types of diffs between two versions. Mirrors Semver.VersionDiff. */
class VersionDiff {
  constructor(name, ordinal) {
    this.name = name;
    this.ordinal = ordinal;
    Object.freeze(this);
  }

  toString() {
    return this.name;
  }
}

VersionDiff.NONE = new VersionDiff('NONE', 0);
VersionDiff.MAJOR = new VersionDiff('MAJOR', 1);
VersionDiff.MINOR = new VersionDiff('MINOR', 2);
VersionDiff.PATCH = new VersionDiff('PATCH', 3);
VersionDiff.SUFFIX = new VersionDiff('SUFFIX', 4);
VersionDiff.BUILD = new VersionDiff('BUILD', 5);

VersionDiff.values = function () {
  return [
    VersionDiff.NONE,
    VersionDiff.MAJOR,
    VersionDiff.MINOR,
    VersionDiff.PATCH,
    VersionDiff.SUFFIX,
    VersionDiff.BUILD,
  ];
};

module.exports = { SemverType, VersionDiff };
