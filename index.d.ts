export default useValidation;
export type FormValue = Record<string, any>;
export type OpaqueValue = Date | RegExp | Map<any, any> | Set<any> | WeakMap<object, any> | WeakSet<object> | Function;
export type ErrorBag = Record<PropertyKey, any>;
export type IssuePathSegment = {
    key: PropertyKey;
} | PropertyKey;
/**
 * Error values mirror the shape of the form. Scalar fields end in string[]
 * while objects and arrays contain nested error values.
 */
export type ErrorTree<T> = T extends OpaqueValue ? string[] : T extends readonly (infer U)[] ? (Array<ErrorTree<U> | undefined> & {
    _errors?: string[];
}) : T extends object ? ({ [K in keyof T]?: ErrorTree<T[K]>; } & {
    _errors?: string[];
}) : string[];
export type StandardIssue = {
    message: string;
    path?: readonly IssuePathSegment[];
};
export type StandardResult = {
    issues?: readonly StandardIssue[];
};
export type StandardSchema = {
    "~standard": {
        version: 1;
        vendor: string;
        validate: (value: unknown, options?: {
            libraryOptions?: Record<string, unknown>;
        }) => StandardResult | Promise<StandardResult>;
    };
};
export type ValidatorResult = boolean | string | undefined | Promise<boolean | string | undefined>;
export type Validator = (value: any, form: FormValue) => ValidatorResult;
/**
 * Native validation mirrors nested object fields. Arrays are validated as a
 * whole value; array-item schemas are better expressed with Standard Schema.
 */
export type ValidationRulesFor<T extends object, Root extends FormValue> = { [K in keyof T]?: T[K] extends OpaqueValue ? Record<string, (value: T[K], form: Root) => ValidatorResult> : T[K] extends readonly unknown[] ? Record<string, (value: T[K], form: Root) => ValidatorResult> : T[K] extends object ? ValidationRulesFor<T[K], Root> : Record<string, (value: T[K], form: Root) => ValidatorResult>; };
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
declare function useValidation<T extends FormValue>({ initialValue, validate: rules, schema }: {
    initialValue: T;
    validate?: ValidationRulesFor<T, T>;
    schema?: StandardSchema;
}): {
    value: T;
    errors: ErrorTree<T> & {
        _form?: string[];
    };
    valid: boolean;
    validating: boolean;
    validate: () => Promise<boolean>;
    reset: (nextInitialValue?: T) => void;
};
