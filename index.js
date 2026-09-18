'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import useReactive from 'react-use-reactive';

const STANDARD_SCHEMA = '~standard';

/** @typedef {Record<string, any>} FormValue */
/** @typedef {Record<string, string[]>} ErrorMap */
/** @typedef {{ key: PropertyKey } | PropertyKey} IssuePathSegment */
/** @typedef {{ message: string, path?: readonly IssuePathSegment[] }} StandardIssue */
/** @typedef {{ issues?: readonly StandardIssue[] }} StandardResult */
/** @typedef {{ '~standard': { validate: (value: unknown) => StandardResult | Promise<StandardResult> } }} StandardSchema */
/** @typedef {(value: any, form: FormValue) => boolean | string | undefined | Promise<boolean | string | undefined>} Validator */
/** @typedef {Record<string, Record<string, Validator>>} ValidationRules */

/**
 * @param {unknown} value
 * @returns {value is object}
 */
const isObject = (value) => value !== null && typeof value === 'object';

/**
 * Clone the initial plain data so reset is not affected by later mutations.
 * Opaque object values stay by reference, matching react-use-reactive's leaf semantics.
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
const cloneInitial = (value) => {
  if (Array.isArray(value)) {
    return /** @type {T} */ (value.map((item) => cloneInitial(item)));
  }
  if (!isObject(value)) return value;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;
  const copy = Object.create(proto);
  for (const key of Reflect.ownKeys(value)) {
    copy[key] = cloneInitial(Reflect.get(value, key));
  }
  return /** @type {T} */ (copy);
};

/**
 * @param {StandardIssue} issue
 * @returns {string}
 */
const firstPathKey = (issue) => {
  const segment = issue.path?.[0];
  if (segment === undefined) return '_form';
  if (isObject(segment) && 'key' in segment) return String(segment.key);
  return String(segment);
};

/**
 * @param {readonly StandardIssue[]} [issues]
 * @returns {ErrorMap}
 */
const normalizeIssues = (issues = []) => {
  /** @type {ErrorMap} */
  const errors = {};
  for (const issue of issues) {
    const key = firstPathKey(issue);
    (errors[key] ??= []).push(String(issue.message));
  }
  return errors;
};

/**
 * @param {ValidationRules} rules
 * @param {FormValue} value
 * @returns {Promise<ErrorMap>}
 */
const runRules = async (rules, value) => {
  /** @type {ErrorMap} */
  const errors = {};
  for (const [field, constraints] of Object.entries(rules)) {
    const messages = [];
    for (const validator of Object.values(constraints ?? {})) {
      const result = await validator(value[field], value);
      if (result !== true && result !== undefined) {
        messages.push(result === false ? 'Invalid value' : String(result));
      }
    }
    if (messages.length > 0) errors[field] = messages;
  }
  return errors;
};

/**
 * @param {StandardSchema} schema
 * @param {FormValue} value
 * @returns {Promise<ErrorMap>}
 */
const runSchema = async (schema, value) => {
  const standard = schema?.[STANDARD_SCHEMA];
  if (!standard || typeof standard.validate !== 'function') {
    throw new TypeError('schema must implement Standard Schema');
  }
  const result = await standard.validate(value);
  return normalizeIssues(result.issues);
};

/**
 * Add mutation observation around a reactive value without owning its state.
 *
 * @template T
 * @param {T} value
 * @param {() => void} onChange
 * @param {WeakMap<object, object>} [cache]
 * @returns {T}
 */
const createObservedProxy = (value, onChange, cache = new WeakMap()) => {
  if (!isObject(value)) return value;

  const cached = cache.get(value);
  if (cached) return /** @type {T} */ (cached);

  const proxy = new Proxy(value, {
    get(target, key, receiver) {
      return createObservedProxy(Reflect.get(target, key, receiver), onChange, cache);
    },
    set(target, key, next, receiver) {
      const result = Reflect.set(target, key, next, receiver);
      if (result) onChange();
      return result;
    },
    deleteProperty(target, key) {
      const had = Object.hasOwn(target, key);
      const result = Reflect.deleteProperty(target, key);
      if (result && had) onChange();
      return result;
    },
  });
  cache.set(value, proxy);
  return /** @type {T} */ (proxy);
};

/**
 * Creates a tiny reactive form value with validation.
 *
 * Pass either `validate` for inline validators or `schema` for any Standard
 * Schema implementation. Errors stay hidden until the first `validate()`;
 * after that, mutations automatically keep validation in sync.
 *
 * @template {FormValue} T
 * @param {{
 *   initialValue: T,
 *   validate?: Partial<Record<keyof T, Record<string, (value: any, form: T) => boolean|string|undefined|Promise<boolean|string|undefined>>>>,
 *   schema?: StandardSchema
 * }} options
 * @returns {{
 *   value: T,
 *   errors: ErrorMap,
 *   valid: boolean,
 *   dirty: boolean,
 *   validating: boolean,
 *   validate: () => Promise<boolean>,
 *   reset: () => void
 * }}
 */
const useValidation = ({ initialValue, validate: rules, schema }) => {
  if ((rules && schema) || (!rules && !schema)) {
    throw new TypeError('useValidation expects exactly one of validate or schema');
  }

  const initial = useRef(cloneInitial(initialValue));
  const value = useReactive(initialValue);
  /** @type {[ErrorMap, import('react').Dispatch<import('react').SetStateAction<ErrorMap>]} */
  const [errors, setErrors] = useState(/** @type {ErrorMap} */ ({}));
  const [dirty, setDirty] = useState(false);
  const [validating, setValidating] = useState(false);
  const dirtyRef = useRef(false);
  const validationId = useRef(0);

  const executeValidation = useCallback(async () => {
    const id = ++validationId.current;
    setValidating(true);
    try {
      const nextErrors = schema
        ? await runSchema(schema, value)
        : await runRules(
            /** @type {ValidationRules} */ (rules ?? {}),
            /** @type {FormValue} */ (value),
          );
      const valid = Object.keys(nextErrors).length === 0;
      if (id === validationId.current) setErrors(nextErrors);
      return valid;
    } finally {
      if (id === validationId.current) setValidating(false);
    }
  }, [rules, schema, value]);

  const validate = useCallback(async () => {
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      setDirty(true);
    }
    return executeValidation();
  }, [executeValidation]);

  const onChange = useCallback(() => {
    if (dirtyRef.current) void executeValidation();
  }, [executeValidation]);

  const observedValue = useMemo(
    () => createObservedProxy(value, onChange),
    [onChange, value],
  );

  const reset = useCallback(() => {
    ++validationId.current;
    for (const key of Reflect.ownKeys(value)) {
      if (!Object.hasOwn(initial.current, key)) {
        Reflect.deleteProperty(value, key);
      }
    }
    for (const key of Reflect.ownKeys(initial.current)) {
      Reflect.set(value, key, cloneInitial(Reflect.get(initial.current, key)));
    }
    dirtyRef.current = false;
    setDirty(false);
    setValidating(false);
    setErrors({});
  }, [value]);

  return {
    value: observedValue,
    errors,
    valid: Object.keys(errors).length === 0,
    dirty,
    validating,
    validate,
    reset,
  };
};

export default useValidation;
