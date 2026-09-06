# 확장계획 2 — 파일 생성기

포트폴리오 확장 계획의 2번 항목이다.
"feature, DTO, story, test, route 파일을 일관된 규칙으로 생성한다."

아래 단계는 각각 독립적으로 실행 가능한 프롬프트다. 한 번에 하나씩
실행하고, 각 단계의 완료 조건을 만족한 뒤 다음으로 넘어간다.

---

## 배경 — 생성기는 이미 있고, 규칙을 지키지 않는다

이 항목은 신규 구축이 아니다. `react-boilerplate/scripts/`에 생성기가 여섯
개 있다. `generate.ts`가 진입점이고 `generate-feature.ts`,
`generate-page.ts`, `generate-form.ts`, `generate-layout.ts`,
`generate-contract.ts`가 실제 작업을 한다.

문제는 생성 결과가 저장소 자신의 관례를 따르지 않는다는 것이다.
`generate-feature.ts`는 36줄이고 다음을 만든다.

- 디렉터리 다섯 개: `api`, `containers`, `dto`, `hooks`, `views`
- 파일 세 개: `<Name>.dto.ts`, `<Name>View.tsx`, `<Name>Container.tsx`

여기서 드러나는 문제는 세 가지다.

**첫째, 생성된 기능은 라우터가 볼 수 없다.**
`src/app/router/routeRegistry.tsx`는
`import.meta.glob("@features/**/routes/*.route.tsx")`로 기능을 등록한다.
실제로 `customizable-dashboard`, `live-experience`, `visual-graph` 세 기능이
이 규칙으로 등록되어 있다. 그런데 생성기는 `routes` 디렉터리를 만들지도
않는다. 생성 직후의 기능은 어떤 경로로도 접근할 수 없다.

**둘째, 빈 디렉터리가 두 개 남는다.**
`api`와 `hooks`는 만들어지지만 채워지지 않는다. 기존 기능
(`features/user/`)은 `api/user.api.ts`와 `hooks/useUserQuery.ts`를 갖는다.
생성기는 관례의 뼈대만 만들고 내용을 비워둔다.

**셋째, 테스트도 story도 만들지 않는다.**
저장소의 모든 기능은 story를 갖고 있고 대부분 테스트를 갖는다. 생성기는
둘 다 만들지 않는다. 즉 생성기를 쓸수록 관례에서 멀어진다.

그리고 이것을 잡아야 할 게이트가 잡지 못한다.
`scripts/check-automation.ts`는 생성기 네 개의 **파일 존재 여부만** 확인한다.

```
for (const generator of ['scripts/generate-contract.ts', 'scripts/generate-layout.ts',
                         'scripts/generate-page.ts', 'scripts/generate-form.ts']) {
  assert(existsSync(join(root, generator)), ...);
}
```

생성기를 실행해보지 않는다. 그리고 `generate-feature.ts`는 이 목록에 아예
없다. 파일이 존재하기만 하면 통과하는 검사다.

이 작업의 목적은 생성기를 늘리는 것이 아니라, **생성 결과가 저장소의
관례와 같아지도록** 만들고 그것을 CI가 지키게 하는 것이다.

---

## 이 작업의 범위

포함한다.

- `generate-feature.ts`가 만드는 산출물을 기존 기능과 같은 모양으로 확장
- 생성물이 lint, typecheck, test를 통과하는지 CI가 실제로 실행해 확인
- 이미 존재하는 기능에 대한 충돌 처리
- vue, next 저장소로의 포팅

포함하지 않는다.

- 대화형 CLI, 플러그인 시스템, 템플릿 커스터마이징 기능
- Plop, Hygen 등 외부 스캐폴딩 도구 도입. 현재 생성기는 의존성 없이
  `node:fs`만 쓴다. 이 성질을 유지한다.
- 기존 기능들을 생성기 출력에 맞춰 재작성하는 일

---

## 단계 2-1 — 생성 계약을 문서로 정한다

코드를 고치기 전에 "기능 하나는 어떤 파일들로 이루어지는가"를 결정한다.
지금은 이 규칙이 어디에도 적혀 있지 않고 기존 기능들에서 귀납할 수만 있다.

지시:

1. `src/features/` 아래 여섯 기능의 파일 목록을 뽑아 비교한다.
   `user`가 가장 단순하고 `auth`가 그다음이다.
2. `FEATURE_CONTRACT.md`에 필수 파일과 선택 파일을 구분해 적는다.
   최소한 다음을 판단해 적는다.
   - DTO는 항상 필요한가
   - api 모듈은 항상 필요한가 (서버 없이 동작하는 기능이 있는가)
   - route 파일이 없는 기능은 어떻게 접근되는가
     (`routeRegistry.tsx`의 `baseRoutes`에 직접 적힌 경우가 있다)
3. 생성기가 만들어야 할 파일 집합을 이 문서에서 결정한다.

완료 조건:

- 문서의 규칙을 기존 여섯 기능에 적용했을 때, 규칙을 벗어나는 기능이
  있으면 그 이유가 문서에 적혀 있다.
- 규칙이 "모든 기능은 X를 갖는다"인데 실제로 안 갖는 기능이 있으면
  규칙이 틀린 것이다. 규칙을 고치거나 예외를 명시한다.

이 단계에서는 코드를 바꾸지 않는다.

---

## 단계 2-2 — 게이트를 먼저 고친다

생성기를 고치기 전에, 고쳤는지 확인할 수단을 먼저 만든다. 지금 게이트는
파일 존재만 보므로 무엇을 고쳐도 통과한다.

지시:

1. `scripts/check-generators.ts`를 만든다. 임시 디렉터리에서 각 생성기를
   실제로 실행하고, 생성된 파일이 단계 2-1의 계약과 일치하는지 확인한다.
2. `generate-feature.ts`를 검사 대상에 포함한다. 지금 빠져 있다.
3. 생성물에 대해 typecheck와 lint를 돌린다. 생성기가 컴파일되지 않는 코드를
   만들어내는 상황을 잡기 위해서다.
4. 검사 후 임시 디렉터리를 정리한다. `src/features/` 안에 검사용 기능이
   남으면 다음 실행에서 충돌한다.

완료 조건:

- 지금 이 게이트를 돌리면 **실패한다.** `generate-feature.ts`가 route,
  story, test를 만들지 않기 때문이다. 실패 메시지에 없는 파일이 나열된다.
- 실패가 확인되면 이 단계는 성공이다. 통과시키는 것은 다음 단계다.

게이트가 처음부터 통과하면 게이트가 아무것도 검사하지 않는 것이다.

---

## 단계 2-3 — route 파일을 생성한다

가장 영향이 큰 결함부터 고친다. 지금은 생성된 기능에 접근할 방법이 없다.

지시:

1. `generate-feature.ts`가 `routes/<camelName>.route.tsx`를 만들게 한다.
   형식은 기존 세 개를 그대로 따른다. `src/features/visual-graph/routes/`를
   먼저 읽는다.
2. `AppRouteConfig`의 필드를 채운다. `path`, `title`, `loader`는 필수다.
   `auth`, `permission`, `nav`는 생성 시 기본값을 정해야 한다.
   기본값은 **`auth: true`, `nav: false`** 로 한다. 새 화면이 실수로 인증
   없이 노출되는 쪽보다 접근이 막히는 쪽이 안전하고, 내비게이션에
   자동으로 등장하면 미완성 화면이 사용자에게 보인다.
3. `loader`는 생성된 컨테이너를 가리킨다.

완료 조건:

- 생성 후 개발 서버에서 `/<feature-name>` 경로가 실제로 열린다. 로그인한
  상태에서 확인한다.
- `routeRegistry.tsx`를 수정하지 않고 등록된다. 수정이 필요했다면 glob
  규칙과 생성 경로가 어긋난 것이다.

---

## 단계 2-4 — api 모듈과 hook을 생성한다

빈 디렉터리 두 개를 채운다.

지시:

1. `api/<camelName>.api.ts`를 만든다. `features/user/api/user.api.ts`를
   본보기로 삼는다. `requestDto`를 쓰고 DTO를 지정하는 형태다.
2. `hooks/use<PascalName>Query.ts`를 만든다.
   `features/user/hooks/useUserQuery.ts`를 본보기로 삼는다.
3. 생성된 api 모듈의 URL은 기능 이름에서 유도한다. 이 URL은 서버에 존재하지
   않을 수 있다. 그 사실을 생성된 파일의 주석에 적는다. 존재하지 않는
   엔드포인트를 호출하는 코드가 조용히 남는 상황을 막기 위해서다.
4. 프론트가 호출하는 URL은 계약 테스트(`src/test/contract/`)가 스펙과
   대조한다. 생성된 api 모듈이 이 테스트를 즉시 실패시킬 수 있다.
   그것이 옳은 동작인지, 아니면 생성 직후에는 예외로 두어야 하는지
   판단하고 결정을 문서에 적는다.

완료 조건:

- 생성된 기능에 빈 디렉터리가 없다.
- `npm run typecheck`가 통과한다.
- 계약 테스트의 동작을 확인했고, 결과가 의도한 대로다.

4번은 실제로 부딪히는 문제다. 계약 테스트는 프론트 소스에서 호출 URL을
추출하도록 최근에 바뀌었으므로, 생성된 api 모듈도 그 대상이 된다.

---

## 단계 2-5 — story와 test를 생성한다

지시:

1. `views/<PascalName>View.stories.tsx`를 만든다.
   `features/user/views/UserView.stories.tsx`를 본보기로 삼는다.
2. 뷰에 대한 최소 테스트를 만든다. 렌더링되는지 확인하는 수준이면 된다.
   의미 없는 단언(`expect(true).toBe(true)`)은 만들지 않는다. 통과하는
   테스트를 늘리는 것이 목적이 아니라, 테스트 파일의 자리를 관례대로
   만들어 두는 것이 목적이다.
3. 생성된 테스트가 실제로 실행되는 위치와 이름 규칙을 따르는지 확인한다.
   `vite.config.ts`의 `test.include`가 `src/**/*.test.ts(x)`이다.

완료 조건:

- `npm run test`가 생성된 테스트를 포함해 통과한다.
- `npm run build-storybook`이 통과한다.
- 단계 2-2의 게이트가 이제 통과한다.

---

## 단계 2-6 — 충돌과 재실행을 처리한다

지금 생성기는 이미 존재하는 기능 이름으로 실행하면 파일을 덮어쓴다.
`writeFileSync`에 아무 검사가 없다.

지시:

1. 대상 경로에 파일이 이미 있으면 덮어쓰지 않고 종료 코드 1로 실패한다.
   무엇이 이미 있는지 출력한다.
2. `--force` 같은 플래그는 만들지 않는다. 덮어쓰기가 필요하면 사용자가
   지우고 다시 실행하면 된다. 되돌릴 수 없는 동작에 짧은 우회로를 두면
   결국 그 우회로가 기본 사용법이 된다.
3. 이름 검증을 추가한다. 빈 문자열, 경로 구분자, 예약어를 거부한다.
   지금은 `npm run generate:feature -- ../../etc`가 무엇을 하는지 아무도
   확인하지 않았다.

완료 조건:

- 기존 기능 이름(`user`)으로 실행하면 실패하고, `src/features/user/`의
  파일이 변경되지 않는다. `git status`로 확인한다.
- 경로 구분자가 포함된 이름이 거부된다.

---

## 단계 2-7 — vue 저장소로 포팅한다

vue는 디렉터리 관례가 다르다. `src/app/modules/<name>/` 아래
`api`, `dto`, `router`, `store`, `stories`, `views`를 둔다.
`src/app/modules/user/`가 본보기다.

지시:

1. 먼저 vue의 기능 계약을 단계 2-1과 같은 방식으로 문서화한다.
   react의 계약을 그대로 옮기지 않는다. 관례가 실제로 다르다.
2. vue의 라우터도 자동 등록을 쓴다. `src/app/router/index.ts`가
   `modules/<name>/router/routes.ts` 패턴을 읽는다. 생성물이 이 규칙을
   따라야 한다.
3. store 파일을 생성 대상에 포함할지 판단한다. `user` 모듈은
   `store/user.store.ts`와 `store/user.schema.ts`를 갖는다.

완료 조건:

- 생성된 모듈의 경로가 vue 라우터에 자동 등록되고 화면이 열린다.
- vue 저장소의 기존 게이트가 통과한다.

---

## 단계 2-8 — next 저장소로 포팅한다

next는 셋 중 관례가 가장 다르다. `src/features/user/`는 `dto/User.dto.ts`와
`server/users.server.ts` 두 개뿐이고, 화면은 App Router의 `app/` 아래에 있다.

지시:

1. next의 기능 계약을 문서화한다. server component와 client component의
   경계가 어디인지, 어느 파일이 서버 전용인지 명시한다.
2. 생성기가 `app/` 아래 라우트 세그먼트도 만들어야 하는지 판단한다.
   만든다면 `page.tsx`의 기본형이 server component인지 client component인지
   결정하고, 그 이유를 적는다.
3. `"use client"` 지시어를 생성물에 넣을지 여부는 위 결정을 따른다.
   기본을 client로 두면 next를 쓰는 이유가 줄어든다.

완료 조건:

- 생성된 기능이 next 저장소의 게이트를 통과한다.
- 생성된 페이지가 실제로 열린다.

---

## 단계 2-9 — 문서와 포트폴리오를 갱신한다

지시:

1. 각 저장소 README에 생성기 사용법을 적는다.
2. `FEATURE_CONTRACT.md`를 최종 상태로 만든다.
3. `boilerplate-portfolio`의 확장 계획 2번을 완료로 바꾼다. 여기서 쓸 만한
   내용은 "생성기를 만들었다"가 아니라, **생성기가 저장소 자신의 관례를
   어기고 있었고 그것을 검사해야 할 게이트는 파일 존재 여부만 보고
   있었다**는 사실이다. 그 게이트를 실제로 실행하는 검사로 바꾼 것이 이
   작업의 내용이다.
   포트폴리오는 `python build-shareable.py`로 다시 굽는다.

완료 조건:

- 세 저장소의 CI가 모두 통과한다.
- 포트폴리오 페이지에서 확장 계획 2번이 완료로 표시된다.
