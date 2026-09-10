'use strict';

const { SemverType } = require('./semverType');
const { objectsEquals, objectsHash } = require('./javaUtil');

/**
 * Mirrors com.vdurmont.semver4j.Range.
 */

class RangeOperator {
  constructor(name, s) {
    this.name = name;
    this.s = s;
    Object.freeze(this);
  }

  asString() {
    return this.s;
  }

  toString() {
    return this.name;
  }
}

/** The version and the requirement are equivalent */
RangeOperator.EQ = new RangeOperator('EQ', '=');
/** The version is lower than the requirement */
RangeOperator.LT = new RangeOperator('LT', '<');
/** The version is lower than or equivalent to the requirement */
RangeOperator.LTE = new RangeOperator('LTE', '<=');
/** The version is greater than the requirement */
RangeOperator.GT = new RangeOperator('GT', '>');
/** The version is greater than or equivalent to the requirement */
RangeOperator.GTE = new RangeOperator('GTE', '>=');

RangeOperator.values = function () {
  return [
    RangeOperator.EQ,
    RangeOperator.LT,
    RangeOperator.LTE,
    RangeOperator.GT,
    RangeOperator.GTE,
  ];
};

class Range {
  /**
   * Two overloads (mirrors Java):
   *   new Range(Semver version, RangeOperator op)
   *   new Range(String version, RangeOperator op) -> parses as LOOSE
   */
  constructor(version, op) {
    // Lazy require to avoid circular dependency at module load time.
    const { Semver } = require('./semver');
    if (typeof version === 'string') {
      this.version = new Semver(version, SemverType.LOOSE);
    } else {
      this.version = version;
    }
    this.op = op;
  }

  isSatisfiedBy(version) {
    const { Semver } = require('./semver');
    if (typeof version === 'string') {
      return this.isSatisfiedBy(new Semver(version, this.version.getType()));
    }
    switch (this.op) {
      case RangeOperator.EQ:
        return version.isEquivalentTo(this.version);
      case RangeOperator.LT:
        return version.isLowerThan(this.version);
      case RangeOperator.LTE:
        return version.isLowerThan(this.version) || version.isEquivalentTo(this.version);
      case RangeOperator.GT:
        return version.isGreaterThan(this.version);
      case RangeOperator.GTE:
        return version.isGreaterThan(this.version) || version.isEquivalentTo(this.version);
    }
    throw new Error('Code error. Unknown RangeOperator: ' + this.op); // Should never happen
  }

  equals(o) {
    if (this === o) return true;
    if (!(o instanceof Range)) return false;
    return objectsEquals(this.version, o.version) && this.op === o.op;
  }

  hashCode() {
    return objectsHash(this.version, this.op);
  }

  toString() {
    return this.op.asString() + this.version;
  }
}

Range.RangeOperator = RangeOperator;

module.exports = { Range, RangeOperator };
