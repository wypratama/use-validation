export default useValidation;
export type FormValue = Record<string, any>;
export type ErrorMap = Record<string, string[]>;
export type IssuePathSegment = {
    key: PropertyKey;
} | PropertyKey;
export type StandardIssue = {
    message: string;
    path?: readonly IssuePathSegment[];
};
export type StandardResult = {
    issues?: readonly StandardIssue[];
};
export type StandardSchema = {
    "~standard": {
        validate: (value: unknown) => StandardResult | Promise<StandardResult>;
    };
};
export type ValidatorResult = boolean | string | undefined | Promise<boolean | string | undefined>;
export type Validator = (value: any, form: FormValue) => ValidatorResult;
export type ValidationRules = Record<string, Record<string, Validator>>;
export type ValidationRulesFor<T extends FormValue> = { [K in keyof T]?: Record<string, (value: T[K], form: T) => ValidatorResult>; };
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
 *   validate?: ValidationRulesFor<T>,
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
declare function useValidation<T extends FormValue>({ initialValue, validate: rules, schema }: {
    initialValue: T;
    validate?: ValidationRulesFor<T>;
    schema?: StandardSchema;
}): {
    value: T;
    errors: ErrorMap;
    valid: boolean;
    dirty: boolean;
    validating: boolean;
    validate: () => Promise<boolean>;
    reset: () => void;
};
