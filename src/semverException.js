'use strict';

/** Mirrors com.vdurmont.semver4j.SemverException (a RuntimeException). */
class SemverException extends Error {
  constructor(msg, cause) {
    super(msg);
    this.name = 'SemverException';
    if (cause !== undefined) this.cause = cause;
  }
}

module.exports = { SemverException };
