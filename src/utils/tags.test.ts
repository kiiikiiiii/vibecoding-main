import { describe, it, expect } from 'vitest';
import { MAX_TAGS, addTags, normalizeTag, validateTag } from './tags';

const tenTags = Array.from({ length: MAX_TAGS }, (_, i) => `tag${i}`);

describe('normalizeTag', () => {
  it('앞뒤 공백을 제거한다', () => {
    expect(normalizeTag('  react  ')).toBe('react');
  });

  it('맨 앞의 #을 제거하고 다시 trim한다', () => {
    expect(normalizeTag('#react')).toBe('react');
    expect(normalizeTag(' # react ')).toBe('react');
  });

  it('태그 안의 공백은 유지한다', () => {
    expect(normalizeTag('할 일')).toBe('할 일');
  });
});

describe('validateTag', () => {
  it('정규화된 태그를 돌려준다', () => {
    expect(validateTag(' #React ', [])).toEqual({ ok: true, tag: 'React' });
  });

  it('빈 값과 #만 있는 값은 메시지 없이 거부한다', () => {
    expect(validateTag('   ', [])).toEqual({ ok: false, error: null });
    expect(validateTag('#', [])).toEqual({ ok: false, error: null });
  });

  it('20자는 허용하고 21자는 거부한다', () => {
    expect(validateTag('a'.repeat(20), []).ok).toBe(true);
    expect(validateTag('a'.repeat(21), [])).toEqual({
      ok: false,
      error: '태그는 20자까지 입력할 수 있습니다',
    });
  });

  it('대소문자를 무시하고 중복을 거부한다', () => {
    expect(validateTag(' react ', ['React'])).toEqual({
      ok: false,
      error: '이미 추가된 태그입니다',
    });
  });

  it('이미 10개면 거부한다', () => {
    expect(validateTag('new', tenTags)).toEqual({
      ok: false,
      error: '태그는 최대 10개까지 추가할 수 있습니다',
    });
  });
});

describe('addTags', () => {
  it('여러 개를 순서대로 추가한다', () => {
    expect(addTags(['a', ' b', 'c '], [])).toEqual({ tags: ['a', 'b', 'c'], error: null });
  });

  it('입력 안의 중복도 걸러낸다', () => {
    expect(addTags(['a', 'A'], [])).toEqual({ tags: ['a'], error: '이미 추가된 태그입니다' });
  });

  it('9개일 때 3개를 넣으면 1개만 추가되고 개수 초과 메시지를 돌려준다', () => {
    const result = addTags(['a', 'b', 'c'], tenTags.slice(0, 9));
    expect(result.tags).toHaveLength(10);
    expect(result.tags[9]).toBe('a');
    expect(result.error).toBe('태그는 최대 10개까지 추가할 수 있습니다');
  });

  it('추가된 게 없으면 원래 배열을 그대로 돌려준다', () => {
    const existing = ['a'];
    expect(addTags(['  '], existing).tags).toBe(existing);
  });
});
