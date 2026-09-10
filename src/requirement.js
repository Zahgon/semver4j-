'use strict';

const { SemverType } = require('./semverType');
const { Semver } = require('./semver');
const { Range, RangeOperator } = require('./range');
const { SemverException } = require('./semverException');
const { Tokenizer, Token, TokenType } = require('./tokenizer');
const { parseJavaInt, objectsEquals, objectsHash, NumberFormatException } = require('./javaUtil');

/**
 * Mirrors com.vdurmont.semver4j.Requirement.
 *
 * A requirement provides an easy way to check if a version is satisfying.
 */

class RequirementOperator {
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

RequirementOperator.AND = new RequirementOperator('AND', '');
RequirementOperator.OR = new RequirementOperator('OR', '||');

// Ivy regex patterns. Java uses Matcher#find (unanchored search), which JS
// RegExp#exec replicates when not sticky/global.
const IVY_DYNAMIC_PATCH_PATTERN = /(\d+)\.(\d+)\.\+/;
const IVY_DYNAMIC_MINOR_PATTERN = /(\d+)\.\+/;
const IVY_LATEST_PATTERN = /latest\.\w+/;
const IVY_MATH_BOUNDED_PATTERN = /(\[|\])([\d.]+),([\d.]+)(\[|\])/;
const IVY_MATH_LOWER_UNBOUNDED_PATTERN = /\(,([\d.]+)(\[|\])/;
const IVY_MATH_UPPER_UNBOUNDED_PATTERN = /(\[|\])([\d.]+),\)/;

class Requirement {
  /**
   * A requirement has to be a range or a combination of an operator and 2
   * other requirements.
   */
  constructor(range, req1, op, req2) {
    this.range = range != null ? range : null;
    this.req1 = req1 != null ? req1 : null;
    this.op = op != null ? op : null;
    this.req2 = req2 != null ? req2 : null;
  }

  /**
   * Builds a requirement (tests that the version is equivalent to the
   * requirement). Accepts a Semver.
   */
  static build(requirement) {
    return new Requirement(new Range(requirement, RangeOperator.EQ), null, null, null);
  }

  static buildStrict(requirement) {
    return Requirement.build(new Semver(requirement, SemverType.STRICT));
  }

  static buildLoose(requirement) {
    return Requirement.build(new Semver(requirement, SemverType.LOOSE));
  }

  static buildNPM(requirement) {
    if (requirement.length === 0) {
      requirement = '*';
    }
    return Requirement._buildWithTokenizer(requirement, SemverType.NPM);
  }

  static buildCocoapods(requirement) {
    return Requirement._buildWithTokenizer(requirement, SemverType.COCOAPODS);
  }

  static _buildWithTokenizer(requirement, type) {
    // Tokenize the string
    let tokens = Tokenizer.tokenize(requirement, type);

    tokens = Requirement._removeFalsePositiveVersionRanges(tokens);

    tokens = Requirement._addParentheses(tokens);

    // Transform the tokens list to a reverse polish notation list
    const rpn = Requirement._toReversePolishNotation(tokens);

    // Create the requirement tree by evaluating the rpn list
    return Requirement._evaluateReversePolishNotation(makeIterator(rpn), type);
  }

  static buildIvy(requirement) {
    try {
      return Requirement.buildLoose(requirement);
    } catch (e) {
      if (!(e instanceof SemverException)) throw e;
    }

    let matcher = IVY_DYNAMIC_PATCH_PATTERN.exec(requirement);
    if (matcher) {
      const major = parseInt(matcher[1], 10);
      const minor = parseInt(matcher[2], 10);
      const lower = new Requirement(new Range(major + '.' + minor + '.0', RangeOperator.GTE), null, null, null);
      const upper = new Requirement(new Range(major + '.' + (minor + 1) + '.0', RangeOperator.LT), null, null, null);
      return new Requirement(null, lower, RequirementOperator.AND, upper);
    }
    matcher = IVY_DYNAMIC_MINOR_PATTERN.exec(requirement);
    if (matcher) {
      const major = parseInt(matcher[1], 10);
      const lower = new Requirement(new Range(major + '.0.0', RangeOperator.GTE), null, null, null);
      const upper = new Requirement(new Range((major + 1) + '.0.0', RangeOperator.LT), null, null, null);
      return new Requirement(null, lower, RequirementOperator.AND, upper);
    }
    matcher = IVY_LATEST_PATTERN.exec(requirement);
    if (matcher) {
      return new Requirement(new Range('0.0.0', RangeOperator.GTE), null, null, null);
    }
    matcher = IVY_MATH_BOUNDED_PATTERN.exec(requirement);
    if (matcher) {
      const lowerOp = '[' === matcher[1] ? RangeOperator.GTE : RangeOperator.GT;
      const lowerVersion = new Semver(matcher[2], SemverType.LOOSE);
      const upperVersion = new Semver(matcher[3], SemverType.LOOSE);
      const upperOp = ']' === matcher[4] ? RangeOperator.LTE : RangeOperator.LT;
      const lower = new Requirement(new Range(Requirement._extrapolateVersion(lowerVersion), lowerOp), null, null, null);
      const upper = new Requirement(new Range(Requirement._extrapolateVersion(upperVersion), upperOp), null, null, null);
      return new Requirement(null, lower, RequirementOperator.AND, upper);
    }
    matcher = IVY_MATH_LOWER_UNBOUNDED_PATTERN.exec(requirement);
    if (matcher) {
      const version = new Semver(matcher[1], SemverType.LOOSE);
      const op = ']' === matcher[2] ? RangeOperator.LTE : RangeOperator.LT;
      return new Requirement(new Range(Requirement._extrapolateVersion(version), op), null, null, null);
    }
    matcher = IVY_MATH_UPPER_UNBOUNDED_PATTERN.exec(requirement);
    if (matcher) {
      const op = '[' === matcher[1] ? RangeOperator.GTE : RangeOperator.GT;
      const version = new Semver(matcher[2], SemverType.LOOSE);
      return new Requirement(new Range(Requirement._extrapolateVersion(version), op), null, null, null);
    }

    throw new SemverException('Invalid requirement');
  }

  /**
   * Return parenthesized expression, giving lowest priority to OR operator.
   */
  static _addParentheses(tokens) {
    const result = [];
    result.push(new Token(TokenType.OPENING, '('));
    for (const token of tokens) {
      if (token.type === TokenType.OR) {
        result.push(new Token(TokenType.CLOSING, ')'));
        result.push(token);
        result.push(new Token(TokenType.OPENING, '('));
      } else {
        result.push(token);
      }
    }
    result.push(new Token(TokenType.CLOSING, ')'));
    return result;
  }

  /**
   * Replaces false-positive version ranges ([VERSION, HYPHEN, VERSION] where
   * the trailing token is not a valid version) with a single version token.
   */
  static _removeFalsePositiveVersionRanges(tokens) {
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i];
      if (Requirement._thereIsFalsePositiveVersionRange(tokens, i)) {
        token = new Token(TokenType.VERSION, token.value + '-' + tokens[i + 2].value);
        i += 2;
      }
      result.push(token);
    }
    return result;
  }

  static _thereIsFalsePositiveVersionRange(tokens, i) {
    if (i + 2 >= tokens.length) {
      return false;
    }
    const suspiciousTokens = [tokens[i], tokens[i + 1], tokens[i + 2]];
    if (suspiciousTokens[0].type !== TokenType.VERSION) {
      return false;
    }
    if (suspiciousTokens[2].type !== TokenType.VERSION) {
      return false;
    }
    if (suspiciousTokens[1].type !== TokenType.HYPHEN) {
      return false;
    }
    return Requirement._attemptToParse(suspiciousTokens[2].value) == null;
  }

  static _attemptToParse(value) {
    try {
      return new Semver(value, SemverType.NPM);
    } catch (e) {
      if (!(e instanceof SemverException)) throw e;
    }
    return null;
  }

  /**
   * Adaptation of the shunting yard algorithm.
   */
  static _toReversePolishNotation(tokens) {
    // queue: LinkedList used with push() (prepends to head in Java). We
    // replicate by unshift() onto a JS array so iteration order matches.
    const queue = [];
    const stack = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      switch (token.type) {
        case TokenType.VERSION:
          queue.unshift(token);
          break;
        case TokenType.CLOSING:
          while (stack[stack.length - 1].type !== TokenType.OPENING) {
            queue.unshift(stack.pop());
          }
          stack.pop();
          if (stack.length > 0 && stack[stack.length - 1].type.isUnary()) {
            queue.unshift(stack.pop());
          }
          break;
        default:
          if (token.type.isUnary()) {
            // Push the operand first
            i++;
            queue.unshift(tokens[i]);
            // Then the operator
            queue.unshift(token);
          } else {
            stack.push(token);
          }
          break;
      }
    }

    while (stack.length > 0) {
      queue.unshift(stack.pop());
    }

    return queue;
  }

  /**
   * Evaluates a reverse polish notation token list.
   */
  static _evaluateReversePolishNotation(iterator, type) {
    try {
      const token = iterator.next();

      if (token.type === TokenType.VERSION) {
        if ('*' === token.value || (type === SemverType.NPM && 'latest' === token.value)) {
          // Special case for "*" and "latest" in NPM
          return new Requirement(new Range('0.0.0', RangeOperator.GTE), null, null, null);
        }
        const version = new Semver(token.value, type);
        if (version.getMinor() != null && version.getPatch() != null) {
          const range = new Range(version, RangeOperator.EQ);
          return new Requirement(range, null, null, null);
        } else {
          // Version with a wildcard char (like 1.2.x, 1.2.* or 1.2) -> tilde
          return Requirement.tildeRequirement(version.getValue(), type);
        }
      } else if (token.type === TokenType.HYPHEN) {
        const token3 = iterator.next(); // Note that token3 is before token2!
        const token2 = iterator.next();
        return Requirement.hyphenRequirement(token2.value, token3.value, type);
      } else if (token.type.isUnary()) {
        const token2 = iterator.next();

        let rangeOp;
        switch (token.type) {
          case TokenType.EQ:
            rangeOp = RangeOperator.EQ;
            break;
          case TokenType.LT:
            rangeOp = RangeOperator.LT;
            break;
          case TokenType.LTE:
            rangeOp = RangeOperator.LTE;
            break;
          case TokenType.GT:
            rangeOp = RangeOperator.GT;
            break;
          case TokenType.GTE:
            rangeOp = RangeOperator.GTE;
            break;
          case TokenType.TILDE:
            return Requirement.tildeRequirement(token2.value, type);
          case TokenType.CARET:
            return Requirement.caretRequirement(token2.value, type);
          default:
            throw new SemverException('Invalid requirement');
        }

        const range = new Range(token2.value, rangeOp);
        return new Requirement(range, null, null, null);
      } else {
        // They don't call it "reverse" for nothing
        const req2 = Requirement._evaluateReversePolishNotation(iterator, type);
        const req1 = Requirement._evaluateReversePolishNotation(iterator, type);

        let requirementOp;
        switch (token.type) {
          case TokenType.OR:
            requirementOp = RequirementOperator.OR;
            break;
          case TokenType.AND:
            requirementOp = RequirementOperator.AND;
            break;
          default:
            throw new SemverException('Invalid requirement');
        }

        return new Requirement(null, req1, requirementOp, req2);
      }
    } catch (e) {
      if (e instanceof NoSuchElementException) {
        throw new SemverException('Invalid requirement');
      }
      throw e;
    }
  }

  /**
   * Allows patch-level changes if a minor version is specified on the
   * comparator. Allows minor-level changes if not.
   */
  static tildeRequirement(version, type) {
    if (type !== SemverType.NPM && type !== SemverType.COCOAPODS) {
      throw new SemverException('The tilde requirements are only compatible with NPM and Cocoapods.');
    }
    const semver = new Semver(version, type);
    const req1 = new Requirement(new Range(Requirement._extrapolateVersion(semver), RangeOperator.GTE), null, null, null);

    let next;

    switch (type) {
      case SemverType.COCOAPODS: {
        if (semver.getPatch() != null) {
          next = semver.getMajor() + '.' + (semver.getMinor() + 1) + '.0';
        } else if (semver.getMinor() != null) {
          next = (semver.getMajor() + 1) + '.0.0';
        } else {
          return req1;
        }
        break;
      }
      case SemverType.NPM: {
        if (semver.getMinor() != null) {
          next = semver.getMajor() + '.' + (semver.getMinor() + 1) + '.0';
        } else {
          next = (semver.getMajor() + 1) + '.0.0';
        }
        break;
      }
      default:
        throw new SemverException('The tilde requirements are only compatible with NPM and Cocoapods.');
    }

    const req2 = new Requirement(new Range(next, RangeOperator.LT), null, null, null);

    return new Requirement(null, req1, RequirementOperator.AND, req2);
  }

  /**
   * Allows changes that do not modify the left-most non-zero digit in the
   * [major, minor, patch] tuple.
   */
  static caretRequirement(version, type) {
    if (type !== SemverType.NPM) {
      throw new SemverException('The caret requirements are only compatible with NPM.');
    }
    const semver = new Semver(version, type);
    const req1 = new Requirement(new Range(Requirement._extrapolateVersion(semver), RangeOperator.GTE), null, null, null);

    let next;
    if (semver.getMajor() === 0) {
      if (semver.getMinor() == null) {
        next = '1.0.0';
      } else if (semver.getMinor() === 0) {
        if (semver.getPatch() == null) {
          next = '0.1.0';
        } else {
          next = '0.0.' + (semver.getPatch() + 1);
        }
      } else {
        next = '0.' + (semver.getMinor() + 1) + '.0';
      }
    } else {
      next = (semver.getMajor() + 1) + '.0.0';
    }
    const req2 = new Requirement(new Range(next, RangeOperator.LT), null, null, null);

    return new Requirement(null, req1, RequirementOperator.AND, req2);
  }

  /**
   * Creates a requirement that satisfies "x1.y1.z1 - x2.y2.z2".
   */
  static hyphenRequirement(lowerVersion, upperVersion, type) {
    if (type !== SemverType.NPM) {
      throw new SemverException('The hyphen requirements are only compatible with NPM.');
    }
    const lower = Requirement._extrapolateVersion(new Semver(lowerVersion, type));
    let upper = new Semver(upperVersion, type);

    let upperOperator = RangeOperator.LTE;
    if (upper.getMinor() == null || upper.getPatch() == null) {
      upperOperator = RangeOperator.LT;
      if (upper.getMinor() == null) {
        upper = Requirement._extrapolateVersion(upper).withIncMajor();
      } else {
        upper = Requirement._extrapolateVersion(upper).withIncMinor();
      }
    }
    const req1 = new Requirement(new Range(lower, RangeOperator.GTE), null, null, null);
    const req2 = new Requirement(new Range(upper, upperOperator), null, null, null);

    return new Requirement(null, req1, RequirementOperator.AND, req2);
  }

  /**
   * Extrapolates the optional minor and patch numbers.
   * - 1 = 1.0.0
   * - 1.2 = 1.2.0
   * - 1.2.3 = 1.2.3
   */
  static _extrapolateVersion(semver) {
    let sb = '' + semver.getMajor() + '.' +
      (semver.getMinor() == null ? 0 : semver.getMinor()) + '.' +
      (semver.getPatch() == null ? 0 : semver.getPatch());
    let first = true;
    for (let i = 0; i < semver.getSuffixTokens().length; i++) {
      if (first) {
        sb += '-';
        first = false;
      } else {
        sb += '.';
      }
      sb += semver.getSuffixTokens()[i];
    }
    if (semver.getBuild() != null) {
      sb += '+' + semver.getBuild();
    }
    return new Semver(sb, semver.getType());
  }

  isSatisfiedBy(version) {
    if (typeof version === 'string') {
      if (this.range != null) {
        return this.isSatisfiedBy(new Semver(version, this.range.version.getType()));
      } else {
        return this.isSatisfiedBy(new Semver(version));
      }
    }

    if (this.range != null) {
      // We are on a leaf
      return this.range.isSatisfiedBy(version);
    } else {
      // We have several sub-requirements
      switch (this.op) {
        case RequirementOperator.AND: {
          try {
            const set = this._getAllRanges(this, []);
            for (const range of set) {
              if (!range.isSatisfiedBy(version)) {
                return false;
              }
            }
            if (version.getSuffixTokens().length > 0) {
              // Find the set of versions allowed to have prereleases.
              // ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0; that should allow
              // 1.2.3-pr.2 but NOT 1.2.4-alpha.notready.
              for (const range of set) {
                if (range.version == null) {
                  continue;
                }
                if (range.version.getSuffixTokens().length > 0) {
                  const allowed = range.version;
                  if (objEq(version.getMajor(), allowed.getMajor()) &&
                      objEq(version.getMinor(), allowed.getMinor()) &&
                      objEq(version.getPatch(), allowed.getPatch())) {
                    return true;
                  }
                }
              }
              // Version has a -pre, but it's not one of the ones we like.
              return false;
            }
            return true;
          } catch (e) {
            if (e instanceof RangeInAndError) {
              // Could be that we have an OR in AND - fallback to default test
              return this.req1.isSatisfiedBy(version) && this.req2.isSatisfiedBy(version);
            }
            throw e;
          }
        }
        case RequirementOperator.OR:
          return this.req1.isSatisfiedBy(version) || this.req2.isSatisfiedBy(version);
      }
      throw new Error('Code error. Unknown RequirementOperator: ' + this.op); // Should never happen
    }
  }

  _getAllRanges(requirement, res) {
    if (requirement.range != null) {
      res.push(requirement.range);
    } else if (requirement.op === RequirementOperator.AND) {
      this._getAllRanges(requirement.req1, res);
      this._getAllRanges(requirement.req2, res);
    } else {
      throw new RangeInAndError('OR in AND not allowed');
    }
    return res;
  }

  equals(o) {
    if (this === o) return true;
    if (!(o instanceof Requirement)) return false;
    return objectsEquals(this.range, o.range) &&
      objectsEquals(this.req1, o.req1) &&
      this.op === o.op &&
      objectsEquals(this.req2, o.req2);
  }

  hashCode() {
    return objectsHash(this.range, this.req1, this.op, this.req2);
  }

  toString() {
    if (this.range != null) {
      return this.range.toString();
    }
    return this.req1 + ' ' + (this.op === RequirementOperator.OR ? this.op.asString() + ' ' : '') + this.req2;
  }
}

/** Mirrors java.util.Objects.equals for the boxed Integer fields. */
function objEq(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a === b;
}

/** Mirrors java.util.NoSuchElementException from an exhausted iterator. */
class NoSuchElementException extends Error {
  constructor(message) {
    super(message);
    this.name = 'NoSuchElementException';
  }
}

/** Marker for the "OR in AND not allowed" RuntimeException path. */
class RangeInAndError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RangeInAndError';
  }
}

/** Builds an iterator whose next() throws NoSuchElementException when done. */
function makeIterator(arr) {
  let idx = 0;
  return {
    next() {
      if (idx >= arr.length) {
        throw new NoSuchElementException();
      }
      return arr[idx++];
    },
  };
}

Requirement.RequirementOperator = RequirementOperator;

module.exports = { Requirement, RequirementOperator };
