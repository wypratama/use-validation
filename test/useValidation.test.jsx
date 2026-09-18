// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import * as yup from 'yup';
import { z } from 'zod';
import useValidation from '../index.js';

describe('useValidation prototype', () => {
  it('keeps the simple mutable-looking API for inline validators', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { email: '', age: 0 },
      validate: {
        email: {
          required: (value) => Boolean(value) || 'Email is required',
        },
        age: {
          adult: (value) => value >= 18 || 'Must be 18+',
        },
      },
    }));

    expect(result.current.errors).toEqual({});

    let valid;
    await act(async () => {
      valid = await result.current.validate();
    });

    expect(valid).toBe(false);
    expect(result.current.errors.email).toEqual(['Email is required']);
    expect(result.current.errors.age).toEqual(['Must be 18+']);
    expect(result.current.valid).toBe(false);

    act(() => {
      result.current.value.email = 'wicak@example.com';
      result.current.value.age = 20;
    });

    await waitFor(() => expect(result.current.valid).toBe(true));
    expect(result.current.errors).toEqual({});
  });

  it('accepts a Standard Schema implementation such as Zod', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { email: '', age: 0 },
      schema: z.object({
        email: z.string().email(),
        age: z.number().min(18),
      }),
    }));

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.valid).toBe(false);
    expect(result.current.errors.email?.length).toBeGreaterThan(0);
    expect(result.current.errors.age?.length).toBeGreaterThan(0);

    act(() => {
      result.current.value.email = 'me@example.com';
      result.current.value.age = 22;
    });

    await waitFor(() => expect(result.current.valid).toBe(true));
  });

  it('accepts Yup through the same Standard Schema API', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { email: '', age: 0 },
      schema: yup.object({
        email: yup.string().email().required(),
        age: yup.number().min(18).required(),
      }),
    }));

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.valid).toBe(false);
    expect(result.current.errors.email?.length).toBeGreaterThan(0);
    expect(result.current.errors.age?.length).toBeGreaterThan(0);

    act(() => {
      result.current.value.email = 'yup@example.com';
      result.current.value.age = 25;
    });

    await waitFor(() => expect(result.current.valid).toBe(true));
  });

  it('observes nested writes without reimplementing reactive state', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { profile: { email: '' } },
      schema: z.object({
        profile: z.object({ email: z.string().email() }),
      }),
    }));

    await act(async () => {
      await result.current.validate();
    });
    expect(result.current.valid).toBe(false);
    expect(result.current.errors.profile?.email?.length).toBeGreaterThan(0);

    act(() => {
      result.current.value.profile.email = 'nested@example.com';
    });

    await waitFor(() => expect(result.current.valid).toBe(true));
  });

  it('leaves opaque object values unproxied and usable', () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const metadata = new Map([['role', 'admin']]);
    const { result } = renderHook(() => useValidation({
      initialValue: { createdAt, metadata },
      validate: {
        createdAt: { present: (value) => value instanceof Date || 'Invalid date' },
      },
    }));

    expect(result.current.value.createdAt).toBe(createdAt);
    expect(result.current.value.createdAt.getTime()).toBe(createdAt.getTime());
    expect(result.current.value.metadata).toBe(metadata);
    expect(result.current.value.metadata.get('role')).toBe('admin');
  });

  it('keeps a captured root value reference live across reactive rerenders', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { email: '' },
      validate: {
        email: { required: (value) => Boolean(value) || 'Required' },
      },
    }));
    const value = result.current.value;

    await act(async () => {
      await result.current.validate();
    });
    expect(result.current.valid).toBe(false);

    act(() => {
      value.email = 'first@example.com';
    });
    await waitFor(() => expect(result.current.valid).toBe(true));

    act(() => {
      value.email = '';
    });
    await waitFor(() => expect(result.current.valid).toBe(false));
  });

  it('keeps a captured nested value reference live across reactive rerenders', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { profile: { email: '' } },
      schema: z.object({
        profile: z.object({ email: z.string().email() }),
      }),
    }));
    const profile = result.current.value.profile;

    await act(async () => {
      await result.current.validate();
    });

    act(() => {
      profile.email = 'held@example.com';
    });
    await waitFor(() => expect(result.current.valid).toBe(true));

    act(() => {
      profile.email = 'invalid';
    });
    await waitFor(() => expect(result.current.valid).toBe(false));
  });

  it('can render on the server without running validation', () => {
    const App = () => {
      const form = useValidation({
        initialValue: { email: 'server@example.com' },
        validate: {
          email: { required: (value) => Boolean(value) || 'Required' },
        },
      });
      return <span>{form.value.email}</span>;
    };

    expect(renderToString(<App />)).toContain('server@example.com');
  });

  it('resets value and validation state', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { email: '' },
      validate: {
        email: { required: (value) => Boolean(value) || 'Required' },
      },
    }));

    act(() => {
      result.current.value.email = 'changed@example.com';
    });
    await act(async () => {
      await result.current.validate();
    });
    expect(result.current.valid).toBe(true);

    act(() => result.current.reset());

    expect(result.current.value.email).toBe('');
    expect(result.current.errors).toEqual({});
    expect(result.current.valid).toBe(true);
  });

  it('requires exactly one validation strategy', () => {
    expect(() => renderHook(() => useValidation({ initialValue: {} }))).toThrow(
      'exactly one of validate or schema',
    );
  });

  it('does not run validation before validation is activated', () => {
    const required = vi.fn((value) => Boolean(value) || 'Required');
    const { result } = renderHook(() => useValidation({
      initialValue: { email: '' },
      validate: { email: { required } },
    }));

    act(() => {
      result.current.value.email = 'first@example.com';
      result.current.value.email = 'second@example.com';
    });

    expect(required).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual({});
  });

  it('mirrors nested native rules and errors to the form shape', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: {
        profile: {
          email: '',
          name: '',
        },
      },
      validate: {
        profile: {
          email: {
            required: (value) => Boolean(value) || 'Email is required',
          },
          name: {
            required: (value) => Boolean(value) || 'Name is required',
          },
        },
      },
    }));

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.errors.profile?.email).toEqual(['Email is required']);
    expect(result.current.errors.profile?.name).toEqual(['Name is required']);

    act(() => {
      result.current.value.profile.email = 'nested@example.com';
      result.current.value.profile.name = 'Wicak';
    });

    await waitFor(() => expect(result.current.valid).toBe(true));
    expect(result.current.errors).toEqual({});
  });

  it('keeps schema errors attached to structural paths without losing child shape', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { profile: { email: '' } },
      schema: z.object({
        profile: z.object({ email: z.string() }),
      }).refine(
        (value) => Boolean(value.profile.email),
        { path: ['profile'], message: 'Profile is incomplete' },
      ),
    }));

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.errors.profile?._errors).toEqual(['Profile is incomplete']);
  });

  it('validates native array fields as a whole value', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { tags: [] },
      validate: {
        tags: {
          required: (value) => value.length > 0 || 'Add at least one tag',
        },
      },
    }));

    await act(async () => {
      await result.current.validate();
    });
    expect(result.current.errors.tags?._errors).toEqual(['Add at least one tag']);

    act(() => {
      result.current.value.tags.push('react');
    });
    await waitFor(() => expect(result.current.valid).toBe(true));
  });

  it('keeps cross-field rules in sync after activation', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { password: 'secret', confirm: 'wrong' },
      validate: {
        confirm: {
          matches: (value, form) => value === form.password || 'Passwords must match',
        },
      },
    }));

    await act(async () => {
      await result.current.validate();
    });
    expect(result.current.errors.confirm).toEqual(['Passwords must match']);

    act(() => {
      result.current.value.confirm = 'secret';
    });
    await waitFor(() => expect(result.current.valid).toBe(true));

    act(() => {
      result.current.value.password = 'changed';
    });
    await waitFor(() => {
      expect(result.current.errors.confirm).toEqual(['Passwords must match']);
    });
  });

  it('observes array mutations through the validation wrapper', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { tags: ['ready'] },
      schema: z.object({
        tags: z.array(z.string().min(1, 'Tag is required')),
      }),
    }));

    await act(async () => {
      await result.current.validate();
    });
    expect(result.current.valid).toBe(true);

    act(() => {
      result.current.value.tags.push('');
    });
    await waitFor(() => expect(result.current.valid).toBe(false));
    expect(result.current.errors.tags?.[1]).toEqual(['Tag is required']);

    act(() => {
      result.current.value.tags[1] = 'fixed';
    });
    await waitFor(() => expect(result.current.valid).toBe(true));
  });

  it('observes nested deletes and object replacement', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { profile: { email: 'me@example.com' } },
      schema: z.object({
        profile: z.object({ email: z.string().email() }),
      }),
    }));

    await act(async () => {
      await result.current.validate();
    });
    expect(result.current.valid).toBe(true);

    act(() => {
      delete result.current.value.profile.email;
    });
    await waitFor(() => expect(result.current.valid).toBe(false));

    act(() => {
      result.current.value.profile = { email: 'restored@example.com' };
    });
    await waitFor(() => expect(result.current.valid).toBe(true));
  });

  it('collects multiple inline constraint messages', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { password: '' },
      validate: {
        password: {
          required: (value) => Boolean(value) || 'Required',
          length: (value) => value.length >= 8 || 'Use at least 8 characters',
        },
      },
    }));

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.errors.password).toEqual([
      'Required',
      'Use at least 8 characters',
    ]);
  });

  it('ignores stale async validation results', async () => {
    const delayed = async (value) => {
      await new Promise((resolve) => setTimeout(resolve, value === 'bad' ? 30 : 1));
      return value === 'good' || 'Username is unavailable';
    };
    const { result } = renderHook(() => useValidation({
      initialValue: { username: 'bad' },
      validate: { username: { available: delayed } },
    }));

    let firstValidation;
    act(() => {
      firstValidation = result.current.validate();
    });

    act(() => {
      result.current.value.username = 'good';
    });

    await act(async () => {
      await firstValidation;
      await new Promise((resolve) => setTimeout(resolve, 40));
    });

    expect(result.current.value.username).toBe('good');
    expect(result.current.errors).toEqual({});
    expect(result.current.valid).toBe(true);
    expect(result.current.validating).toBe(false);
  });

  it('does not let an in-flight validation repopulate errors after reset', async () => {
    const delayedInvalid = async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return 'Still invalid';
    };
    const { result } = renderHook(() => useValidation({
      initialValue: { email: '' },
      validate: { email: { delayedInvalid } },
    }));

    let pending;
    act(() => {
      pending = result.current.validate();
    });
    act(() => {
      result.current.reset();
    });

    await act(async () => {
      await pending;
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current.errors).toEqual({});
    expect(result.current.validating).toBe(false);
  });

  it('rejects objects that are not Standard Schema implementations', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { email: '' },
      schema: {},
    }));

    await expect(result.current.validate()).rejects.toThrow(
      'schema must implement Standard Schema',
    );
  });

});
