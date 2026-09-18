# @wypratama/use-validation

Tiny, opinionated reactive form validation for React.

`use-validation` is deliberately not a general form framework. It treats a form as a reactive value plus validation state, with a small lifecycle that is intentionally different from libraries that validate on mount, registration, blur, or every change from the beginning.

## How this library thinks about forms

**Fields are just values.** There is no field registration API, controller, touched state, or special field component. Read and assign values directly:

```js
form.value.email
form.value.email = 'me@example.com'
```

**Validation starts only when you explicitly ask for it.** Before the first `validate()`, every mutation is silent. That includes user input, API hydration for edit forms, programmatic assignments, and view-only data loading:

```js
form.value.phone = ''

form.errors // {}
form.valid  // true
```

This means an old persisted record can be loaded even if newer validation rules would reject it, without immediately showing errors to the user.

**After the first `validate()`, validation stays active.** Every later mutation revalidates automatically so visible errors remain current. User-driven and programmatic/cascading assignments are intentionally treated the same:

```js
await form.validate()

form.value.country = 'SG'
form.value.phone = normalizePhone(form.value.phone)
// resulting form state is revalidated automatically
```

**`valid` mirrors the current error bag.** It starts `true` because no errors have been discovered yet. Use the result of `await form.validate()` for submit-time control flow, and use `form.valid` for reactive UI state.

**Resetting also resets the validation lifecycle.** `reset()` returns to the current baseline and makes validation dormant again. `reset(value)` loads a new baseline, which is useful for edit forms that hydrate from an API.

If that lifecycle matches how you want forms to behave, the rest of the API is intentionally small:

```text
form.value
form.errors
form.valid
form.validating
form.validate()
form.reset()
```

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

The error bag starts empty, so `form.valid` starts `true`. **No mutation validates anything until the first explicit `validate()`**—including values assigned by application code while loading an edit form. After that first validation attempt, every later mutation participates in automatic revalidation, including programmatic/cascading assignments, so visible errors and `form.valid` stay current.

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

## Edit and view-only forms

Loading an existing record does not immediately expose validation errors. This matters when newer validation requirements make older persisted data technically invalid.

```jsx
const form = useValidation({
  initialValue: {
    username: '',
    phone: '',
  },
  validate: {
    phone: {
      required: value => Boolean(value) || 'Phone is required',
    },
  },
})

// An old record loaded from the API does not validate on assignment.
form.reset({
  username: 'legacy-user',
  phone: '',
})

form.errors // {}
form.valid  // true

// The new requirement is shown only after the first validation attempt.
await form.validate()

form.errors.phone
// ['Phone is required']
```

Passing a value to `reset(nextInitialValue)` also makes that value the new reset baseline. Calling `reset()` later returns to the loaded record. Both forms of `reset()` clear errors and return validation to its dormant state.

A view-only form can therefore hydrate and update values without ever showing validation errors as long as it never calls `validate()`.

The library deliberately does not distinguish user mutations from programmatic mutations. The lifecycle is the boundary: all mutations are silent before the first `validate()`; all mutations revalidate afterward.

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

`_errors` and `_form` are reserved by the error-tree representation. Avoid using those names as form field keys if you need to address their validation errors through `form.errors`.

Native array rules validate the array as a whole. For item-level array validation, use a Standard Schema.

## Standard Schema

The same `schema` option accepts **any Standard Schema-compatible validator**. The integration is not specific to Zod or Yup: current Zod, Yup, Valibot, ArkType, Joi and other Standard Schema implementations can use the same API, while non-standard validators can be used through an adapter that implements Standard Schema.

VeeValidate's legacy `toTypedSchema()` wrappers and raw JSON Schema objects are different interfaces and are not accepted directly. Modern validators that already implement Standard Schema should be passed directly.

`use-validation` uses schemas for validation only. If a Standard Schema implementation coerces or transforms its successful output, that output is not written back into `form.value`; the form remains the value the user mutated.

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
form.reset()     restore the current baseline and clear validation state
form.reset(value) load a new baseline and clear validation state
```

`form.valid` starts `true` because the initial error bag is empty. Use the boolean returned by `validate()` for submit-time control flow; use `form.valid` as reactive UI state. Each async validation runs against a snapshot of the form. If an explicit `validate()` becomes stale because the form changes while it is running, that call resolves `false` and the newer validation owns the reactive error state. Automatic validation uses the latest rules/schema even when a previously captured `form.value` reference is mutated.

`reset()` restores the current baseline, empties the error bag, sets `valid` back to `true`, and deactivates automatic revalidation until `validate()` is explicitly called again. `reset(value)` does the same while also making `value` the new baseline, which is useful when API data arrives for an edit form.

`value` is powered by [react-use-reactive](https://github.com/wypratama/react-use-reactive). This package only adds mutation observation and validation; it does not contain a second React state/COW implementation.

## Scope

This is deliberately not a full form framework. There is no register API, controller, field context, watcher API, form store, or component abstraction. The goal is a small validator for forms where a reactive value, an error bag, and one validation declaration are enough.
