import generateCode from '../codegen';

const input = {
  method: 'POST',
  url: 'https://api.example.com/v1/pages',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer abcdefghijklmnop3f9a',
  },
  body: '{"id":1}',
};

describe('generateCode — curl', () => {
  it('includes the method, headers and body', () => {
    const out = generateCode('curl', input);

    expect(out).toContain("curl 'https://api.example.com/v1/pages'");
    expect(out).toContain('-X POST');
    expect(out).toContain("-H 'Content-Type: application/json'");
    expect(out).toContain(`--data-raw '{"id":1}'`);
  });

  it('omits -X for a GET', () => {
    const out = generateCode('curl', {
      ...input,
      method: 'GET',
      body: undefined,
    });
    expect(out).not.toContain('-X');
  });

  it('escapes single quotes so the command stays paste-safe', () => {
    const out = generateCode('curl', {
      ...input,
      body: `{"name":"O'Brien"}`,
    });

    expect(out).toContain(`O'\\''Brien`);
  });

  it('substitutes a placeholder when redacting', () => {
    const out = generateCode('curl', input, { redact: true });

    expect(out).toContain("-H 'Authorization: $TOKEN'");
    expect(out).not.toContain('abcdefghijklmnop');
  });

  it('continues lines with a trailing backslash', () => {
    expect(generateCode('curl', input)).toContain(' \\\n  ');
  });
});

describe('generateCode — httpie', () => {
  it('uses the header:value form', () => {
    const out = generateCode('httpie', { ...input, body: undefined });

    expect(out).toContain('http POST');
    expect(out).toContain("'Content-Type:application/json'");
  });

  it('pipes a body in through stdin', () => {
    expect(generateCode('httpie', input)).toMatch(/^echo '/);
  });
});

describe('generateCode — fetch', () => {
  it('emits valid javascript with method, headers and body', () => {
    const out = generateCode('fetch', input);

    expect(out).toContain('await fetch("https://api.example.com/v1/pages"');
    expect(out).toContain('"method": "POST"');
    expect(out).toContain('"body": "{\\"id\\":1}"');
  });

  it('redacts headers when asked', () => {
    const out = generateCode('fetch', input, { redact: true });
    expect(out).toContain('"$TOKEN"');
  });
});
