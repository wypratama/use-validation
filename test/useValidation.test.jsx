// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
    expect(result.current.dirty).toBe(false);

    let valid;
    await act(async () => {
      valid = await result.current.validate();
    });

    expect(valid).toBe(false);
    expect(result.current.errors.email).toEqual(['Email is required']);
    expect(result.current.errors.age).toEqual(['Must be 18+']);
    expect(result.current.valid).toBe(false);
    expect(result.current.dirty).toBe(true);

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

    act(() => {
      result.current.value.profile.email = 'nested@example.com';
    });

    await waitFor(() => expect(result.current.valid).toBe(true));
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
    expect(result.current.dirty).toBe(false);
    expect(result.current.valid).toBe(true);
  });

  it('requires exactly one validation strategy', () => {
    expect(() => renderHook(() => useValidation({ initialValue: {} }))).toThrow(
      'exactly one of validate or schema',
    );
  });
});
