import { slugify } from 'src/common/utils/slug.util';
import { generateOpaqueToken, sha256 } from 'src/common/utils/crypto.util';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Acme Pvt Ltd')).toBe('acme-pvt-ltd');
  });
  it('strips punctuation and trims hyphens', () => {
    expect(slugify('  Hello, World!! ')).toBe('hello-world');
  });
  it('falls back gracefully on empty-ish input', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('crypto util', () => {
  it('generates distinct opaque tokens', () => {
    expect(generateOpaqueToken()).not.toEqual(generateOpaqueToken());
  });
  it('hashes deterministically', () => {
    expect(sha256('abc')).toEqual(sha256('abc'));
    expect(sha256('abc')).not.toEqual(sha256('abd'));
  });
});
