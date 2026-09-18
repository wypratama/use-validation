# @wypratama/use-validation

Tiny reactive form validation for React. Give it an object and one validation strategy; mutate the value normally.

> **Prototype:** this PR is intentionally testing whether the original API can stay small on top of `react-use-reactive@beta`.

## Inline validation

```jsx
const form = useValidation({
  initialValue: {
    email: '',
    age: 0,
  },
  validate: {
    email: {
      required: value => Boolean(value) || 'Email is required',
    },
    age: {
      adult: value => value >= 18 || 'Must be 18+',
    },
  },
})

form.value.email = 'wicak@example.com'
form.errors.email
form.valid

if (await form.validate()) {
  // submit
}
```

Errors stay hidden until the first `validate()`. After that, changing `form.value` automatically revalidates the current form.

## Standard Schema

The same API accepts any [Standard Schema](https://standardschema.dev/) implementation, so the package does not need a runtime dependency on your schema library.

```jsx
import { z } from 'zod'

const form = useValidation({
  initialValue: {
    email: '',
    age: 0,
  },
  schema: z.object({
    email: z.string().email(),
    age: z.number().min(18),
  }),
})

form.value.email = 'me@example.com'

if (await form.validate()) {
  // submit
}
```

Current Zod and Yup schemas both work through this same Standard Schema boundary; no resolver or library-specific adapter is required. Other Standard Schema implementations can use the same `schema` option.

## API

```text
form.value       reactive form object
form.errors      normalized field error arrays
form.valid       whether the current validation result has no errors
form.validating  whether the latest validation is running

form.validate()  validate the whole form; always async
form.reset()     restore the initial value and hide validation errors
```

`value` is powered by [`react-use-reactive`](https://github.com/wypratama/react-use-reactive). This package only adds mutation observation and validation; it does not contain a second React state/COW implementation.

## Scope

This is deliberately not a full form framework. There is no `register`, controller, field context, form store API, watcher API, or component abstraction. If the prototype needs those concepts to work reliably, that is evidence that this package should stay experimental rather than grow into another general form library.
