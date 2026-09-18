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


const nested = useValidation({
  initialValue: {
    profile: {
      email: '',
      age: 0,
    },
  },
  validate: {
    profile: {
      email: {
        required(value, form) {
          value.toUpperCase();
          form.profile.age.toFixed();
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
  },
});

nested.errors.profile?.email?.[0]?.toUpperCase();
nested.errors.profile?.age?.[0]?.toUpperCase();

const arrays = useValidation({
  initialValue: {
    tags: [] as string[],
  },
  validate: {
    tags: {
      required(value, form) {
        value.push('typed');
        form.tags.length.toFixed();
        return value.length > 0 || 'Add a tag';
      },
    },
  },
});

arrays.errors.tags?._errors?.[0]?.toUpperCase();

const nestedSchema = useValidation({
  initialValue: {
    users: [{ email: '' }],
  },
  schema: z.object({
    users: z.array(z.object({ email: z.string().email() })),
  }),
});

nestedSchema.errors.users?.[0]?.email?.[0]?.toUpperCase();
nestedSchema.errors.users?._errors?.[0]?.toUpperCase();

inline.reset({ email: 'loaded@example.com', age: 42 });
inline.reset();

// @ts-expect-error reset baseline must match the form value shape
inline.reset({ email: 'missing-age@example.com' });
