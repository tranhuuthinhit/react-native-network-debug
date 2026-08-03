import {
  isRedactableHeader,
  maskValue,
  placeholderForHeader,
  redactHeaders,
} from '../redact';

describe('maskValue', () => {
  it('keeps the scheme and the last four characters', () => {
    expect(maskValue('Bearer abcdefghijklmnop3f9a')).toBe(
      'Bearer ••••••••••••••••3f9a'
    );
  });

  it('masks a short secret entirely', () => {
    expect(maskValue('Bearer abc')).toBe('Bearer ••••••••••••••••');
  });

  it('masks a bare token with no scheme', () => {
    expect(maskValue('abcdefghijklmnop')).toBe('••••••••••••••••mnop');
  });

  it('is case-insensitive about the scheme', () => {
    expect(maskValue('bearer abcdefghijklmnop3f9a')).toBe(
      'bearer ••••••••••••••••3f9a'
    );
  });

  it('passes an empty value through', () => {
    expect(maskValue('')).toBe('');
  });
});

describe('isRedactableHeader', () => {
  it.each([
    'authorization',
    'Authorization',
    'AUTHORIZATION',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-csrf-token',
  ])('flags %s', (name) => {
    expect(isRedactableHeader(name)).toBe(true);
  });

  it('does not flag ordinary headers', () => {
    expect(isRedactableHeader('content-type')).toBe(false);
    expect(isRedactableHeader('accept')).toBe(false);
  });

  it('honours extra names case-insensitively', () => {
    expect(isRedactableHeader('X-Tenant-Secret', ['x-tenant-secret'])).toBe(
      true
    );
  });
});

describe('redactHeaders', () => {
  const headers = {
    'Authorization': 'Bearer abcdefghijklmnop3f9a',
    'Content-Type': 'application/json',
  };

  it('masks only the sensitive header and reports which it masked', () => {
    const result = redactHeaders(headers, { enabled: true });

    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.headers.Authorization).toBe('Bearer ••••••••••••••••3f9a');
    expect(Array.from(result.redacted)).toEqual(['Authorization']);
  });

  it('is a no-op when disabled', () => {
    const result = redactHeaders(headers, { enabled: false });
    expect(result.headers).toBe(headers);
    expect(result.redacted.size).toBe(0);
  });
});

describe('placeholderForHeader', () => {
  it('uses $TOKEN for authorization', () => {
    expect(placeholderForHeader('Authorization')).toBe('$TOKEN');
  });

  it('uses $COOKIE for cookies', () => {
    expect(placeholderForHeader('Set-Cookie')).toBe('$COOKIE');
  });

  it('derives a shell-safe name for anything else', () => {
    expect(placeholderForHeader('x-api-key')).toBe('$X_API_KEY');
  });
});
