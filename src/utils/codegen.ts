import { Headers } from '../types';
import { isRedactableHeader, placeholderForHeader } from './redact';

export type CodeFormat = 'curl' | 'httpie' | 'fetch';

export type CodegenInput = {
  method: string;
  url: string;
  headers: Headers;
  body?: string;
};

export type CodegenOptions = {
  /** Swap secrets for `$TOKEN`-style placeholders. */
  redact?: boolean;
};

const escapeSingleQuotes = (value: string) =>
  String(value).replace(/'/g, `'\\''`);

const headerValue = (
  name: string,
  value: string,
  options: CodegenOptions | undefined
) =>
  options?.redact && isRedactableHeader(name)
    ? placeholderForHeader(name)
    : value;

/**
 * Multi-line with trailing backslashes, matching the mock. The 14px
 * hanging indent in the design is applied by the renderer, not here —
 * the string stays paste-ready for a terminal.
 */
const toCurl = (input: CodegenInput, options?: CodegenOptions) => {
  const lines: string[] = [`curl '${escapeSingleQuotes(input.url)}'`];

  if (input.method && input.method.toUpperCase() !== 'GET') {
    lines.push(`-X ${input.method.toUpperCase()}`);
  }

  Object.entries(input.headers ?? {}).forEach(([name, value]) => {
    const shown = headerValue(name, String(value), options);
    lines.push(`-H '${name}: ${escapeSingleQuotes(shown)}'`);
  });

  if (input.body) {
    lines.push(`--data-raw '${escapeSingleQuotes(input.body)}'`);
  }

  return lines.join(' \\\n  ');
};

const toHttpie = (input: CodegenInput, options?: CodegenOptions) => {
  const parts: string[] = ['http'];

  if (input.method) parts.push(input.method.toUpperCase());
  parts.push(`'${escapeSingleQuotes(input.url)}'`);

  const lines = [parts.join(' ')];

  Object.entries(input.headers ?? {}).forEach(([name, value]) => {
    const shown = headerValue(name, String(value), options);
    lines.push(`'${name}:${escapeSingleQuotes(shown)}'`);
  });

  if (input.body) {
    // HTTPie reads a raw body from stdin.
    return `echo '${escapeSingleQuotes(input.body)}' | ${lines.join(' \\\n  ')}`;
  }

  return lines.join(' \\\n  ');
};

const toFetch = (input: CodegenInput, options?: CodegenOptions) => {
  const headers = Object.entries(input.headers ?? {}).reduce<
    Record<string, string>
  >((acc, [name, value]) => {
    acc[name] = headerValue(name, String(value), options);
    return acc;
  }, {});

  const init: Record<string, unknown> = {
    method: (input.method || 'GET').toUpperCase(),
  };
  if (Object.keys(headers).length) init.headers = headers;
  if (input.body) init.body = input.body;

  return `await fetch(${JSON.stringify(input.url)}, ${JSON.stringify(
    init,
    null,
    2
  )});`;
};

const generators: Record<
  CodeFormat,
  (input: CodegenInput, options?: CodegenOptions) => string
> = {
  curl: toCurl,
  httpie: toHttpie,
  fetch: toFetch,
};

export const generateCode = (
  format: CodeFormat,
  input: CodegenInput,
  options?: CodegenOptions
) => generators[format](input, options);

export const CODE_FORMAT_LABELS: Record<CodeFormat, string> = {
  curl: 'cURL',
  httpie: 'HTTPie',
  fetch: 'fetch()',
};

export default generateCode;
