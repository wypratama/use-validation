'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import useReactive from 'react-use-reactive';

const STANDARD_SCHEMA = '~standard';

/** @typedef {Record<string, any>} FormValue */
/** @typedef {Date | RegExp | Map<any, any> | Set<any> | WeakMap<object, any> | WeakSet<object> | Function} OpaqueValue */
/** @typedef {Record<PropertyKey, any>} ErrorBag */
/** @typedef {{ key: PropertyKey } | PropertyKey} IssuePathSegment */
/**
 * Error values mirror the shape of the form. Scalar fields end in string[]
 * while objects and arrays contain nested error values.
 *
 * @template T
 * @typedef {T extends OpaqueValue
 *   ? string[]
 *   : T extends readonly (infer U)[]
 *     ? (Array<ErrorTree<U> | undefined> & { _errors?: string[] })
 *     : T extends object
 *       ? ({ [K in keyof T]?: ErrorTree<T[K]> } & { _errors?: string[] })
 *       : string[]} ErrorTree
 */
/** @typedef {{ message: string, path?: readonly IssuePathSegment[] }} StandardIssue */
/** @typedef {{ issues?: readonly StandardIssue[] }} StandardResult */
/** @typedef {{ '~standard': { version: 1, vendor: string, validate: (value: unknown, options?: { libraryOptions?: Record<string, unknown> }) => StandardResult | Promise<StandardResult> } }} StandardSchema */
/** @typedef {boolean | string | undefined | Promise<boolean | string | undefined>} ValidatorResult */
/** @typedef {(value: any, form: FormValue) => ValidatorResult} Validator */
/**
 * Native validation mirrors nested object fields. Arrays are validated as a
 * whole value; array-item schemas are better expressed with Standard Schema.
 *
 * @template {object} T
 * @template {FormValue} Root
 * @typedef {{ [K in keyof T]?:
 *   T[K] extends OpaqueValue
 *     ? Record<string, (value: T[K], form: Root) => ValidatorResult>
 *     : T[K] extends readonly unknown[]
 *       ? Record<string, (value: T[K], form: Root) => ValidatorResult>
 *       : T[K] extends object
 *         ? ValidationRulesFor<T[K], Root>
 *         : Record<string, (value: T[K], form: Root) => ValidatorResult>
 * }} ValidationRulesFor
 */

/**
 * @param {unknown} value
 * @returns {value is object}
 */
const isObject = (value) => value !== null && typeof value === 'object';

/**
 * Only plain objects and arrays need recursive mutation observation.
 * Opaque values such as Date, Map, File and class instances must retain their
 * original identity and built-in behavior.
 *
 * @param {unknown} value
 * @returns {value is object}
 */
const isStructural = (value) => {
  if (Array.isArray(value)) return true;
  if (!isObject(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

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
 * @param {IssuePathSegment} segment
 * @returns {PropertyKey}
 */
const pathKey = (segment) => (
  isObject(segment) && 'key' in segment ? segment.key : segment
);

/**
 * @param {unknown} value
 * @returns {ErrorBag}
 */
const createErrorContainer = (value) => (
  Array.isArray(value) ? [] : Object.create(null)
);

/**
 * @param {ErrorBag} errors
 * @returns {boolean}
 */
const hasErrors = (errors) => Reflect.ownKeys(errors).length > 0;

/**
 * Add messages to an error tree while preserving the form's shape.
 * Schema issues at structural object/array paths use `_errors` so child
 * errors can coexist at the same path.
 *
 * @param {ErrorBag} errors
 * @param {FormValue} form
 * @param {readonly PropertyKey[]} path
 * @param {readonly string[]} messages
 */
const addErrors = (errors, form, path, messages) => {
  if (messages.length === 0) return;

  if (path.length === 0) {
    (errors._form ??= []).push(...messages);
    return;
  }

  /** @type {ErrorBag} */
  let cursor = errors;
  /** @type {any} */
  let currentValue = form;

  for (let index = 0; index < path.length; index += 1) {
    const key = path[index];
    const nextValue = isObject(currentValue) && Object.hasOwn(currentValue, key)
      ? Reflect.get(currentValue, key)
      : undefined;
    const last = index === path.length - 1;

    if (last) {
      if (isStructural(nextValue)) {
        const node = cursor[key] ??= createErrorContainer(nextValue);
        (node._errors ??= []).push(...messages);
      } else {
        (cursor[key] ??= []).push(...messages);
      }
      return;
    }

    const nextKey = path[index + 1];
    cursor = cursor[key] ??= (
      Array.isArray(nextValue) || typeof nextKey === 'number' ? [] : {}
    );
    currentValue = nextValue;
  }
};

/**
 * @param {readonly StandardIssue[]} issues
 * @param {FormValue} value
 * @returns {ErrorBag}
 */
const normalizeIssues = (issues = [], value) => {
  /** @type {ErrorBag} */
  const errors = Object.create(null);
  for (const issue of issues) {
    const path = (issue.path ?? []).map(pathKey);
    addErrors(errors, value, path, [String(issue.message)]);
  }
  return errors;
};

/**
 * @param {unknown} node
 * @returns {node is Record<string, Validator>}
 */
const isValidatorSet = (node) => {
  if (!isObject(node) || Array.isArray(node)) return false;
  const validators = Object.values(node);
  return validators.length > 0 && validators.every((item) => typeof item === 'function');
};

/**
 * @param {Record<string, any>} node
 * @param {any} value
 * @param {FormValue} form
 * @param {PropertyKey[]} path
 * @param {ErrorBag} errors
 * @returns {Promise<void>}
 */
const runRuleNode = async (node, value, form, path, errors) => {
  if (isValidatorSet(node)) {
    const messages = [];
    for (const validator of Object.values(node)) {
      const result = await validator(value, form);
      if (result !== true && result !== undefined) {
        messages.push(result === false ? 'Invalid value' : String(result));
      }
    }
    addErrors(errors, form, path, messages);
    return;
  }

  for (const [field, child] of Object.entries(node)) {
    if (!isObject(child)) continue;
    await runRuleNode(
      /** @type {Record<string, any>} */ (child),
      value?.[field],
      form,
      [...path, field],
      errors,
    );
  }
};

/**
 * @param {Record<string, any>} rules
 * @param {FormValue} value
 * @returns {Promise<ErrorBag>}
 */
const runRules = async (rules, value) => {
  /** @type {ErrorBag} */
  const errors = Object.create(null);
  await runRuleNode(rules, value, value, [], errors);
  return errors;
};

/**
 * @param {StandardSchema} schema
 * @param {FormValue} value
 * @returns {Promise<ErrorBag>}
 */
const runSchema = async (schema, value) => {
  const standard = schema?.[STANDARD_SCHEMA];
  if (
    !standard
    || standard.version !== 1
    || typeof standard.vendor !== 'string'
    || typeof standard.validate !== 'function'
  ) {
    throw new TypeError('schema must implement Standard Schema V1');
  }
  const result = await standard.validate(value);
  return normalizeIssues(result.issues, value);
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
  if (!isStructural(value)) return value;

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
 *   validate?: ValidationRulesFor<T, T>,
 *   schema?: StandardSchema
 * }} options
 * @returns {{
 *   value: T,
 *   errors: ErrorTree<T> & { _form?: string[] },
 *   valid: boolean,
 *   validating: boolean,
 *   validate: () => Promise<boolean>,
 *   reset: (nextInitialValue?: T) => void
 * }}
 */
const useValidation = ({ initialValue, validate: rules, schema }) => {
  if ((rules && schema) || (!rules && !schema)) {
    throw new TypeError('useValidation expects exactly one of validate or schema');
  }

  const initial = useRef(cloneInitial(initialValue));
  const value = useReactive(initialValue);
  /** @type {[ErrorBag, import('react').Dispatch<import('react').SetStateAction<ErrorBag>>]} */
  const [errors, setErrors] = useState(/** @type {ErrorBag} */ ({}));
  const [validating, setValidating] = useState(false);
  const activeRef = useRef(false);
  const validationId = useRef(0);
  const revalidationQueuedRef = useRef(false);

  const executeValidation = useCallback(async () => {
    const id = ++validationId.current;
    setValidating(true);
    try {
      const snapshot = cloneInitial(value);
      const nextErrors = schema
        ? await runSchema(schema, snapshot)
        : await runRules(
            /** @type {Record<string, any>} */ (rules ?? {}),
            /** @type {FormValue} */ (snapshot),
          );
      const valid = !hasErrors(nextErrors);
      const latest = id === validationId.current;
      if (latest) setErrors(nextErrors);
      return latest ? valid : false;
    } finally {
      if (id === validationId.current) setValidating(false);
    }
  }, [rules, schema, value]);

  const executeValidationRef = useRef(executeValidation);
  executeValidationRef.current = executeValidation;

  const validate = useCallback(async () => {
    activeRef.current = true;
    revalidationQueuedRef.current = false;
    return executeValidation();
  }, [executeValidation]);

  const onChange = useCallback(() => {
    if (!activeRef.current || revalidationQueuedRef.current) return;
    revalidationQueuedRef.current = true;
    queueMicrotask(() => {
      if (!revalidationQueuedRef.current) return;
      revalidationQueuedRef.current = false;
      if (!activeRef.current) return;
      void executeValidationRef.current().catch((error) => {
        console.error('[use-validation] automatic validation failed', error);
      });
    });
  }, []);

  const observedValue = useMemo(
    () => createObservedProxy(value, onChange),
    [onChange, value],
  );

  /** @param {T} [nextInitialValue] */
  const reset = useCallback((nextInitialValue) => {
    ++validationId.current;

    if (nextInitialValue !== undefined) {
      initial.current = cloneInitial(nextInitialValue);
    }

    for (const key of Reflect.ownKeys(value)) {
      if (!Object.hasOwn(initial.current, key)) {
        Reflect.deleteProperty(value, key);
      }
    }
    for (const key of Reflect.ownKeys(initial.current)) {
      Reflect.set(value, key, cloneInitial(Reflect.get(initial.current, key)));
    }

    activeRef.current = false;
    revalidationQueuedRef.current = false;
    setValidating(false);
    setErrors(Object.create(null));
  }, [value]);

  return {
    value: observedValue,
    errors: /** @type {any} */ (errors),
    valid: !hasErrors(errors),
    validating,
    validate,
    reset,
  };
};

export default useValidation;
