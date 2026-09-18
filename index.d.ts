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
export type ValidatorSetFor<Value, Root extends FormValue> = Record<string, (value: Value, form: Root) => ValidatorResult>;
/**
 * A native rule node follows the value shape. Arrays can use $self for rules
 * on the complete array and $each for rules on every current item.
 */
export type ValidationNodeFor<Value, Root extends FormValue> = Value extends OpaqueValue ? ValidatorSetFor<Value, Root> : Value extends readonly (infer Item)[] ? ValidatorSetFor<Value, Root> | {
    $self?: ValidatorSetFor<Value, Root>;
    $each: ValidationNodeFor<Item, Root>;
} : Value extends object ? ValidationRulesFor<Value, Root> : ValidatorSetFor<Value, Root>;
export type ValidationRulesFor<T extends object, Root extends FormValue> = { [K in keyof T]?: ValidationNodeFor<T[K], Root>; };
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
