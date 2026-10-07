# 태그 기능 상세 스펙 (spec-fixed)

> 원본: `spec-original.md`. 원본의 요구사항을 현재 코드 구조(`CLAUDE.md` 참고)에 맞춰 구체화한 구현 기준 문서.
> 결정 근거는 각 항목의 "이유"에 적는다. 이 문서에 없는 동작은 구현하지 않는다.

## 1. 범위

**포함**

- 노트 편집 화면(`NoteEditor`)에서 태그 추가 · 삭제 · 목록 확인 (생성 모드와 편집 모드 모두)
- 태그 저장 (json-server `db.json`)

**제외** (이번 범위 아님)

- 사이드바 카드(`NoteItem`)에 태그 표시
- 태그로 필터링·검색, 태그 자동완성, 태그 이름 일괄 변경, 태그 색상

이유: 원본 스펙이 "노트 상세 화면에서 확인"만 요구함. 이 앱에서 상세 화면 역할은 `NoteEditor`가 함.

## 2. 데이터 구조

```ts
// src/types/note.ts
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[]; // 필수. 태그가 없으면 []
  createdAt: string;
  updatedAt: string;
}
```

- `tags`는 **필수** 필드, 값은 정규화된 문자열 배열 (사용자 결정).
- 배열 순서 = 사용자가 추가한 순서. 정렬하지 않는다.
- `db.json`의 기존 노트 4개에 `"tags": []`를 추가한다.
- `api/notes.ts`의 `fetchNotes`에서 `tags`가 없는 노트는 `[]`로 채운다 (서버 데이터 경계에서 한 번만 방어).
  컴포넌트에서는 `note.tags ?? []` 같은 방어 코드를 쓰지 않는다.
- API 변경 없음: `createNote`는 입력 타입(`Omit<Note, 'id' | 'createdAt' | 'updatedAt'>`)에 `tags`가 자동 포함되고,
  `updateNote`는 PATCH로 `tags` 배열 전체를 교체한다.

## 3. 태그 규칙 (정규화 · 검증)

입력 문자열 하나를 태그로 만들 때 아래 순서로 처리한다.

| 순서 | 규칙                                                     | 실패 시                                   |
| ---- | -------------------------------------------------------- | ----------------------------------------- |
| 1    | 앞뒤 공백 제거 (`trim`)                                  | -                                         |
| 2    | 맨 앞의 `#` 제거 (`#react` → `react`), 제거 후 다시 trim | -                                         |
| 3    | 빈 문자열이면 거부                                       | 조용히 무시 (메시지 없음)                 |
| 4    | 길이 20자 초과면 거부 (자르지 않음)                      | "태그는 20자까지 입력할 수 있습니다"      |
| 5    | **대소문자 무시**로 기존 태그와 같으면 거부              | "이미 추가된 태그입니다"                  |
| 6    | 노트의 태그가 이미 10개면 거부                           | "태그는 최대 10개까지 추가할 수 있습니다" |

- 저장되는 값은 2단계까지 정규화한 문자열이며, **대소문자는 사용자가 처음 입력한 그대로** 유지한다.
  (예: `React`가 있으면 `react` 추가는 거부되고 `React`가 남음)
- 태그 안의 공백은 허용 (`할 일`). 쉼표(`,`)는 구분자라서 태그에 들어갈 수 없다.
- 이유: 대소문자만 다른 태그는 사용자 입장에서 같은 태그라서 중복으로 본다. 길이·개수 제한은 카드 레이아웃이
  깨지지 않게 하기 위한 값.

규칙은 순수 함수로 `src/utils/tags.ts`에 둔다.

```ts
export const MAX_TAG_LENGTH = 20;
export const MAX_TAGS = 10;
export function normalizeTag(raw: string): string;
// 성공하면 { ok: true, tag }, 실패하면 { ok: false, error: string | null } (error null = 조용히 무시)
export function validateTag(raw: string, existing: string[]): TagResult;
```

## 4. UI

### 위치

`NoteEditor` 안, **제목 아래 구분선과 내용(textarea) 사이**에 태그 영역을 둔다.

### 구성 (새 컴포넌트 `src/components/TagInput.tsx`)

```
[react ×] [할 일 ×] [공부 ×]  [태그 입력 후 Enter      ]
이미 추가된 태그입니다            ← 에러 메시지 (있을 때만)
```

- 태그 칩과 입력창이 한 줄에 이어지고, 넘치면 다음 줄로 감김 (`flex flex-wrap gap-2`).
- 칩: `bg-muted text-foreground text-xs rounded-full px-2.5 py-1`, `×` 버튼은 `hover:text-destructive`.
- 입력창: 테두리 없는 투명 input (제목 input과 같은 톤), placeholder `태그 입력 후 Enter`.
- 에러 메시지: 입력창 아래 `text-xs text-destructive`. **`alert`는 쓰지 않는다** (입력 중 자주 나와 흐름을 끊으므로).
  다음 입력이 바뀌면 메시지를 지운다.
- 태그가 0개일 때는 입력창만 보인다.
- 태그가 10개면 입력창을 `disabled`로 바꾸고 placeholder를 `태그는 최대 10개`로 바꾼다.
- 접근성: 입력창 `aria-label="태그 입력"`, `×` 버튼 `aria-label="{태그} 태그 삭제"`, `type="button"`.

### 컴포넌트 인터페이스 (기존 패턴: named export, `XxxProps`, controlled)

```ts
interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}
export function TagInput({ tags, onChange }: TagInputProps);
```

- 입력 중인 텍스트와 에러 메시지만 `TagInput` 내부 state로 가진다. 태그 배열은 `NoteEditor`가 소유.

### 조작

| 동작                                                        | 결과                                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 입력 후 `Enter`                                             | 3장 규칙 통과 시 태그 추가, 입력창 비움                                            |
| `,` 입력                                                    | `Enter`와 동일하게 쉼표 앞 텍스트를 추가                                           |
| 쉼표가 포함된 텍스트 붙여넣기 (`a, b, c`)                   | 쉼표로 나눠 앞에서부터 하나씩 추가. 실패한 항목은 건너뛰고 마지막 에러 메시지 표시 |
| 칩의 `×` 클릭                                               | 해당 태그 삭제                                                                     |
| 입력창이 비어 있을 때 `Backspace`                           | 마지막 태그 삭제                                                                   |
| 한글 조합 중 `Enter` (`e.nativeEvent.isComposing === true`) | **무시**. 조합이 끝난 뒤의 Enter만 처리                                            |

- `Enter`는 `preventDefault()` 한다 (향후 form으로 감싸도 제출되지 않게).

## 5. 저장 흐름

- 태그 추가·삭제는 **폼 상태만 바꾸고, 기존 "저장" 버튼을 눌러야 서버에 반영**된다. 제목·내용과 같은 방식.
  - 이유: 지금 에디터는 저장 버튼 한 번으로 반영하는 구조라 태그만 즉시 저장하면 동작이 섞여 혼란스러움.
    생성 모드에서는 저장 전에 노트 id가 없어 즉시 저장이 불가능하기도 함.
- `NoteEditor`에 `const [tags, setTags] = useState<string[]>([])` 추가.
  기존 폼 동기화 `useEffect`에서 `title`·`content`와 함께 `tags`도 동기화 (편집: `selectedNote.tags`, 생성: `[]`).
- 입력창에 Enter 없이 텍스트를 남겨 둔 채 포커스가 빠지면(`onBlur`) 3장 규칙으로 추가를 시도한다.
  통과하면 태그가 되고, 실패하면 텍스트와 에러 메시지를 그대로 둔다. (Enter를 깜빡하고 저장을 누른 경우를 구제)
  - 저장 버튼을 누르면 mousedown에서 blur가 먼저 일어나 태그가 반영된 뒤 click이 처리되므로, 입력 텍스트를
    `NoteEditor`로 끌어올릴 필요가 없다.
- Context 액션 시그니처 변경:
  - `addNote(title: string, content: string, tags: string[])` — 기존 위치 인자 방식 유지
  - `editNote(id, { title, content, tags })` — 기존 `Partial<Note>` 그대로
- 취소 버튼: 편집 모드에서 취소하면 제목·내용·**태그를 저장된 값으로 되돌린다.**
  (현재는 취소해도 폼 값이 그대로 남는 문제가 있어 태그 추가와 함께 수정)

## 6. 엣지 케이스 정리

| 상황                              | 기대 동작                                                    |
| --------------------------------- | ------------------------------------------------------------ |
| 공백만 입력 / `#`만 입력 후 Enter | 아무 일 없음, 메시지 없음                                    |
| `React`가 있는데 `react` 입력     | 거부, "이미 추가된 태그입니다"                               |
| 21자 입력                         | 거부 (자르지 않음), 길이 메시지                              |
| 10개 상태에서 붙여넣기            | 추가 안 됨 (입력창 비활성)                                   |
| 9개 상태에서 `a, b, c` 붙여넣기   | `a`만 추가, 개수 초과 메시지                                 |
| 한글 입력 후 Enter                | 태그 1개만 추가 (중복 추가 안 됨)                            |
| 태그 추가 후 다른 노트 선택       | 저장 안 된 태그는 버려짐 (제목·내용과 동일)                  |
| 태그 추가 후 취소                 | 저장된 값으로 복원                                           |
| 서버에 `tags`가 없는 노트         | `fetchNotes`에서 `[]`로 보정되어 정상 표시                   |
| 저장 실패                         | 기존과 같이 `alert('저장에 실패했습니다')`, 폼의 태그는 유지 |

## 7. 변경 파일

| 파일                                 | 변경                                                  |
| ------------------------------------ | ----------------------------------------------------- |
| `src/types/note.ts`                  | `tags: string[]` 추가, "강의에서 추가할 것" 주석 제거 |
| `db.json`                            | 기존 노트에 `"tags": []`                              |
| `src/api/notes.ts`                   | `fetchNotes`에서 `tags` 기본값 보정                   |
| `src/utils/tags.ts` (신규)           | `normalizeTag`, `validateTag`, 상수                   |
| `src/components/TagInput.tsx` (신규) | 태그 칩 + 입력 UI                                     |
| `src/context/NotesContext.tsx`       | `addNote`에 `tags` 인자 추가                          |
| `src/components/NoteEditor.tsx`      | `tags` state, 동기화, `TagInput` 배치, 저장·취소 처리 |

## 8. 테스트 (Vitest + Testing Library)

이 기능이 프로젝트의 첫 테스트가 된다. (테스트 파일이 생기면 `npm test`도 정상 종료됨)

- `src/utils/tags.test.ts`: 3장 규칙 표의 각 행 (trim, `#` 제거, 빈 값, 20자, 대소문자 중복, 10개 제한)
- `src/components/TagInput.test.tsx`:
  - Enter로 추가, `×`로 삭제, 빈 입력에서 Backspace로 마지막 삭제
  - 쉼표 입력·붙여넣기로 여러 개 추가
  - 중복 입력 시 에러 메시지 표시 후 다음 입력에서 사라짐
  - 조합 중(`isComposing`) Enter는 무시
  - 10개일 때 입력창 비활성

## 9. 완료 조건

- [ ] 생성·편집 모드 모두에서 태그를 추가·삭제하고 저장하면 새로고침 후에도 유지됨
- [ ] 6장 엣지 케이스가 모두 기대대로 동작
- [ ] `npm run build`, `npm run lint`, `npm test` 통과
- [ ] 새 코드가 `CLAUDE.md`의 컴포넌트·네이밍·스타일 패턴(토큰 색상, named export, `XxxProps`)을 따름
