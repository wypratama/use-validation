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

  it('integrates the Standard Schema contract without vendor-specific behavior', async () => {
    const schema = {
      '~standard': {
        version: 1,
        vendor: 'test-schema',
        validate(value) {
          if (value.account?.email === 'standard@example.com') {
            return { value };
          }
          return {
            issues: [{
              path: ['account', 'email'],
              message: 'Use the Standard Schema address',
            }],
          };
        },
      },
    };

    const { result } = renderHook(() => useValidation({
      initialValue: { account: { email: '' } },
      schema,
    }));

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.errors.account?.email).toEqual([
      'Use the Standard Schema address',
    ]);

    act(() => {
      result.current.value.account.email = 'standard@example.com';
    });

    await waitFor(() => expect(result.current.valid).toBe(true));
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

  it('uses the latest validation rules through a captured value reference', async () => {
    const { result, rerender } = renderHook(
      ({ minimum }) => useValidation({
        initialValue: { age: 18 },
        validate: {
          age: {
            minimum: (value) => value >= minimum || `Must be at least ${minimum}`,
          },
        },
      }),
      { initialProps: { minimum: 18 } },
    );
    const value = result.current.value;

    await act(async () => {
      await result.current.validate();
    });
    expect(result.current.valid).toBe(true);

    rerender({ minimum: 21 });

    act(() => {
      value.age = 20;
    });

    await waitFor(() => {
      expect(result.current.errors.age).toEqual(['Must be at least 21']);
    });
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

  it('keeps programmatic edit-data loading dormant before first validation', () => {
    const phoneRequired = vi.fn((value) => Boolean(value) || 'Phone is required');
    const { result } = renderHook(() => useValidation({
      initialValue: { username: '', phone: '' },
      validate: {
        username: { required: (value) => Boolean(value) || 'Username is required' },
        phone: { required: phoneRequired },
      },
    }));

    act(() => {
      result.current.value.username = 'legacy-user';
      result.current.value.phone = '';
    });

    expect(phoneRequired).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual({});
    expect(result.current.valid).toBe(true);
  });

  it('loads an edit baseline with reset without exposing legacy validation errors', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { username: '', phone: '' },
      validate: {
        username: { required: (value) => Boolean(value) || 'Username is required' },
        phone: { required: (value) => Boolean(value) || 'Phone is required' },
      },
    }));

    act(() => {
      result.current.reset({
        username: 'legacy-user',
        phone: '',
      });
    });

    expect(result.current.value).toMatchObject({
      username: 'legacy-user',
      phone: '',
    });
    expect(result.current.errors).toEqual({});
    expect(result.current.valid).toBe(true);

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.errors.phone).toEqual(['Phone is required']);
    expect(result.current.valid).toBe(false);

    act(() => {
      result.current.value.phone = '08123456789';
    });

    await waitFor(() => expect(result.current.valid).toBe(true));

    act(() => {
      result.current.reset();
    });

    expect(result.current.value).toMatchObject({
      username: 'legacy-user',
      phone: '',
    });
    expect(result.current.errors).toEqual({});
    expect(result.current.valid).toBe(true);
  });

  it('keeps programmatic mutations reactive after validation has activated', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { country: 'ID', phone: '08123' },
      validate: {
        phone: {
          required: (value) => Boolean(value) || 'Phone is required',
        },
      },
    }));

    await act(async () => {
      await result.current.validate();
    });
    expect(result.current.valid).toBe(true);

    act(() => {
      // This could be application logic reacting to another field interaction.
      result.current.value.country = 'SG';
      result.current.value.phone = '';
    });

    await waitFor(() => {
      expect(result.current.errors.phone).toEqual(['Phone is required']);
    });
  });

  it('can stay view-only forever without activating validation', () => {
    const required = vi.fn((value) => Boolean(value) || 'Required');
    const { result } = renderHook(() => useValidation({
      initialValue: { phone: '' },
      validate: { phone: { required } },
    }));

    act(() => {
      // Data hydration/update in a read-only form component.
      result.current.value.phone = '';
    });

    expect(required).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual({});
    expect(result.current.valid).toBe(true);
    expect(result.current.validating).toBe(false);
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

  it('validates a native array and each object item at the same time', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: {
        children: [
          { name: '', age: 0, idNumber: '' },
        ],
      },
      validate: {
        children: {
          $self: {
            maxTwo: (children) => (
              children.length <= 2 || 'Maximum 2 children'
            ),
          },
          $each: {
            name: {
              required: (value) => Boolean(value) || 'Child name is required',
            },
            age: {
              required: (value) => value > 0 || 'Child age is required',
            },
            idNumber: {
              required: (value) => Boolean(value) || 'Child ID is required',
            },
          },
        },
      },
    }));

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.errors.children?.[0]?.name).toEqual([
      'Child name is required',
    ]);
    expect(result.current.errors.children?.[0]?.age).toEqual([
      'Child age is required',
    ]);
    expect(result.current.errors.children?.[0]?.idNumber).toEqual([
      'Child ID is required',
    ]);
    expect(result.current.errors.children?._errors).toBeUndefined();

    act(() => {
      result.current.value.children[0] = {
        name: 'Alice',
        age: 8,
        idNumber: 'ID-1',
      };
      result.current.value.children.push({
        name: 'Bob',
        age: 6,
        idNumber: 'ID-2',
      });
      result.current.value.children.push({
        name: '',
        age: 0,
        idNumber: '',
      });
    });

    await waitFor(() => {
      expect(result.current.errors.children?._errors).toEqual([
        'Maximum 2 children',
      ]);
      expect(result.current.errors.children?.[2]?.name).toEqual([
        'Child name is required',
      ]);
    });

    act(() => {
      result.current.value.children[2] = {
        name: 'Charlie',
        age: 4,
        idNumber: 'ID-3',
      };
    });

    await waitFor(() => {
      expect(result.current.errors.children?.[2]).toBeUndefined();
      expect(result.current.errors.children?._errors).toEqual([
        'Maximum 2 children',
      ]);
    });

    act(() => {
      result.current.value.children.pop();
    });

    await waitFor(() => expect(result.current.valid).toBe(true));
    expect(result.current.errors).toEqual({});
  });

  it('validates every primitive array item with native $each rules', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { children: [''] },
      validate: {
        children: {
          $each: {
            required: (value) => Boolean(value) || 'Child name is required',
          },
        },
      },
    }));

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.errors.children?.[0]).toEqual([
      'Child name is required',
    ]);

    act(() => {
      result.current.value.children[0] = 'Alice';
      result.current.value.children.push('');
    });

    await waitFor(() => {
      expect(result.current.errors.children?.[0]).toBeUndefined();
      expect(result.current.errors.children?.[1]).toEqual([
        'Child name is required',
      ]);
    });
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

  it('lets explicit validate supersede a queued automatic validation', async () => {
    const rule = vi.fn((value) => Boolean(value) || 'Required');
    const { result } = renderHook(() => useValidation({
      initialValue: { email: '' },
      validate: { email: { rule } },
    }));

    await act(async () => {
      await result.current.validate();
    });
    rule.mockClear();

    let allowed;
    await act(async () => {
      result.current.value.email = 'valid@example.com';
      allowed = await result.current.validate();
    });

    expect(allowed).toBe(true);
    expect(rule).toHaveBeenCalledTimes(1);
    expect(result.current.valid).toBe(true);
  });

  it('batches one synchronous mutation turn into one automatic validation', async () => {
    const required = vi.fn((value) => value.length > 0 || 'Add a tag');
    const { result } = renderHook(() => useValidation({
      initialValue: { tags: [] },
      validate: { tags: { required } },
    }));

    await act(async () => {
      await result.current.validate();
    });
    required.mockClear();

    act(() => {
      result.current.value.tags.push('react');
    });

    await waitFor(() => expect(result.current.valid).toBe(true));
    expect(required).toHaveBeenCalledTimes(1);
  });

  it('batches several synchronous field writes into one automatic validation', async () => {
    const rule = vi.fn(() => true);
    const { result } = renderHook(() => useValidation({
      initialValue: { first: '', second: '' },
      validate: {
        first: { rule },
        second: { rule },
      },
    }));

    await act(async () => {
      await result.current.validate();
    });
    rule.mockClear();

    act(() => {
      result.current.value.first = 'a';
      result.current.value.second = 'b';
    });

    await waitFor(() => expect(rule).toHaveBeenCalledTimes(2));
  });

  it('supports dynamic array growth, shrink, and reindexed errors', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { children: ['Alice'] },
      schema: z.object({
        children: z.array(z.string().min(1, 'Child name is required')),
      }),
    }));

    await act(async () => {
      await result.current.validate();
    });
    expect(result.current.valid).toBe(true);

    act(() => {
      result.current.value.children.push('');
    });
    await waitFor(() => expect(result.current.valid).toBe(false));
    expect(result.current.errors.children?.[1]).toEqual([
      'Child name is required',
    ]);

    act(() => {
      result.current.value.children.splice(0, 1);
    });
    await waitFor(() => {
      expect(result.current.errors.children?.[0]).toEqual([
        'Child name is required',
      ]);
    });
    expect(result.current.errors.children?.[1]).toBeUndefined();

    act(() => {
      result.current.value.children[0] = 'Bob';
      result.current.value.children.push('');
    });
    await waitFor(() => {
      expect(result.current.errors.children?.[1]).toEqual([
        'Child name is required',
      ]);
    });

    act(() => {
      result.current.value.children.pop();
    });
    await waitFor(() => expect(result.current.valid).toBe(true));
    expect(result.current.errors).toEqual({});
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

  it('never lets a stale async validate call authorize submission', async () => {
    const delayed = async (value) => {
      await new Promise((resolve) => setTimeout(resolve, value === 'good' ? 30 : 1));
      return value === 'good' || 'Value is invalid';
    };
    const { result } = renderHook(() => useValidation({
      initialValue: { status: 'good' },
      validate: { status: { delayed } },
    }));

    let submitValidation;
    act(() => {
      submitValidation = result.current.validate();
    });

    act(() => {
      result.current.value.status = 'bad';
    });

    let allowed;
    await act(async () => {
      allowed = await submitValidation;
      await new Promise((resolve) => setTimeout(resolve, 40));
    });

    expect(allowed).toBe(false);
    expect(result.current.value.status).toBe('bad');
    expect(result.current.errors.status).toEqual(['Value is invalid']);
    expect(result.current.valid).toBe(false);
  });

  it('validates cross-field rules against one coherent snapshot', async () => {
    const { result } = renderHook(() => useValidation({
      initialValue: { password: 'one', confirm: 'one' },
      validate: {
        confirm: {
          matches: async (value, form) => {
            await new Promise((resolve) => setTimeout(resolve, 20));
            return value === form.password || 'Passwords must match';
          },
        },
      },
    }));

    let first;
    act(() => {
      first = result.current.validate();
    });

    act(() => {
      result.current.value.password = 'two';
    });

    await act(async () => {
      await first;
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    expect(result.current.errors.confirm).toEqual(['Passwords must match']);
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

  it('normalizes prototype-like Standard Schema issue paths safely', async () => {
    const schema = {
      '~standard': {
        version: 1,
        vendor: 'prototype-path-test',
        validate() {
          return {
            issues: [
              { path: ['__proto__'], message: 'Reserved-looking field is invalid' },
              { path: ['constructor'], message: 'Constructor field is invalid' },
            ],
          };
        },
      },
    };
    const { result } = renderHook(() => useValidation({
      initialValue: { normal: '' },
      schema,
    }));

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.valid).toBe(false);
    expect(result.current.errors.__proto__).toEqual([
      'Reserved-looking field is invalid',
    ]);
    expect(result.current.errors.constructor).toEqual([
      'Constructor field is invalid',
    ]);
  });

  it('treats symbol-path Standard Schema issues as real errors', async () => {
    const field = Symbol('field');
    const schema = {
      '~standard': {
        version: 1,
        vendor: 'symbol-test',
        validate() {
          return {
            issues: [{ path: [field], message: 'Symbol field is invalid' }],
          };
        },
      },
    };
    const { result } = renderHook(() => useValidation({
      initialValue: {},
      schema,
    }));

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.valid).toBe(false);
    expect(result.current.errors[field]).toEqual(['Symbol field is invalid']);
  });

  it('contains failures from automatic async validation without unhandled rejection', async () => {
    const error = new Error('network unavailable');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useValidation({
      initialValue: { username: 'ok' },
      validate: {
        username: {
          available: async (value) => {
            if (value === 'throw') throw error;
            return true;
          },
        },
      },
    }));

    await act(async () => {
      await result.current.validate();
    });

    act(() => {
      result.current.value.username = 'throw';
    });

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        '[use-validation] automatic validation failed',
        error,
      );
    });
    expect(result.current.validating).toBe(false);
    consoleError.mockRestore();
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
