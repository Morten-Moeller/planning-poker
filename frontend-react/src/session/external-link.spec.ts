import { describe, expect, it } from 'vitest';
import { externalUrl } from './external-link';

describe('externalUrl', () => {
  it.each(['https://gitlab.example/group/project/-/issues/42', 'http://gitlab.local/a'])(
    'keeps %s',
    (url) => {
      expect(externalUrl(url)).toBe(url);
    },
  );

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    '/group/project',
    'gitlab.example/group/project',
    '',
  ])('gives no address for %s', (url) => {
    expect(externalUrl(url)).toBeNull();
  });

  it('gives no address without a value', () => {
    expect(externalUrl(null)).toBeNull();
    expect(externalUrl(undefined)).toBeNull();
  });
});
