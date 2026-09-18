# @wypratama/use-validation

Tiny reactive form validation for React. Give it an object and one validation strategy, mutate the value normally, and read the errors.

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

async function submit() {
  if (!await form.validate())
    return

  await save(form.value)
}
```

The error bag starts empty, so `form.valid` starts `true`. Mutating the form does not validate anything until the first explicit `validate()`. After that first validation attempt, later mutations automatically revalidate so visible errors and `form.valid` stay current.

This makes submit-time control flow and reactive UI state separate:

```jsx
async function submit() {
  if (!await form.validate())
    return

  await save(form.value)
}

<button disabled={!form.valid || form.validating} onClick={submit}>
  Submit
</button>
```

## Nested values

Native rules mirror nested object fields:

```jsx
const form = useValidation({
  initialValue: {
    profile: {
      email: '',
    },
  },
  validate: {
    profile: {
      email: {
        required: value => Boolean(value) || 'Email is required',
      },
    },
  },
})

form.value.profile.email = 'me@example.com'
form.errors.profile?.email
```

The error tree mirrors the form tree. Scalar field errors are arrays of messages:

```js
form.errors.email
// ['Email is required']

form.errors.profile?.email
// ['Email is required']

form.errors.users?.[0]?.email
// ['Invalid email']
```

When an error belongs to an object or array itself rather than one of its children, it is stored in `_errors` so both kinds can coexist:

```js
form.errors.tags?._errors
// ['Add at least one tag']

form.errors.profile?._errors
// ['Profile is incomplete']

form.errors._form
// ['Passwords do not match']
```

Native array rules validate the array as a whole. For item-level array validation, use a Standard Schema.

## Standard Schema

The same `schema` option accepts Standard Schema implementations. Zod and modern Yup are tested directly; the package does not need a resolver or runtime dependency on either library.

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

Nested schema issue paths are normalized into the same mirrored `form.errors` tree as native validation.

## API

```text
form.value       reactive form object
form.errors      mirrored validation error tree
form.valid       true when the current error bag is empty
form.validating  true while the latest validation is running

form.validate()  validate now and return Promise<boolean>
form.reset()     restore initial values and clear validation state
```

`form.valid` starts `true` because the initial error bag is empty. Use the boolean returned by `validate()` for submit-time control flow; use `form.valid` as reactive UI state.

`reset()` restores the initial value, empties the error bag, sets `valid` back to `true`, and deactivates automatic revalidation until `validate()` is explicitly called again.

`value` is powered by [react-use-reactive](https://github.com/wypratama/react-use-reactive). This package only adds mutation observation and validation; it does not contain a second React state/COW implementation.

## Scope

This is deliberately not a full form framework. There is no register API, controller, field context, watcher API, form store, or component abstraction. The goal is a small validator for forms where a reactive value, an error bag, and one validation declaration are enough.
