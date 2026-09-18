import * as yup from 'yup';
import { z } from 'zod';
import useValidation from '../index.js';

const inline = useValidation({
  initialValue: { email: '', age: 0 },
  validate: {
    email: {
      required(value, form) {
        value.toUpperCase();
        form.age.toFixed();
        return Boolean(value) || 'Required';
      },
    },
    age: {
      adult(value) {
        value.toFixed();
        return value >= 18 || 'Adult only';
      },
    },
  },
});

inline.value.email = 'me@example.com';
inline.value.age = 20;

// @ts-expect-error email remains a string
inline.value.email = 42;

// @ts-expect-error age remains a number
inline.value.age = '20';

const zodForm = useValidation({
  initialValue: { email: '' },
  schema: z.object({ email: z.string().email() }),
});
zodForm.value.email = 'zod@example.com';

const yupForm = useValidation({
  initialValue: { email: '' },
  schema: yup.object({ email: yup.string().email().required() }),
});
yupForm.value.email = 'yup@example.com';
