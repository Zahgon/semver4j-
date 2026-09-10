'use strict';

/**
 * Helpers that reproduce the exact Java standard-library semantics that the
 * semver4j source relies on. JavaScript's built-ins differ in subtle ways
 * (String.split trailing-empty handling, replace replacing only the first
 * match, loose number parsing, locale-insensitive comparisons), so we emulate
 * the JDK behaviour precisely.
 */

/** Mirrors java.lang.NumberFormatException (used only for control flow). */
class NumberFormatException extends Error {
  constructor(message) {
    super(message);
    this.name = 'NumberFormatException';
  }
}

/**
 * Mirrors java.lang.String#split(String regex[, int limit]) for a *literal*
 * separator (the Java source only ever splits on "-", "\\+" and "\\.").
 *
 * - limit > 0 : pattern applied at most limit-1 times.
 * - limit <= 0: applied as often as possible; with limit == 0 trailing empty
 *   strings are removed, *unless* no delimiter matched at all (then the whole
 *   string is returned verbatim, matching the JDK).
 */
function javaSplit(str, sep, limit = 0) {
  const parts = [];
  if (limit > 0) {
    let idx = 0;
    let count = 0;
    while (count < limit - 1) {
      const found = str.indexOf(sep, idx);
      if (found === -1) break;
      parts.push(str.substring(idx, found));
      idx = found + sep.length;
      count++;
    }
    parts.push(str.substring(idx));
    return parts;
  }

  let idx = 0;
  let matched = false;
  for (;;) {
    const found = str.indexOf(sep, idx);
    if (found === -1) {
      parts.push(str.substring(idx));
      break;
    }
    matched = true;
    parts.push(str.substring(idx, found));
    idx = found + sep.length;
  }
  if (limit === 0 && matched) {
    while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
  }
  return parts;
}

/**
 * Mirrors Integer.valueOf(String): strict parse, optional leading sign, digits
 * only. Throws NumberFormatException on anything else.
 */
function parseJavaInt(s) {
  if (s == null || !/^[+-]?[0-9]+$/.test(s)) {
    throw new NumberFormatException('For input string: "' + s + '"');
  }
  return parseInt(s, 10);
}

/** Mirrors java.lang.String#compareToIgnoreCase. */
function compareToIgnoreCase(s1, s2) {
  const n1 = s1.length;
  const n2 = s2.length;
  const min = Math.min(n1, n2);
  for (let i = 0; i < min; i++) {
    let c1 = s1.charCodeAt(i);
    let c2 = s2.charCodeAt(i);
    if (c1 !== c2) {
      const u1 = s1[i].toUpperCase().charCodeAt(0);
      const u2 = s2[i].toUpperCase().charCodeAt(0);
      if (u1 !== u2) {
        const l1 = String.fromCharCode(u1).toLowerCase().charCodeAt(0);
        const l2 = String.fromCharCode(u2).toLowerCase().charCodeAt(0);
        if (l1 !== l2) return l1 - l2;
      }
    }
  }
  return n1 - n2;
}

/** Mirrors java.lang.String#trim (strips chars with code point <= 0x20). */
function javaTrim(s) {
  let start = 0;
  let end = s.length;
  while (start < end && s.charCodeAt(start) <= 0x20) start++;
  while (end > start && s.charCodeAt(end - 1) <= 0x20) end--;
  return s.substring(start, end);
}

/** Replaces every literal occurrence of `target` (java String#replace). */
function replaceAllLiteral(str, target, replacement) {
  if (target === '') return str;
  return str.split(target).join(replacement);
}

/** Mirrors java.lang.String#hashCode. */
function javaStringHashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Mirrors java.util.Objects#hash / Arrays#hashCode for the given values. */
function objectsHash(...values) {
  let result = 1;
  for (const v of values) {
    let h;
    if (v == null) h = 0;
    else if (typeof v.hashCode === 'function') h = v.hashCode();
    else if (typeof v === 'number') h = v | 0;
    else h = javaStringHashCode(String(v));
    result = (Math.imul(31, result) + h) | 0;
  }
  return result;
}

/** Mirrors java.util.Objects#equals (null-safe, delegates to .equals). */
function objectsEquals(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a.equals === 'function') return a.equals(b);
  return a === b;
}

module.exports = {
  NumberFormatException,
  javaSplit,
  parseJavaInt,
  compareToIgnoreCase,
  javaTrim,
  replaceAllLiteral,
  javaStringHashCode,
  objectsHash,
  objectsEquals,
};
