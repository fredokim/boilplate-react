# 확장계획 1 — 디자인 토큰 단일 소스

포트폴리오 확장 계획의 1번 항목이다.
"Figma token을 CSS variables와 프레임워크별 preset으로 연결한다."

아래 단계는 각각 독립적으로 실행 가능한 프롬프트다. 한 번에 하나씩
실행하고, 각 단계의 완료 조건을 만족한 뒤 다음으로 넘어간다.

---

## 배경 — 지금 무엇이 어긋나 있는가

세 저장소가 같은 이름의 토큰을 다른 값으로 정의하고 있다. 추측이 아니라
현재 파일을 비교한 결과다.

`react-boilerplate/src/styles/tokens/` 와 `next-boilerplate/src/styles/tokens/`
는 파일 이름이 같지만 값이 다르다.

| 토큰 | react | next |
| --- | --- | --- |
| `--color-line` | `#d8dee8` | `#dbe3ef` |
| `--color-success` | `#168a52` | `#15803d` |
| `--color-surface` | `#f8fafc` | `#f7f9fc` |

next에만 있는 토큰: `--color-primary-strong`, `--space-5`, `--space-10`,
`--radius-lg`, 그리고 `shadow.css` 파일 전체.

vue는 두 계층을 나눠 쓴다. `--ds-`는 디자인 토큰(radius, shadow, spacing,
typography, zIndex)이고 `--color-`는 테마 색이다. 의도된 구조이며 결함이
아니다.

그리고 **vue에는 이미 생성기가 있다.** `src/core/theme/tokens.ts`가 소스이고
`scripts/generate-theme-scss.ts`가 `src/assets/scss/generated/theme.scss`를
만들며, `package.json`의 `predev`, `prestorybook`, `check:ci`가 이를 실행한다.
라이트/다크 두 벌도 이미 있다.

따라서 이 작업은 파이프라인을 새로 만드는 것이 아니라, **vue에 있는 것을
react와 next로 확장하고 세 저장소가 같은 소스를 보게 만드는 일**이다.
목적은 값을 한 번 맞추는 것이 아니라 **값이 갈라질 수 없는 구조**를 만드는
것이다.

자세한 현황은 `TOKEN_INVENTORY.md`에 있다. 1-1단계에서 작성했다.

---

## 이 작업의 범위

포함한다.

- 토큰 단일 소스 파일과 그로부터 산출물을 만드는 생성기
- react, next, vue 세 저장소의 토큰 채택
- 생성물과 커밋된 파일이 어긋나면 실패하는 CI 게이트
- 다크 테마를 위한 확장 지점 정의

포함하지 않는다.

- Figma API 연동. 이번에는 Figma가 내보내는 형식을 **입력으로 받을 수 있는
  구조**까지만 만든다. 실제 API 호출은 하지 않는다.
- 컴포넌트 스타일 재작성. 토큰 참조만 바꾸고 시각적 결과는 유지한다.
- 세 저장소를 모노레포로 합치는 작업.
- Tailwind 도입 확대. 현재 react만 실사용 중이고 vue는 설정만 있으며 next는
  설정조차 없다. 이 상태를 그대로 둔다.

---

## 단계 1-1 — 현황을 문서로 고정한다

작업을 시작하기 전에 지금 상태를 기록한다. 나중에 "무엇이 바뀌었나"를
판단할 기준이 필요하고, 표류의 규모를 눈으로 봐야 이후 결정이 정당해진다.

지시:

1. 세 저장소의 모든 CSS custom property 정의를 수집한다. react와 next는
   `src/styles/tokens/`, vue는 `src/assets/scss/design-system.scss`와
   `src/assets/styles/variables.scss`, `src/app/styles/`를 본다.
2. `TOKEN_INVENTORY.md`를 만들어 토큰 이름 × 저장소 표를 작성한다.
   값이 다르면 세 값을 모두 적고, 한쪽에만 있으면 그 사실을 적는다.
3. 런타임에 변수를 덮어쓰는 코드를 모두 찾아 목록에 남긴다.
   최소한 vue의 `applyTheme`가 여기 해당한다.

완료 조건:

- 표에 빠진 토큰이 없다. 각 저장소에서 `--`로 시작하는 정의를 grep한 개수와
  표의 행 수가 일치한다.
- 값이 다른 토큰이 몇 개인지 숫자로 적혀 있다.

이 단계에서는 코드를 바꾸지 않는다.

---

## 단계 1-2 — 단일 소스 형식을 정하고 작성한다

지시:

1. `tokens/tokens.json`을 저장소 루트에 만든다. 형식은 W3C Design Tokens
   Community Group 초안을 따른다. 각 토큰은 `$value`와 `$type`을 가진다.
   Figma의 Variables export와 Tokens Studio 플러그인 출력이 모두 이 형태에
   가깝다. 나중에 Figma를 붙일 때 변환기를 새로 쓰지 않기 위한 선택이다.
2. 값은 단계 1-1의 표에서 가져온다. 값이 갈라진 토큰은 **react 값을 채택**
   한다. react가 가장 많은 화면에서 실제로 쓰이고 있어 회귀 위험이 가장 낮다.
   단, 채택하지 않은 값을 주석이 아니라 `TOKEN_INVENTORY.md`에 남긴다.
3. 한 저장소에만 있는 토큰을 전부 포함한다. 지우면 그 저장소가 깨진다.
   - next 전용 5개: `--color-primary-strong`, `--space-5`, `--space-10`,
     `--radius-lg`, `--shadow-sm`
   - vue 전용 40개: `--ds-` 계열 디자인 토큰(radius, shadow, spacing,
     typography, zIndex)과 `--ds-color-neutral-*` 계조, `--ds-focus-ring`.
     이들은 `vue-boilerplate/src/core/theme/tokens.ts`에 이미 구조화되어
     있으므로 그 구조를 그대로 가져온다.
   - react 전용은 없다.
4. 계층은 두 단계로 둔다. 원시값(`color.blue.600`)과 의미값
   (`color.primary` → `{color.blue.600}` 참조). 의미값만 컴포넌트가 참조한다.
   다크 테마는 원시값을 그대로 두고 의미값의 참조만 바꾸는 것으로 처리한다.

완료 조건:

- `tokens/tokens.json`이 JSON으로 파싱된다.
- 단계 1-1 표의 모든 토큰이 소스에 존재한다. 누락 0건.
- 의미값 토큰이 참조하는 원시값이 모두 존재한다. 끊어진 참조 0건.

---

## 단계 1-3 — 생성기를 만든다

지시:

1. `scripts/build-tokens.ts`를 만든다. 입력은 `tokens/tokens.json`,
   출력은 CSS custom property 파일이다.
2. 출력 파일은 기존 경로와 이름을 그대로 유지한다.
   `src/styles/tokens/colors.css`, `spacing.css`, `radius.css`, `shadow.css`.
   경로를 바꾸면 이번 작업이 토큰 통일이 아니라 대규모 import 수정이 된다.
3. 생성된 파일 맨 위에 "이 파일은 생성물이며 직접 수정하지 말 것"과
   소스 경로를 적는다. 사람이 여기를 고치면 다음 생성에서 사라진다.
4. `package.json`에 `tokens:build` 스크립트를 추가한다.
5. 참조(`{color.blue.600}`)는 생성 시점에 해석해 최종 값으로 펼친다.
   CSS 변수가 변수를 참조하게 두면 브라우저 devtools에서 실제 값을 따라가기
   어려워지고, 의미값 계층의 이점도 사라진다.

완료 조건:

- `npm run tokens:build`가 종료 코드 0으로 끝난다.
- 생성 직후 `git diff --stat src/styles/tokens/`가 비어 있다. 즉 생성물이
  현재 커밋된 react 토큰 파일과 바이트 단위로 같다. 다르면 단계 1-2의 값이
  틀렸거나 생성기 출력 형식이 틀린 것이다.

이 완료 조건이 이번 단계의 핵심이다. 생성기가 기존 파일을 그대로 재현해야
다음 단계에서 "무엇이 바뀌었는지"가 명확해진다.

---

## 단계 1-4 — 드리프트 게이트를 추가한다

생성기가 있어도 사람이 생성물을 직접 고치면 다시 갈라진다. 서버의
`checkOpenApiDrift.ts`가 같은 문제를 이미 해결하고 있으니 같은 방식을 쓴다.

지시:

1. `scripts/check-tokens.ts`를 만든다. 토큰을 메모리에서 생성해 커밋된
   파일과 바이트 비교하고, 다르면 어떤 파일의 어느 줄이 다른지 출력하며
   종료 코드 1로 끝난다.
2. 개행 문자를 정규화한 뒤 비교한다. Windows 체크아웃에서 CRLF 때문에
   전부 다르다고 나오면 게이트가 무의미해진다.
3. `check:ci`에 포함한다.

완료 조건:

- 생성물 하나를 일부러 한 글자 고치면 `check:tokens`가 실패하고, 되돌리면
  통과한다. 두 경우를 모두 실행해 확인한다.
- 게이트를 만든 뒤 `npm run check:ci`가 통과한다.

게이트는 "고장난 것을 실제로 잡는지" 확인하기 전까지 만든 것으로 치지
않는다.

---

## 단계 1-5 — next 저장소를 채택시킨다

지시:

1. `tokens/tokens.json`, `scripts/build-tokens.ts`, `scripts/check-tokens.ts`를
   next-boilerplate로 옮긴다. 세 저장소가 별개 원격이므로 npm 패키지로
   공유하지 않고 파일을 복제한다. 대신 파일 상단에 원본 저장소 경로를 적어
   어느 쪽이 기준인지 남긴다.
2. 생성물로 next의 토큰 파일을 교체한다. 값이 바뀌는 토큰은 단계 1-2에서
   react 값을 채택했으므로 `--color-line`, `--color-success`,
   `--color-surface` 세 개다.
3. 바뀐 세 색이 실제 화면에서 어떻게 보이는지 확인한다. 개발 서버를 띄우고
   최소한 `/`와 `/ops-console`을 연다.

완료 조건:

- next에서 `npm run check:ci`(또는 해당 저장소의 동등한 게이트)가 통과한다.
- 두 화면의 스크린샷을 전후로 비교했고, 달라진 부분이 위 세 색으로 설명된다.
- 설명되지 않는 시각적 변화가 있으면 멈추고 원인을 찾는다.

---

## 단계 1-6 — vue 저장소를 채택시킨다

vue는 네임스페이스가 달라 가장 위험하다. 나눠서 진행한다.

지시:

1. 먼저 `--ds-color-neutral-*` 계조를 `tokens.json`의 원시값으로 편입한다.
   vue가 쓰는 9단계 중립색은 react/next에 대응물이 없으므로 지우지 말고
   원시값 계층에 추가한다.
2. vue는 이미 `scripts/generate-theme-scss.ts`를 갖고 있다. 새 생성기로
   교체할지, 기존 생성기가 새 소스를 읽게 할지 판단한다. 후자가 변경 범위가
   작다. 어느 쪽이든 출력 경로와 변수 이름, 유틸리티 클래스 83개는 그대로
   유지한다.
3. `applyTheme`는 인라인 스타일로 `--color-*`를 쓰고, 같은 값이
   `:root[data-theme]` 규칙으로도 적용된다. 두 경로가 같은 정보를 중복해서
   들고 있다. 이번에 정리할지 남길지 판단하고, 남긴다면 이유를 적는다.

완료 조건:

- vue에서 기존 게이트가 통과한다.
- Storybook을 빌드해 컴포넌트 시각 결과가 유지되는지 확인한다.
- `applyTheme` 호출 경로가 여전히 동작한다. 테마를 바꾸는 화면이 있으면
  실제로 눌러본다.

접두사 통일(`--ds-` 제거)은 이번 범위가 아니다. 별도 단계로 남긴다.

---

## 단계 1-6b — vue의 쓰이지 않는 생성기 복제본을 처리한다

1-1단계에서 발견한 것이다. `vue-boilerplate/scripts/generate-theme-scss.js`는
22줄이고 `.ts`는 56줄이다. `.js`는 `--color-*`만 출력하고 `--ds-*` 계열
31개를 전혀 만들지 않는다. `package.json`은 `.ts`만 부르며 `.js`를 참조하는
곳은 없다.

지시:

1. `.js`가 정말 어디에서도 참조되지 않는지 다시 확인한다.
2. 참조가 없으면 삭제한다. 남겨둘 이유가 있으면 그 이유를 파일 상단에 적고,
   실행 시 경고를 출력하게 한다.

완료 조건:

- 삭제 후 vue의 `check:ci`가 통과한다.
- 생성물이 삭제 전과 동일하다.

지금은 무해하지만, 누군가 `node scripts/generate-theme-scss.js`를 실행하면
디자인 토큰 31개가 조용히 빠진 파일이 만들어진다.

---

## 단계 1-7 — 다크 테마 확장 지점을 정의한다

vue는 이미 다크 테마를 갖고 있고 react와 next는 없다. 이번에 react/next의
다크 값을 채우지는 않되, 나중에 추가할 때 토큰 구조를 바꾸지 않아도 되게
만든다. vue의 `lightTheme`/`darkTheme` 구조가 참고 대상이다.

지시:

1. `tokens.json`에 테마 축을 추가한다. 의미값 토큰이 테마별로 다른 원시값을
   참조할 수 있어야 한다.
2. 생성기가 `:root`와 `@media (prefers-color-scheme: dark)` 두 블록을
   출력할 수 있게 한다. 다크 값이 정의되지 않은 토큰은 두 번째 블록에
   나오지 않는다.
3. 이번에는 다크 값을 채우지 않는다. 구조만 만들고 생성물은 변하지 않아야
   한다.

완료 조건:

- 다크 값이 하나도 없는 상태에서 생성물이 단계 1-3과 동일하다.
- 임의의 토큰 하나에 다크 값을 넣으면 미디어 쿼리 블록이 생기고, 빼면
  사라진다. 두 경우를 확인한 뒤 원복한다.

---

## 단계 1-8 — 문서와 포트폴리오를 갱신한다

지시:

1. 각 저장소 README에 토큰을 고치는 방법을 적는다. "생성물이 아니라
   `tokens/tokens.json`을 고치고 `npm run tokens:build`를 실행한다."
2. `TOKEN_INVENTORY.md`를 최종 상태로 갱신한다. 채택하지 않은 값과
   그 이유가 남아 있어야 한다.
3. `boilerplate-portfolio`의 확장 계획 1번 항목을 완료 상태로 바꾸고,
   무엇을 했는지 한 문단으로 적는다. 세 저장소가 같은 이름의 토큰을 다른
   값으로 갖고 있었다는 사실과, 지금은 갈라질 수 없다는 점을 쓴다.
   포트폴리오는 `python build-shareable.py`로 다시 굽는다.

완료 조건:

- 세 저장소의 CI가 모두 통과한다.
- 포트폴리오 페이지에서 확장 계획 1번이 완료로 표시된다.
