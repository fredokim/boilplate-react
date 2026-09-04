# 토큰 인벤토리

확장계획 1번의 1-1단계 산출물이다. 값을 바꾸기 전에 지금 상태를 고정한다.
이후 단계에서 "무엇이 달라졌는가"를 판단할 기준이 이 문서다.

수집 대상은 세 저장소의 CSS custom property **정의**다. 사용처(`var(--x)`)는
세지 않았다. 수집 경로는 문서 끝에 적었다.

---

## 요약

| 저장소 | `:root` 정의 | 테마별 정의 | 생성기 | 다크 테마 |
| --- | --- | --- | --- | --- |
| react | 16 | 없음 | 없음 | 없음 |
| next | 21 | 없음 | 없음 | 없음 |
| vue | 40 | light 9 · dark 9 | `scripts/generate-theme-scss.ts` | 있음 |

`:root`에 정의된 고유한 이름은 모두 61개다. 그중 두 저장소 이상에
같은 이름이 존재하는 것이 16개이고, 값까지 같은 것은
13개다.

---

## 1. 값이 충돌하는 토큰

같은 이름이 저장소마다 다른 값을 가진다. 어느 화면을 기준으로 보느냐에 따라
색이 달라진다는 뜻이다.

| 토큰 | react | next | vue |
| --- | --- | --- | --- |
| `--color-line` | #d8dee8 | #dbe3ef | - |
| `--color-success` | #168a52 | #15803d | - |
| `--color-surface` | #f8fafc | #f7f9fc | - |

세 개 모두 react와 next 사이의 충돌이다. 눈에 띄는 차이는 아니지만, 바로
그래서 아무도 눈치채지 못한 채 갈라졌다.

`--color-primary`는 이 표에 없지만 실질적으로는 네 번째 충돌이다. react와
next는 `:root`에 `#2563eb`로 두는데, vue는 `:root[data-theme="light"]`에
`#4880ff`, `[data-theme="dark"]`에 `#5b8cff`로 둔다. 선언 계층이 달라
자동 비교에 잡히지 않았을 뿐이다.

---

## 2. 이름과 값이 모두 같은 토큰

| 토큰 | 값 | 보유 |
| --- | --- | --- |
| `--color-danger` | #dc2626 | react, next |
| `--color-ink` | #172033 | react, next |
| `--color-muted` | #647084 | react, next |
| `--color-panel` | #ffffff | react, next |
| `--color-primary` | #2563eb | react, next |
| `--radius-md` | 8px | react, next |
| `--radius-sm` | 6px | react, next |
| `--space-1` | 4px | react, next |
| `--space-2` | 8px | react, next |
| `--space-3` | 12px | react, next |
| `--space-4` | 16px | react, next |
| `--space-6` | 24px | react, next |
| `--space-8` | 32px | react, next |

이 13개는 이미 일치하므로 단일 소스로 옮길 때 값 변경이 없다.

---

## 3. 한 저장소에만 있는 토큰

- **react 전용: 0개.** react가 가진 토큰은 모두 다른 곳에도 있다.
- **next 전용: 5개** — `--color-primary-strong`, `--radius-lg`, `--shadow-sm`, `--space-10`, `--space-5`
- **vue 전용: 40개.** 대부분 `--ds-` 접두사를 쓰는 디자인 토큰
  (radius, shadow, spacing, typography, zIndex)과 중립색 계조다.

next 전용 5개는 삭제 대상이 아니다. 지우면 next의 화면이 깨진다. 단일 소스에
포함해야 한다.

---

## 4. vue의 테마 계층

vue만 라이트/다크 두 벌을 갖는다. `:root[data-theme="light"]`와
`:root[data-theme="dark"]` 블록에 각각 9개씩이다.

| 토큰 | light | dark |
| --- | --- | --- |
| `--color-accent` | #ff7f5c | #ff7f5c |
| `--color-background` | #f5f6fa | #111827 |
| `--color-error` | #ef4444 | #f87171 |
| `--color-info` | #3b82f6 | #60a5fa |
| `--color-primary` | #4880ff | #5b8cff |
| `--color-secondary` | #6c5dd3 | #6c5dd3 |
| `--color-success` | #10b981 | #34d399 |
| `--color-text` | #202224 | #f8fafc |
| `--color-warning` | #f59e0b | #fbbf24 |

---

## 5. 런타임에 변수를 덮어쓰는 코드

한 곳뿐이다.

`vue-boilerplate/src/core/theme/theme.ts`의 `applyTheme`가
`document.documentElement.style.setProperty("--color-" + key, value)`로 인라인
스타일을 쓴다. 인라인 스타일은 `:root[data-theme]` 규칙을 이긴다.

호출 경로는 `src/core/composables/useTheme.ts`와 `src/core/theme/utils.ts`이며,
두 곳 모두 `applyTheme`와 `setAttribute("data-theme", mode)`를 **함께** 부른다.
즉 같은 값이 CSS 규칙과 인라인 스타일 두 경로로 동시에 적용된다. 동작에는
문제가 없지만 같은 정보가 두 벌 존재한다.

react와 next에는 `setProperty` 호출이 없다.

---

## 6. vue에는 이미 생성기가 있다

이 조사에서 가장 중요한 발견이다. 확장계획 1번은 "토큰을 CSS variables로
연결한다"고 적혀 있지만, vue는 이미 그렇게 하고 있다.

- 소스: `src/core/theme/tokens.ts` — radius, shadow, spacing, typography,
  zIndex와 lightTheme, darkTheme을 TypeScript 객체로 정의한다.
- 생성기: `scripts/generate-theme-scss.ts` — 위 소스에서
  `src/assets/scss/generated/theme.scss`를 만든다. 변수 선언뿐 아니라
  유틸리티 클래스 83개도 함께 생성한다.
- 연결: `package.json`의 `predev`, `prestorybook`, `check:ci`가 생성기를
  먼저 실행한다.

따라서 1번 작업은 파이프라인을 새로 만드는 일이 아니라, **vue에 있는 것을
react와 next로 확장하고 세 저장소가 같은 소스를 보게 만드는 일**이다.

다만 vue의 방식에는 두 가지 문제가 있다.

**첫째, 드리프트를 잡지 못한다.** `check:ci`가 생성기를 **실행**하기 때문에
생성물이 항상 덮어써진다. 누군가 `generated/theme.scss`를 직접 고쳐 커밋해도
CI는 실패하지 않는다. 서버의 `checkOpenApiDrift.ts`는 반대로 생성하지 않고
비교만 해서 실패시킨다. 이 차이는 의도된 것이 아니라 그냥 다르게 만들어진
것으로 보인다.

**둘째, 쓰이지 않는 생성기 복제본이 있다.** `scripts/generate-theme-scss.js`는
22줄이고 `.ts`는 56줄이다. `.js`는 `--color-*`만 출력하고 `--ds-*` 계열을
전혀 만들지 않는다. `package.json`은 `.ts`만 부르고 `.js`를 참조하는 곳은
없다. 지금은 무해하지만, 누군가 `node scripts/generate-theme-scss.js`를
실행하면 디자인 토큰 31개가 조용히 사라진 파일이 생성된다.

---

## 7. 계획 문서에서 고쳐야 할 서술

`react-boilerplate/prompts/PLAN_01_DESIGN_TOKENS.md`의 배경 절은 이 조사
이전에 작성되었고, 두 군데가 사실과 다르다.

1. "vue는 아예 다른 네임스페이스를 쓴다 … 두 네이밍이 한 저장소 안에
   공존한다"고 썼다. 결함처럼 서술했지만 실제로는 `--ds-`(디자인 토큰)와
   `--color-`(테마 색)를 나눈 의도적인 2계층 구조다.
2. "지금 세 저장소 모두 라이트 테마 단일이다"라고 썼다. vue는 다크 테마를
   이미 갖고 있다.

두 서술은 `src/styles`와 `design-system.scss`만 보고 `src/core/theme/`와
`scripts/`를 보지 않은 결과다. 1-2단계로 넘어가기 전에 프롬프트를 고친다.

---

## 수집 방법

다음 파일에서 `--이름: 값;` 형태의 선언을 정규식으로 추출했다.

- react: `src/styles/tokens/{colors,radius,spacing}.css`
- next: `src/styles/tokens/{colors,radius,shadow,spacing}.css`
- vue: `src/assets/scss/design-system.scss`,
  `src/assets/scss/generated/theme.scss`

세 저장소의 `src` 전체에서 `--이름:` 패턴을 가진 파일을 먼저 찾아 위 목록이
전부인지 확인했다. 다른 파일에는 정의가 없다.

`:root`, `:root[data-theme="light"]`, `:root[data-theme="dark"]`를 별도의
선언 계층으로 구분해 수집했다.
