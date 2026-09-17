export default function useValidation<T extends object>({ initialValue, validate: rules, schema }: {
    initialValue: T;
    validate?: Partial<Record<keyof T, Record<string, (value: any, form: T) => boolean | string | undefined | Promise<boolean | string | undefined>>>>;
    schema?: {
        '~standard': {
            validate: (value: unknown) => any;
        };
    };
}): {
    value: T;
    errors: Partial<Record<keyof T | "_form", string[]>>;
    valid: boolean;
    dirty: boolean;
    validating: boolean;
    validate: () => Promise<boolean>;
    reset: () => void;
};
