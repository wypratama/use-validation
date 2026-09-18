# @wypratama/use-validation

A small, opinionated validation hook for React forms.

This library treats a form as a reactive value with validation state. It does not use a field registration system or special field components.

## Form behavior

The library uses these rules.

**A field is a value.** Read the value directly. Assign a new value directly.

```js
form.value.email
form.value.email = 'me@example.com'
```

**Validation is dormant at first.** A value change does not start validation before the first explicit `validate()` call.

This rule applies to user input and programmatic changes. It also applies when an API supplies data to an edit form.

```js
form.value.phone = ''

form.errors // {}
form.valid  // true
```

**The first `validate()` call activates validation.** After this call, each later value change starts automatic validation.

The source of the value change does not matter. User input and programmatic changes use the same rule.

```js
await form.validate()

form.value.country = 'SG'
form.value.phone = normalizePhone(form.value.phone)
```

**`valid` shows the state of the error bag.** Its initial value is `true` because the error bag is empty.

Use the result of `await form.validate()` to control a submit operation. Use `form.valid` to control reactive UI state.

**`reset()` makes validation dormant again.** It restores the current baseline and removes all errors.

Use `reset(value)` to set a new baseline. This operation is useful when an API supplies data for an edit form.

The public API is small:

```text
form.value
form.errors
form.valid
form.validating
form.validate()
form.reset()
```

## Basic usage

This example connects a form value to an input. It also shows the first error message for the field.

```jsx
import useValidation from '@wypratama/use-validation'

function UserForm() {
  const form = useValidation({
    initialValue: {
      email: '',
    },
    validate: {
      email: {
        required: value => Boolean(value) || 'Email is required',
      },
    },
  })

  async function submit(event) {
    event.preventDefault()

    if (!await form.validate())
      return

    await save(form.value)
  }

  return (
    <form onSubmit={submit}>
      <label>
        Email

        <input
          value={form.value.email}
          className={form.errors.email ? 'border-red' : ''}
          onChange={event => {
            form.value.email = event.target.value
          }}
        />
      </label>

      {form.errors.email?.[0] && (
        <small className="text-red">
          {form.errors.email[0]}
        </small>
      )}

      <button
        type="submit"
        disabled={!form.valid || form.validating}
      >
        Submit
      </button>
    </form>
  )
}
```

The first value changes do not start validation. The first submit calls `validate()`.

If validation fails, the library adds messages to `form.errors`. Later value changes update these errors automatically.

## Dynamic fields

Arrays are normal reactive values. You do not need a field-array hook to add or remove items.

Use normal JavaScript array operations:

```js
form.value.children.push({
  name: '',
  age: 0,
  idNumber: '',
})

form.value.children.splice(index, 1)
```

Native validation can validate the complete array and each item at the same time.

Use `$self` for rules on the complete array. Use `$each` for rules on each current item.

```jsx
import useValidation from '@wypratama/use-validation'

function ChildrenForm() {
  const form = useValidation({
    initialValue: {
      children: [
        { name: '', age: 0, idNumber: '' },
      ],
    },
    validate: {
      children: {
        $self: {
          maxTwo: children => (
            children.length <= 2 || 'Maximum 2 children'
          ),
        },
        $each: {
          name: {
            required: value => (
              Boolean(value) || 'Child name is required'
            ),
          },
          age: {
            required: value => (
              value > 0 || 'Child age is required'
            ),
          },
          idNumber: {
            required: value => (
              Boolean(value) || 'Child ID is required'
            ),
          },
        },
      },
    },
  })

  async function submit(event) {
    event.preventDefault()

    if (!await form.validate())
      return

    await save(form.value)
  }

  return (
    <form onSubmit={submit}>
      {form.errors.children?._errors?.[0] && (
        <small className="text-red">
          {form.errors.children._errors[0]}
        </small>
      )}

      {form.value.children.map((child, index) => (
        <fieldset key={index}>
          <label>
            Name

            <input
              value={child.name}
              className={
                form.errors.children?.[index]?.name
                  ? 'border-red'
                  : ''
              }
              onChange={event => {
                form.value.children[index].name = event.target.value
              }}
            />
          </label>

          {form.errors.children?.[index]?.name?.[0] && (
            <small className="text-red">
              {form.errors.children[index].name[0]}
            </small>
          )}

          <label>
            Age

            <input
              type="number"
              value={child.age}
              onChange={event => {
                form.value.children[index].age = Number(event.target.value)
              }}
            />
          </label>

          {form.errors.children?.[index]?.age?.[0] && (
            <small className="text-red">
              {form.errors.children[index].age[0]}
            </small>
          )}

          <label>
            ID number

            <input
              value={child.idNumber}
              onChange={event => {
                form.value.children[index].idNumber = event.target.value
              }}
            />
          </label>

          {form.errors.children?.[index]?.idNumber?.[0] && (
            <small className="text-red">
              {form.errors.children[index].idNumber[0]}
            </small>
          )}

          <button
            type="button"
            onClick={() => {
              form.value.children.splice(index, 1)
            }}
          >
            Remove child
          </button>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => {
          form.value.children.push({
            name: '',
            age: 0,
            idNumber: '',
          })
        }}
      >
        Add child
      </button>

      <button type="submit">
        Save
      </button>
    </form>
  )
}
```

An array-level error uses `_errors`:

```js
form.errors.children?._errors
// ['Maximum 2 children']
```

An item-level error follows the current array index and field name:

```js
form.errors.children?.[0]?.name
// ['Child name is required']
```

You can use `$each` with arrays of scalar values too. In that case, each item receives its own error array.

If you only need rules for the complete array, you can use the shorter form:

```js
validate: {
  children: {
    maxTwo: children => (
      children.length <= 2 || 'Maximum 2 children'
    ),
  },
}
```

Standard Schema supports the same two validation levels. Put array rules on the array schema and item rules on the item schema.

```js
schema: z.object({
  children: z
    .array(
      z.object({
        name: z.string().min(1, 'Child name is required'),
        age: z.number().positive('Child age is required'),
        idNumber: z.string().min(1, 'Child ID is required'),
      }),
    )
    .max(2, 'Maximum 2 children'),
})
```

Both validation modes can produce an array-level error and item-level errors at the same time.

The array length can change at any time. `push()`, `pop()`, `splice()`, and index assignments work with the reactive value.

Before the first submit, these operations do not start validation. After the first `validate()`, they update errors automatically.

If an operation changes an item index, the next validation result uses the new index.

## Edit forms

An edit form can receive old data that does not meet a new validation rule. The library does not show an error during data load.

For example, an old user can have no phone number. A new application version can make the phone number mandatory.

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

// Set the API data as the new baseline.
form.reset({
  username: 'legacy-user',
  phone: '',
})

form.errors // {}
form.valid  // true
```

The empty phone number does not cause an error at this time. The first explicit validation shows the new requirement.

```js
await form.validate()

form.errors.phone
// ['Phone is required']
```

After this validation, later changes start automatic validation.

```js
form.value.phone = '08123456789'

// Automatic validation removes the phone error.
```

A later `reset()` restores the loaded user data. It also removes errors and makes validation dormant again.

## View-only forms

A view-only form does not need a different validation mode. Do not call `validate()` if the user cannot submit the form.

The form can receive programmatic value changes. These changes do not create validation errors while validation is dormant.

## Nested values

Native rules can use the same object structure as the form value.

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

The error tree follows the form tree. A scalar field has an array of error messages.

```js
form.errors.email
// ['Email is required']

form.errors.profile?.email
// ['Email is required']

form.errors.users?.[0]?.email
// ['Invalid email']
```

An object or array can also have an error for the complete value. The library stores this error in `_errors`.

```js
form.errors.tags?._errors
// ['Add at least one tag']

form.errors.profile?._errors
// ['Profile is incomplete']
```

The library stores an error for the complete form in `_form`.

```js
form.errors._form
// ['Passwords do not match']
```

The names `_errors` and `_form` are reserved in the error tree. Do not use these names for form fields that need error access.

## Inline validation

Use `validate` for small rules that belong to the form.

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
      adult: value => value >= 18 || 'Must be 18 or older',
    },
  },
})
```

A rule receives the field value as its first argument. It receives the complete form value as its second argument.

Use the second argument for rules that depend on another field.

```jsx
const form = useValidation({
  initialValue: {
    password: '',
    confirmPassword: '',
  },
  validate: {
    confirmPassword: {
      matches: (value, valueOfForm) => (
        value === valueOfForm.password || 'Passwords must match'
      ),
    },
  },
})
```

A rule can return `true` or `undefined` for a valid value. It can return a string for an invalid value.

A rule can also return a `Promise`. The library supports asynchronous validation and protects the form from stale validation results.

## Standard Schema

The `schema` option accepts any validator that implements Standard Schema V1. The library does not contain a Zod-specific or Yup-specific adapter.

This example uses Zod:

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
```

Use the schema directly if the validation library implements Standard Schema V1. Otherwise, use an external adapter that implements Standard Schema V1.

The library uses a schema only for validation. It does not copy transformed or coerced schema output into `form.value`.

Standard Schema issue paths become paths in `form.errors`. This rule gives the same error structure for nested objects and dynamic arrays.

## API

### `form.value`

The reactive form value.

Assign properties directly. Use normal object and array operations.

### `form.errors`

The current error tree.

The initial value is empty. The library does not add errors before the first explicit `validate()`.

### `form.valid`

`true` when the current error tree is empty.

The initial value is `true`. Use the result of `validate()` for submit control.

### `form.validating`

`true` while the latest validation is in progress.

Use this value to disable UI controls during asynchronous validation.

### `form.validate()`

Start validation and return `Promise<boolean>`.

The first call also activates automatic validation for later value changes.

Each asynchronous validation uses a snapshot of the form. A stale explicit validation returns `false`.

### `form.reset()`

Restore the current baseline. Remove all errors and make automatic validation dormant.

### `form.reset(value)`

Set `value` as the new baseline. Remove all errors and make automatic validation dormant.

Use this operation when an API supplies data for an edit form.

## Scope

This library is not a complete form framework.

It does not include field registration, controllers, field context, watchers, or special field components. It does not include separate validation modes for mount, blur, and change events.

`react-use-reactive` manages the reactive value. `use-validation` adds validation behavior to that value.

The small API and the validation lifecycle are intentional design choices.
