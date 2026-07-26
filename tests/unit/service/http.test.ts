import { describe, expect, it } from 'vitest';
import { AppError, created, fromError, ok } from '@/server/lib/http';

describe('AppError', () => {
  it('creates error with correct properties', () => {
    const err = new AppError('NOT_FOUND', 'Resource not found', 404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
    expect(err.status).toBe(404);
    expect(err.name).toBe('AppError');
  });

  it('defaults status to 400', () => {
    const err = new AppError('INVALID_INPUT', 'Bad input');
    expect(err.status).toBe(400);
  });
});

describe('fromError', () => {
  it('handles AppError', async () => {
    const err = new AppError('NOT_FOUND', 'Not found', 404);
    const res = fromError(err);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('handles ZodError-like object', async () => {
    const zodErr = {
      name: 'ZodError',
      issues: [{ path: ['name'], message: 'Required' }],
    };
    const res = fromError(zodErr);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('handles unknown error', async () => {
    const res = fromError(new Error('something broke'));
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INTERNAL');
  });
});

describe('ok helper', () => {
  it('returns 200 with data', async () => {
    const res = ok({ id: '123' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe('123');
  });
});

describe('created helper', () => {
  it('returns 201 with data', async () => {
    const res = created({ id: 'new-id' });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
