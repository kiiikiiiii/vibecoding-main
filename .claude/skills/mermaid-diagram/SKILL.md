---
name: mermaid-diagram
description: src/ 디렉터리를 분석해 컴포넌트 간 의존성 관계와 상태 흐름을 Mermaid 다이어그램으로 시각화하고, docs/architecture/index.html로 저장한 뒤 브라우저로 연다. "구조 시각화", "아키텍처 다이어그램", "의존성 그래프", "Mermaid로 그려줘" 같은 요청에 사용.
---

# Mermaid 아키텍처 시각화

`src/`를 분석해서 프로젝트 구조를 Mermaid 다이어그램으로 그리고, 브라우저에서 바로 볼 수 있는 HTML 한 장으로 만든다.

- 분석 대상: `src/` (인자로 다른 경로가 주어지면 그 경로)
- 결과 파일: `docs/architecture/index.html` (폴더가 없으면 생성, 있으면 덮어씀)
- **가장 중요한 것은 컴포넌트 간 의존성 관계**, 그 다음이 상태 흐름

## 1단계: src/ 분석

`src/` 아래 모든 `.ts`/`.tsx` 파일을 실제로 읽는다(파일명만 보고 추측하지 않는다). 파일마다 아래를 뽑는다.

| 항목 | 찾는 방법 |
|------|-----------|
| 계층 | 디렉터리 (`components/`, `context/`, `api/`, `types/`, 루트) |
| import 관계 | 상대 경로 import(`./`, `../`)만. 외부 패키지는 제외 |
| 렌더 관계 | JSX에서 다른 컴포넌트를 렌더하는 곳 (`<NoteItem />`), slot prop으로 넘기는 곳 포함 |
| 상태 보유 | `useState`, `createContext`/Provider가 가진 값 |
| 상태 소비 | 커스텀 훅 호출(`useXxx()`)과 거기서 꺼내 쓰는 값·액션 |
| props 흐름 | 부모 → 자식으로 내려가는 데이터 props, 자식 → 부모로 올라가는 `onXxx` 콜백 |
| 외부 I/O | `fetch` 대상 URL·HTTP 메서드, 저장소(예: json-server `db.json`) |

`import`만 있는 관계(타입 import 등)와 실제 렌더/훅 사용 관계를 구분해 둔다. 다이어그램에서 선 모양을 다르게 쓴다.

## 2단계: 다이어그램 작성

아래 순서로 만든다. 1번은 반드시, 2·3번은 분석 결과로 표현 가능하면 넣는다.

1. **컴포넌트 의존성 (필수)** — `flowchart TD`
   - 디렉터리별 `subgraph`로 계층을 묶는다 (components / context / api / types / 외부).
   - 선 종류를 구분하고 범례에 적는다:
     - `-->|renders|` 렌더 관계
     - `-.->|useXxx|` 훅·Context 사용
     - `==>|HTTP|` 외부 API 호출
     - 타입만 import하는 관계는 `-.-` 로 흐리게, 너무 많으면 생략하고 범례에 생략했다고 적는다.
2. **상태 흐름** — `flowchart LR`
   - 상태가 사는 곳(Context 값, `useState`)을 노드로 두고,
   - props로 내려가는 데이터(실선)와 `onXxx` 콜백으로 올라오는 이벤트(점선)를 표시한다.
3. **대표 사용자 동작 시퀀스** — `sequenceDiagram`
   - 예: "노트 저장" 하나를 골라 Component → Context 액션 → api 함수 → 서버 → 상태 갱신 → 리렌더 순서로.

## 3단계: Mermaid 문법 주의사항 (렌더 오류 방지)

- 노드 ID는 영문·숫자만 (`NoteEditor`, `ctx`, `api_notes`). 표시 이름은 라벨에 따옴표로: `api_notes["api/notes.ts"]`
- 라벨 안의 `( ) { } [ ] /` 같은 특수문자는 반드시 `"..."`로 감싼다.
- HTML 안에 넣으므로 라벨에 `<`, `>`를 그대로 쓰지 않는다. `Promise<Note>`는 `Promise&lt;Note&gt;`로 쓰거나 빼고,
  줄바꿈만 `<br/>`을 쓴다.
- `subgraph` ID와 노드 ID가 겹치지 않게 한다 (예: subgraph `components_layer`, 노드 `Layout`).
- 다이어그램 하나에 노드가 30개를 넘으면 계층별로 나눠 여러 다이어그램으로 만든다.

## 4단계: HTML 생성

아래 템플릿을 채워 `docs/architecture/index.html`로 저장한다. 외부 의존성은 Mermaid CDN 하나뿐이고 빌드가 필요 없다.

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{프로젝트명} 아키텍처</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 32px; background: #f6f7f9; color: #1a2233; }
    h1 { margin-top: 0; }
    section { background: #fff; border: 1px solid #e3e5e8; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .legend, table { font-size: 14px; border-collapse: collapse; }
    td, th { border: 1px solid #e3e5e8; padding: 6px 10px; text-align: left; }
    .mermaid { text-align: center; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>{프로젝트명} 아키텍처</h1>
  <p>생성일: {YYYY-MM-DD} · 분석 대상: <code>src/</code></p>

  <section>
    <h2>1. 컴포넌트 의존성</h2>
    <pre class="mermaid">
{flowchart TD ...}
    </pre>
    <div class="legend">{선 종류 범례}</div>
  </section>

  <section>
    <h2>2. 상태 흐름</h2>
    <pre class="mermaid">
{flowchart LR ...}
    </pre>
  </section>

  <section>
    <h2>3. 시퀀스: {대표 동작}</h2>
    <pre class="mermaid">
{sequenceDiagram ...}
    </pre>
  </section>

  <section>
    <h2>파일 목록</h2>
    <table>
      <tr><th>파일</th><th>계층</th><th>역할</th><th>의존 대상</th></tr>
      {분석한 파일마다 한 줄}
    </table>
  </section>

  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, theme: 'default', flowchart: { curve: 'basis' } });
  </script>
</body>
</html>
```

- 넣지 않은 섹션(상태 흐름·시퀀스를 표현할 수 없었던 경우)은 통째로 지운다.
- 다이어그램 내용은 1단계에서 실제로 확인한 관계만 쓴다. 코드에 없는 관계를 추측해서 넣지 않는다.

## 5단계: 브라우저로 열기

저장이 끝나면 바로 브라우저로 연다. 사용자가 직접 열게 하지 말고 Claude가 연다.

**Windows**: `Start-Process "index.html"`(기본 프로그램으로 열기)는 이 환경에서 창이 뜨지 않으므로 쓰지 않는다.
브라우저 실행 파일을 직접 실행하고, 창 제목으로 실제로 열렸는지 확인한다. PowerShell 도구에서:

```powershell
$f = "file:///" + ((Resolve-Path "docs/architecture/index.html").Path -replace '\\', '/')
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
            "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") |
          Where-Object { Test-Path $_ } | Select-Object -First 1
if ($chrome) { Start-Process -FilePath $chrome -ArgumentList $f }
else { Start-Process -FilePath "msedge" -ArgumentList $f }
Start-Sleep -Seconds 3
Get-Process chrome, msedge -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowTitle } | Select-Object ProcessName, MainWindowTitle
```

- 출력된 창 제목에 HTML의 `<title>`(예: "Notes App 아키텍처")이 보이면 성공.
- 안 보이면 다른 브라우저로 한 번 더 시도하고, 그래도 실패하면 파일의 전체 경로를 알려준다.

**macOS**: `open docs/architecture/index.html` · **Linux**: `xdg-open docs/architecture/index.html`

## 6단계: 결과 보고

사용자에게 짧게 알린다.

- 저장한 파일 경로
- 들어간 다이어그램 종류와 각각 무엇을 보여주는지 한 줄씩
- 분석 중 발견한 특이점 (예: 순환 의존, 계층 규칙 위반 — 컴포넌트가 `api/`를 직접 import 등). 없으면 생략
- 브라우저에서 "Syntax error"가 보이면 알려달라고 안내 (Mermaid 문법 오류는 브라우저에서만 드러남)
