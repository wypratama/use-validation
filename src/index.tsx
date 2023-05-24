import { useEffect, useRef, useState } from "react";

type FormValidationConstructor<T> = {
  [key in keyof T]: {
    [key: string]: {
      validator: (value: any, formvalue: T) => boolean;
      message: string;
    };
  };
};

type FormErrorConstructor<A extends Record<string | symbol | number, any>> = { isError: boolean } & {
  [key in keyof A]: { constraint: string; message: string }[];
};



const useValidation = <T extends Record<string | symbol | number, any>>(
  state: T,
  validations: FormValidationConstructor<Partial<T>>,
) => {
  type ErrorObject = {
    [key in string | number]: any;
  } & {
    isError: boolean;
  };

  /**
   * 
   * 
   * store initial value into variable
   */
  const [formInput, setFormInput] = useState(state);

  /**
   * 
   * 
   * use dirty flag to prevent input being validated before initial submit
   */
  const dirty = useRef(false);

  //error collection
  //TODO:refactor
  const [errors, setErrors] = useState<FormErrorConstructor<T>>(() => {
    let errorObject: ErrorObject = {
      isError: false,
    };
    for (let key of Object.getOwnPropertyNames(state)) {
      errorObject[key] = [];
    }
    return errorObject as { isError: boolean } & {
      [key in keyof T]: { constraint: string; message: string }[];
    };
  });

  function runValidation(key: keyof T, value: any) {
    let errorList: any = {};
    for (let contraint in validations[key]) {
      const isValid = validations[key][contraint].validator(value, formInput);

      if (!isValid) {
        errorList[contraint] = {
          contraint,
          message: validations[key][contraint].message,
        };
      }
    }
    const { isError, ...listErrors } = errors;
    //@ts-ignore
    listErrors[key] = [...Object.values(errorList)];

    if (!dirty.current) return errors;
    return {
      isError: !Object.values(listErrors).every((el: any) => el.length === 0),
      ...listErrors,
    } as FormErrorConstructor<T>;
  }

  const setValue = (val: any) => {
    setFormInput({ ...formInput, ...val });
    reset();
  };

  const validate = () => {
    dirty.current = true;
    let listAll: any = {};
    for (const [key, value] of Object.entries(formInput)) {
      const a = runValidation(key, value);
      listAll[key] = a[key];
      listAll.isError = a.isError;
    }
    setErrors(listAll);
    return !listAll.isError;
  };

  const reset = () => {
    dirty.current = false;

    let errorObject: ErrorObject = {
      isError: false,
    };

    for (let key of Object.getOwnPropertyNames(state)) {
      errorObject[key] = [];
    }

    setErrors(errorObject as FormErrorConstructor<T>);
  };

  const handler: ProxyHandler<T> = {
    get(target: T, key: string) {
      /**
       * for now this implementation assumes form input will only be
       * a simple object with a key and primitive value pair
       * (no nested object/array)
       */
      return target[key];
    },
    set(target: T, key: string | number | symbol, value: any) {
      /**
       * here we can call function to validate user input
       * before calling setFromInput
       */

      const res = runValidation(key, value);
      setErrors(res);
      setFormInput({ ...target, [key]: value } as T);
      return true;
    },
  };

  const value = new Proxy<T>(formInput, handler);

  useEffect(() => {
    dirty.current = false;
  }, []);

  return {
    value,
    dirty: dirty.current,
    validate,
    errors,
    reset,
    setValue,
  };
};

export default useValidation;
