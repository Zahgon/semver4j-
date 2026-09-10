'use strict';

const { SemverType, VersionDiff } = require('./semverType');
const { SemverException } = require('./semverException');
const {
  NumberFormatException,
  javaSplit,
  parseJavaInt,
  compareToIgnoreCase,
  javaTrim,
  replaceAllLiteral,
  javaStringHashCode,
} = require('./javaUtil');

/**
 * Mirrors com.vdurmont.semver4j.Semver.
 *
 * Semver is a tool that provides useful methods to manipulate versions that
 * follow the "semantic versioning" specification (see http://semver.org).
 *
 * The Java constructor leans heavily on JDK exception semantics: array
 * out-of-bounds vs. NumberFormatException drive separate control-flow
 * branches. JavaScript has neither, so we emulate the two exception classes
 * (IndexOutOfBounds is represented by an explicit bounds check that throws a
 * dedicated marker) precisely where Java relied on them.
 */

class IndexOutOfBoundsException extends Error {
  constructor(message) {
    super(message);
    this.name = 'IndexOutOfBoundsException';
  }
}

/** Reads element `i` of `arr`, throwing like Java's array access. */
function at(arr, i) {
  if (i < 0 || i >= arr.length) {
    throw new IndexOutOfBoundsException('Index ' + i + ' out of bounds for length ' + arr.length);
  }
  return arr[i];
}

class Semver {
  /**
   * new Semver(value)              -> STRICT
   * new Semver(value, type)
   */
  constructor(value, type = SemverType.STRICT) {
    this.originalValue = value;
    this.type = type;
    value = javaTrim(value);
    if (type === SemverType.NPM && (value.startsWith('v') || value.startsWith('V'))) {
      value = javaTrim(value.substring(1));
    }
    this.value = value;

    let tokens;
    if (this.hasPreRelease(value)) {
      tokens = javaSplit(value, '-', 2);
    } else {
      tokens = [value];
    }

    let build = null;
    let minor = null;
    let patch = null;

    try {
      let mainTokens;
      if (tokens.length === 1) {
        // The build version may be in the main tokens
        if (tokens[0].endsWith('+')) {
          throw new SemverException('The build cannot be empty.');
        }
        const tmp = javaSplit(tokens[0], '+');
        mainTokens = javaSplit(tmp[0], '.');
        if (tmp.length === 2) {
          build = tmp[1];
        }
      } else {
        mainTokens = javaSplit(tokens[0], '.');
      }

      // major
      try {
        this.major = parseJavaInt(at(mainTokens, 0));
      } catch (e) {
        if (e instanceof NumberFormatException || e instanceof IndexOutOfBoundsException) {
          throw new SemverException('Invalid version (no major version): ' + value);
        }
        throw e;
      }

      // minor
      try {
        minor = parseJavaInt(at(mainTokens, 1));
      } catch (e) {
        if (e instanceof IndexOutOfBoundsException) {
          if (type === SemverType.STRICT) {
            throw new SemverException('Invalid version (no minor version): ' + value);
          }
        } else if (e instanceof NumberFormatException) {
          const mt1 = mainTokens[1];
          if (type !== SemverType.NPM || (mt1.toLowerCase() !== 'x' && mt1 !== '*')) {
            throw new SemverException('Invalid version (no minor version): ' + value);
          }
        } else {
          throw e;
        }
      }

      // patch
      try {
        patch = parseJavaInt(at(mainTokens, 2));
      } catch (e) {
        if (e instanceof IndexOutOfBoundsException) {
          if (type === SemverType.STRICT) {
            throw new SemverException('Invalid version (no patch version): ' + value);
          }
        } else if (e instanceof NumberFormatException) {
          const mt2 = mainTokens[2];
          if (type !== SemverType.NPM || (mt2.toLowerCase() !== 'x' && mt2 !== '*')) {
            throw new SemverException('Invalid version (no patch version): ' + value);
          }
        } else {
          throw e;
        }
      }
    } catch (e) {
      // Java catches NumberFormatException / IndexOutOfBoundsException here and
      // rethrows as "The version is invalid". SemverExceptions propagate.
      if (e instanceof NumberFormatException || e instanceof IndexOutOfBoundsException) {
        throw new SemverException('The version is invalid: ' + value);
      }
      throw e;
    }

    this.minor = minor != null ? minor : null;
    this.patch = patch != null ? patch : null;

    let suffix = [];
    // The build version may be in the suffix tokens. Java wraps this in a
    // try/catch that swallows IndexOutOfBounds when tokens[1] is absent.
    if (tokens.length > 1 && tokens[1] !== undefined) {
      if (tokens[1].endsWith('+')) {
        throw new SemverException('The build cannot be empty.');
      }
      const tmp = javaSplit(tokens[1], '+');
      if (tmp.length === 2) {
        suffix = javaSplit(tmp[0], '.');
        build = tmp[1];
      } else {
        suffix = javaSplit(tokens[1], '.');
      }
    }
    this.suffixTokens = suffix;
    this.build = build;

    this.validate(type);
  }

  validate(type) {
    if (this.minor == null && type === SemverType.STRICT) {
      throw new SemverException('Invalid version (no minor version): ' + this.value);
    }
    if (this.patch == null && type === SemverType.STRICT) {
      throw new SemverException('Invalid version (no patch version): ' + this.value);
    }
  }

  hasPreRelease(version) {
    const firstIndexOfPlus = this.value.indexOf('+');
    const firstIndexOfHyphen = this.value.indexOf('-');
    if (firstIndexOfHyphen === -1) {
      return false;
    }
    return firstIndexOfPlus === -1 || firstIndexOfHyphen < firstIndexOfPlus;
  }

  satisfies(requirement) {
    const { Requirement } = require('./requirement');
    if (requirement instanceof Requirement) {
      return requirement.isSatisfiedBy(this);
    }
    // String overload
    let req;
    switch (this.type) {
      case SemverType.STRICT:
        req = Requirement.buildStrict(requirement);
        break;
      case SemverType.LOOSE:
        req = Requirement.buildLoose(requirement);
        break;
      case SemverType.NPM:
        req = Requirement.buildNPM(requirement);
        break;
      case SemverType.COCOAPODS:
        req = Requirement.buildCocoapods(requirement);
        break;
      case SemverType.IVY:
        req = Requirement.buildIvy(requirement);
        break;
      default:
        throw new SemverException('Invalid requirement type: ' + this.type);
    }
    return this.satisfies(req);
  }

  isGreaterThan(version) {
    if (typeof version === 'string') {
      return this.isGreaterThan(new Semver(version, this.getType()));
    }
    // Compare the main part
    if (this.getMajor() > version.getMajor()) return true;
    else if (this.getMajor() < version.getMajor()) return false;

    if (this.type === SemverType.NPM && version.getMinor() == null) return false;

    const otherMinor = version.getMinor() != null ? version.getMinor() : 0;
    if (this.getMinor() != null && this.getMinor() > otherMinor) return true;
    else if (this.getMinor() != null && this.getMinor() < otherMinor) return false;

    if (this.type === SemverType.NPM && version.getPatch() == null) return false;

    const otherPatch = version.getPatch() != null ? version.getPatch() : 0;
    if (this.getPatch() != null && this.getPatch() > otherPatch) return true;
    else if (this.getPatch() != null && this.getPatch() < otherPatch) return false;

    // Let's take a look at the suffix
    const tokens1 = this.getSuffixTokens();
    const tokens2 = version.getSuffixTokens();

    // If one of the versions has no suffix, it's greater!
    if (tokens1.length === 0 && tokens2.length > 0) return true;
    if (tokens2.length === 0 && tokens1.length > 0) return false;

    // Let's see if one of suffixes is greater than the other
    let i = 0;
    while (i < tokens1.length && i < tokens2.length) {
      let cmp;
      try {
        const t1 = parseJavaInt(tokens1[i]);
        const t2 = parseJavaInt(tokens2[i]);
        cmp = t1 - t2;
      } catch (e) {
        if (!(e instanceof NumberFormatException)) throw e;
        cmp = compareToIgnoreCase(tokens1[i], tokens2[i]);
      }
      if (cmp < 0) return false;
      else if (cmp > 0) return true;
      i++;
    }

    // If one of the versions has some remaining suffixes, it's greater
    return tokens1.length > tokens2.length;
  }

  isGreaterThanOrEqualTo(version) {
    if (typeof version === 'string') {
      return this.isGreaterThanOrEqualTo(new Semver(version, this.type));
    }
    return this.isGreaterThan(version) || this.isEquivalentTo(version);
  }

  isLowerThan(version) {
    if (typeof version === 'string') {
      return this.isLowerThan(new Semver(version, this.type));
    }
    return !this.isGreaterThan(version) && !this.isEquivalentTo(version);
  }

  isLowerThanOrEqualTo(version) {
    if (typeof version === 'string') {
      return this.isLowerThanOrEqualTo(new Semver(version, this.type));
    }
    return !this.isGreaterThan(version);
  }

  isEquivalentTo(version) {
    if (typeof version === 'string') {
      return this.isEquivalentTo(new Semver(version, this.type));
    }
    // Get versions without build
    const sem1 = this.getBuild() == null
      ? this
      : new Semver(replaceAllLiteral(this.getValue(), '+' + this.getBuild(), ''));
    const sem2 = version.getBuild() == null
      ? version
      : new Semver(replaceAllLiteral(version.getValue(), '+' + version.getBuild(), ''));
    return sem1.isEqualTo(sem2);
  }

  isEqualTo(version) {
    if (typeof version === 'string') {
      return this.isEqualTo(new Semver(version, this.type));
    }
    if (this.type === SemverType.NPM) {
      if (this.getMajor() !== version.getMajor()) return false;
      if (version.getMinor() == null) return true;
      if (version.getPatch() == null) return true;
    }
    return this.equals(version);
  }

  isStable() {
    return (this.getMajor() != null && this.getMajor() > 0) &&
      (this.getSuffixTokens() == null || this.getSuffixTokens().length === 0);
  }

  diff(version) {
    if (typeof version === 'string') {
      return this.diff(new Semver(version, this.type));
    }
    if (!objEq(this.major, version.getMajor())) return VersionDiff.MAJOR;
    if (!objEq(this.minor, version.getMinor())) return VersionDiff.MINOR;
    if (!objEq(this.patch, version.getPatch())) return VersionDiff.PATCH;
    if (!this.areSameSuffixes(version.getSuffixTokens())) return VersionDiff.SUFFIX;
    if (!objEq(this.build, version.getBuild())) return VersionDiff.BUILD;
    return VersionDiff.NONE;
  }

  areSameSuffixes(suffixTokens) {
    if (this.suffixTokens == null && suffixTokens == null) return true;
    else if (this.suffixTokens == null || suffixTokens == null) return false;
    else if (this.suffixTokens.length !== suffixTokens.length) return false;
    for (let i = 0; i < this.suffixTokens.length; i++) {
      if (this.suffixTokens[i] !== suffixTokens[i]) return false;
    }
    return true;
  }

  toStrict() {
    const minor = this.minor != null ? this.minor : 0;
    const patch = this.patch != null ? this.patch : 0;
    return Semver._create(SemverType.STRICT, this.major, minor, patch, this.suffixTokens, this.build);
  }

  withIncMajor(increment = 1) {
    return this.withInc(increment, 0, 0);
  }

  withIncMinor(increment = 1) {
    return this.withInc(0, increment, 0);
  }

  withIncPatch(increment = 1) {
    return this.withInc(0, 0, increment);
  }

  withInc(majorInc, minorInc, patchInc) {
    let minor = this.minor;
    let patch = this.patch;
    if (this.minor != null) {
      minor += minorInc;
    }
    if (this.patch != null) {
      patch += patchInc;
    }
    return this._withFlags(this.major + majorInc, minor, patch, true, true);
  }

  withClearedSuffix() {
    return this._withFlags(this.major, this.minor, this.patch, false, true);
  }

  withClearedBuild() {
    return this._withFlags(this.major, this.minor, this.patch, true, false);
  }

  withClearedSuffixAndBuild() {
    return this._withFlags(this.major, this.minor, this.patch, false, false);
  }

  withSuffix(suffix) {
    return this._withTokens(this.major, this.minor, this.patch, javaSplit(suffix, '.'), this.build);
  }

  withBuild(build) {
    return this._withTokens(this.major, this.minor, this.patch, this.suffixTokens, build);
  }

  nextMajor() {
    return this._withFlags(this.major + 1, 0, 0, false, false);
  }

  nextMinor() {
    return this._withFlags(this.major, this.minor + 1, 0, false, false);
  }

  nextPatch() {
    return this._withFlags(this.major, this.minor, this.patch + 1, false, false);
  }

  _withFlags(major, minor, patch, suffix, build) {
    minor = this.minor != null ? minor : null;
    patch = this.patch != null ? patch : null;
    const buildStr = build ? this.build : null;
    const suffixTokens = suffix ? this.suffixTokens : null;
    return Semver._create(this.type, major, minor, patch, suffixTokens, buildStr);
  }

  _withTokens(major, minor, patch, suffixTokens, build) {
    minor = this.minor != null ? minor : null;
    patch = this.patch != null ? patch : null;
    return Semver._create(this.type, major, minor, patch, suffixTokens, build);
  }

  static _create(type, major, minor, patch, suffix, build) {
    let sb = '' + major;
    if (minor != null) {
      sb += '.' + minor;
    }
    if (patch != null) {
      sb += '.' + patch;
    }
    if (suffix != null) {
      let first = true;
      for (const suffixToken of suffix) {
        if (first) {
          sb += '-';
          first = false;
        } else {
          sb += '.';
        }
        sb += suffixToken;
      }
    }
    if (build != null) {
      sb += '+' + build;
    }
    return new Semver(sb, type);
  }

  equals(o) {
    if (this === o) return true;
    if (!(o instanceof Semver)) return false;
    return this.value === o.value;
  }

  hashCode() {
    return javaStringHashCode(this.value);
  }

  compareTo(version) {
    if (this.isGreaterThan(version)) return 1;
    else if (this.isLowerThan(version)) return -1;
    return 0;
  }

  toString() {
    return this.getValue();
  }

  getOriginalValue() {
    return this.originalValue;
  }

  getValue() {
    return this.value;
  }

  getMajor() {
    return this.major;
  }

  getMinor() {
    return this.minor;
  }

  getPatch() {
    return this.patch;
  }

  getSuffixTokens() {
    return this.suffixTokens;
  }

  getBuild() {
    return this.build;
  }

  getType() {
    return this.type;
  }
}

/** Mirrors java.util.Objects.equals for the boxed Integer / String fields. */
function objEq(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a === b;
}

Semver.SemverType = SemverType;
Semver.VersionDiff = VersionDiff;

module.exports = { Semver };
