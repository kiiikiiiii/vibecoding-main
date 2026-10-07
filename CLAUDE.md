# CLAUDE.md

이 파일은 이 저장소에서 작업할 때 Claude Code가 참고하는 가이드입니다.

## 프로젝트 목적

React 19 + TypeScript + Vite로 만든 **노트 앱 실습 프로젝트**입니다. 강의(바이브코딩/하네스 실습)용 출발점 코드로,
기능을 단계적으로 추가해 나가는 것이 목적입니다. 예: `src/types/note.ts`에 "tags 필드는 강의에서 추가할 것"이라는
주석이 있음. 그러니 코드를 크게 재설계하기보다 **기존 패턴을 따라 작게 확장**하는 쪽을 우선합니다.

- 기능: 노트 목록 조회 / 생성 / 수정 / 삭제 (CRUD)
- 백엔드: 별도 서버 없이 `json-server`가 `db.json`을 REST API로 제공 (포트 3001)
- UI 언어: 한국어 (`index.html`의 `lang="ko"`, 모든 문구가 한국어)

## 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | Vite(5173) + json-server(3001) 동시 실행 (`concurrently`) |
| `npm run server` | json-server만 실행 |
| `npm run build` | `tsc` 타입 체크 후 `vite build` |
| `npm run lint` | ESLint (**`--fix` 포함 — 파일이 수정됨**) |
| `npm run format` | Prettier로 전체 포맷 (파일 수정됨) |
| `npm test` / `npm run test:watch` | Vitest (jsdom, globals) |

- 단일 테스트 실행: `npx vitest run src/path/to/file.test.tsx` 또는 `-t "테스트 이름"`
- 현재 테스트 파일은 **하나도 없음**. 테스트 환경(`vite.config.ts`의 `test`, `src/test-setup.ts`의 jest-dom)만 준비됨.
- 앱/API가 동작하려면 json-server가 떠 있어야 함. `db.json`은 실행 중 실제로 수정되므로 커밋 시 주의.

## 기술 스택

- React 19, TypeScript 5 (strict, `noUnusedLocals`, `noUnusedParameters`)
- Vite 6 + `@vitejs/plugin-react`
- Tailwind CSS v4 (`@tailwindcss/vite` 플러그인, `tailwind.config` 파일 없음 — 테마는 CSS `@theme`에 정의)
- json-server 1.0 beta (id는 자동 생성 시 문자열, 예: `"dP_NPYuHV94"`)
- Vitest 3 + Testing Library + jsdom
- ESLint 9 flat config (typescript-eslint, react-hooks, react-refresh), Prettier

## 디렉터리 구조

```
index.html              # 폰트 로드 (Pretendard CDN, Google Fonts Boogaloo)
db.json                 # json-server 데이터 (notes 컬렉션)
src/
├── main.tsx            # 진입점, StrictMode
├── App.tsx             # 화면 상태(selectedNoteId, isCreating) 보유, Provider + Layout 조립
├── index.css           # Tailwind import + @theme 디자인 토큰
├── test-setup.ts       # jest-dom 등록
├── api/notes.ts        # fetch 기반 REST 호출 (fetch/create/update/delete)
├── context/NotesContext.tsx  # 전역 노트 상태 + useNotes 훅
├── components/
│   ├── Layout.tsx      # 헤더(+새 노트 버튼) / 사이드바 / 메인 슬롯
│   ├── NoteList.tsx    # 로딩·에러·빈 상태 처리 후 NoteItem 렌더
│   ├── NoteItem.tsx    # 카드 1개, 선택/삭제
│   └── NoteEditor.tsx  # 생성/편집 폼 겸용
└── types/note.ts       # Note 인터페이스
```

## 아키텍처 & 데이터 흐름

```
Component ──useNotes()──▶ NotesContext ──api.*──▶ json-server (db.json)
                              │
                         notes 상태 갱신 (낙관적 업데이트 아님: 서버 응답 후 반영)
```

- **3계층 분리**: `api/`(HTTP만) → `context/`(상태 + 액션) → `components/`(UI). 새 기능도 `types/` → `api/` →
  `context/` → `components/` 순으로 같은 구조를 따른다.

## 컴포넌트 구현 패턴

- 함수 선언식 + **named export** (`export function NoteList`). `App`만 default export(진입점 관례).
- Props는 컴포넌트 바로 위에 `interface XxxProps`로 정의하고 파라미터에서 구조분해. UI 조각은 `ReactNode`
  slot prop으로 받음 (`Layout`의 `sidebar`/`main`).
- 데이터가 필요한 컴포넌트는 `useNotes()`를 직접 호출(`NoteList`, `NoteEditor`), 표시 전용 컴포넌트는 props만
  받음(`NoteItem`, `Layout`).
- 렌더 분기는 로딩 → 에러 → 빈 상태 → 본문 순서의 early return (`NoteList`).
- 파생 값은 렌더 중 계산 (`notes.find(...)`). `useMemo`/`useCallback`/`memo`는 쓰지 않음.
- 공용 UI 컴포넌트 없음. 버튼은 Tailwind 클래스를 직접 씀 — primary `bg-foreground text-card rounded-xl`,
  secondary `bg-muted text-muted-foreground`. 카드 안의 버튼은 `e.stopPropagation()`.
- 스타일은 Tailwind 클래스 + `src/index.css` `@theme` 색상 토큰(`bg-card`, `text-foreground`, `border-border`,
  `text-muted-foreground`, `text-destructive` 등)만 쓴다. 그림자는 `shadow-[0_2px_12px_rgba(0,0,0,0.07)]` 형태.

## 상태 관리

- **서버 데이터**: `NotesContext` 하나가 `notes`, `loading`, `error`와 액션(`addNote`/`editNote`/`removeNote`)을
  제공. 외부 상태 라이브러리 없음. 초기 로드는 Provider 마운트 시 `useEffect`에서 1회.
- **UI 상태**(선택된 노트, 생성 모드): `App.tsx`의 `useState` → props로 전달(lifting state up).
- **폼 상태**: 각 컴포넌트의 로컬 `useState` + controlled input.
- Context는 `createContext<T | null>(null)` + `useNotes()`에서 null이면 throw. Provider와 훅은 같은 파일에서 export.
- 갱신은 서버 응답 후 반영(낙관적 업데이트 아님)하고 항상 함수형 업데이트: 추가 `[...prev, x]`, 수정 `map`
  교체, 삭제 `filter`.
- `useState` 제네릭은 nullable일 때만 명시 (`useState<string | null>(null)`), 나머지는 추론.

## API 호출 패턴

- HTTP 호출은 `src/api/*.ts`에서만. 컴포넌트는 `fetch`나 `api/*`를 직접 부르지 않고 Context 액션만 사용.
  Context에서는 `import * as api from '../api/notes'`로 네임스페이스 import.
- 함수 형태: `export async function` → `` fetch(`${API_URL}/notes/${id}`) `` → `if (!res.ok) throw new
  Error('Failed to <동사> note')` → `return res.json()` (삭제는 `Promise<void>`).
- `API_URL`은 파일 상단 상수(`http://localhost:3001`). 생성 `POST`, 수정 `PATCH`(부분 업데이트), JSON 바디는
  `headers: { 'Content-Type': 'application/json' }` + `JSON.stringify`.
- 타임스탬프는 api 계층에서 `new Date().toISOString()`으로 주입 (생성: `createdAt`·`updatedAt`, 수정: `updatedAt`).
- 타입: 입력 `Omit<Note, 'id' | 'createdAt' | 'updatedAt'>` / `Partial<Note>`, 반환 `Promise<Note>`.

## 네이밍 패턴

| 대상 | 규칙 | 예 |
|------|------|----|
| 컴포넌트 | PascalCase, 파일명 = 컴포넌트명 | `NoteEditor.tsx` |
| api 파일 / 타입 파일 | 리소스 복수형 / 엔티티 단수형 | `api/notes.ts`, `types/note.ts` |
| Props 타입 | `컴포넌트명 + Props` | `NoteItemProps` |
| Context 묶음 | `XxxContext`, `XxxContextType`, `XxxProvider`, `useXxx` | `NotesProvider`, `useNotes` |
| 콜백 prop / 내부 핸들러 | `onXxx` / `handleXxx` | `onSelect` / `handleSave` |
| API 함수 | `fetch`·`create`·`update`·`delete` + 엔티티 | `fetchNotes`, `deleteNote` |
| Context 액션 | `add`·`edit`·`remove` + 엔티티 (api와 동사를 다르게 씀) | `addNote`, `removeNote` |
| ID 변수 | `xxxId` | `selectedNoteId` |
| 문구 | UI 문구·주석은 한국어, 식별자·throw 메시지는 영어 | `'저장 중...'`, `'Failed to ...'` |

**포맷 (Prettier)**: 세미콜론, 작은따옴표, 들여쓰기 2칸, trailing comma `all`, printWidth 100.

## 패턴 불일치 (정리 필요)

1. **boolean 네이밍**: `isCreating`, `isSelected`는 `is` 접두사를 쓰지만 `loading`, `saving`은 안 씀.
   새 코드는 `isXxx`를 권장.
2. **에러 처리 방식이 3가지**: 초기 로드는 Context `error` 상태로 표시, 저장은 `try/catch` + `alert`, 삭제는
   처리가 없음(`removeNote` 실패 시 unhandled rejection).
3. **에러 메시지 언어 혼용**: api는 영어로 throw하는데 `NoteList`가 그대로 보여줘서 "오류: Failed to fetch
   notes"처럼 섞여서 표시됨.
4. **비동기 스타일**: Context 초기 로드만 `.then/.catch/.finally` 체인이고 나머지는 `async/await`.
5. **Context 액션 시그니처**: `addNote(title, content)`는 위치 인자, `editNote(id, updates: Partial<Note>)`는
   객체 인자. 또 `Partial<Note>`라서 `id`·`createdAt`까지 바꿀 수 있음.
6. **토큰 우회 인라인 style**: `Layout`만 `style={{ fontFamily: 'Boogaloo, sans-serif' }}`(`--font-display`
   토큰 미사용)와 `style={{ height: 'calc(100vh - 65px)' }}`(헤더 높이 매직넘버)를 씀. 나머지는 전부 Tailwind 클래스.
7. **미사용 토큰**: `--radius`는 정의만 있고, 실제로는 `rounded-xl`/`2xl`/`3xl`을 직접 씀.

## 알려진 이슈

- `NoteEditor` 폼 동기화 `useEffect`는 의존성을 `[selectedNoteId, isCreating]`로 제한하고 `exhaustive-deps`를
  끈 상태. 편집 중에 입력이 덮어써지지 않게 하려는 의도적 설정.
- 새 노트를 저장하면 그 노트가 선택되지 않고 빈 화면으로 돌아감.
- 선택된 노트를 삭제해도 `selectedNoteId`가 남아 있어 에디터에 이전 내용이 보이고, 저장하면 PATCH가 실패함.
- 삭제는 확인 창 없이 바로 실행됨. `Note`에는 아직 `tags` 필드가 없음(강의에서 추가 예정).
