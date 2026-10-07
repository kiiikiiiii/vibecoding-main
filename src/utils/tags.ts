export const MAX_TAG_LENGTH = 20;
export const MAX_TAGS = 10;

// error가 null이면 메시지 없이 조용히 무시
export type TagResult = { ok: true; tag: string } | { ok: false; error: string | null };

export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').trim();
}

export function validateTag(raw: string, existing: string[]): TagResult {
  const tag = normalizeTag(raw);
  if (!tag) return { ok: false, error: null };
  if (tag.length > MAX_TAG_LENGTH) {
    return { ok: false, error: `태그는 ${MAX_TAG_LENGTH}자까지 입력할 수 있습니다` };
  }
  const lower = tag.toLowerCase();
  if (existing.some((t) => t.toLowerCase() === lower)) {
    return { ok: false, error: '이미 추가된 태그입니다' };
  }
  if (existing.length >= MAX_TAGS) {
    return { ok: false, error: `태그는 최대 ${MAX_TAGS}개까지 추가할 수 있습니다` };
  }
  return { ok: true, tag };
}

// 여러 입력을 앞에서부터 추가. 실패한 항목은 건너뛰고 마지막 에러 메시지를 돌려줌
export function addTags(
  raws: string[],
  existing: string[],
): { tags: string[]; error: string | null } {
  let tags = existing;
  let error: string | null = null;
  for (const raw of raws) {
    const result = validateTag(raw, tags);
    if (result.ok) {
      tags = [...tags, result.tag];
    } else if (result.error) {
      error = result.error;
    }
  }
  return { tags, error };
}
