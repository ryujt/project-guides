# Navigation 예제 선택 목록

Navigation 문서를 작성·수정할 때는 아래 작성 샘플 절을 먼저 읽는다. 추가 업무 분기가 필요하면 [일반적인 쇼핑몰 예제](shopping-mall-navigation.md)에서 해당 시나리오만 선택한다. 예제는 실제 구현의 근거가 아니며, 읽을 범위와 적용 기준은 [예제 인덱스](../README.md#필요한-만큼-읽기)를 따른다.

## 작성 샘플

1. [문서 작성 샘플](document-template.md)의 골격과 이동 없는 과업의 적용 기준을 확인한다. 시나리오별 고정 구성과 `화면 확인 링크` 표를 유지한다.
2. [작은 완성 예제](document-sample/navigation.md)에서 범위와 간소화 구성을 확인하고 현재 과업에 해당하는 시나리오만 읽는다. 연결된 [Layout·장면 목록](document-sample/screen-layout.md)과 HTML로 직접 이동해 문서와 화면의 대응을 살펴본다.
3. 더 많은 시나리오를 한 파일에 모은 구성이 필요할 때만 [큰 AS-IS 예제 안내](../../as-is/README.md)를 확인한다. 원본 코드 링크와 과거 검증 기록을 현재 작업의 근거로 옮기지 않는다.

샘플의 과업·화면 수·데이터·정책을 현재 대상에 강제하지 않는다. Navigation 문법과 화면 확인 링크의 필수/예외 기준은 [전용 가이드](../../../guides/navigation-diagram-guide.md#문서-구성과-화면-확인-링크)가 원본이다.

## 시나리오 선택

현재 필요한 행의 절만 읽는다. 결제는 S08 전체보다 세부 문제에 맞는 하위 절을 선택할 수 있다.

| 참고할 문제 | 읽을 절 |
| --- | --- |
| 상세 API를 생략한 전체 화면 이동 요약 | [3. 전체 이동 요약](shopping-mall-navigation.md#3-전체-이동-요약) |
| 카테고리·검색·상품 없음·조회 재시도 | [S01. 상품 찾기](shopping-mall-navigation.md#s01-카테고리검색으로-상품-찾기) |
| 약관·회원가입·인증 만료 | [S02. 회원가입과 인증](shopping-mall-navigation.md#s02-회원가입과-인증) |
| 로그인·세션 만료·복귀·로그아웃 | [S03. 로그인과 세션](shopping-mall-navigation.md#s03-로그인세션-만료로그아웃) |
| 비밀번호 재설정 링크·만료·재발송 | [S04. 비밀번호 복구](shopping-mall-navigation.md#s04-비밀번호-찾기재설정) |
| 찜·장바구니·품절 | [S05. 상품 담기](shopping-mall-navigation.md#s05-찜장바구니에-상품-담기) |
| 주문 전 로그인·비회원 인증 | [S06. 주문 진입](shopping-mall-navigation.md#s06-주문-진입과-비회원-주문-인증) |
| 주문서·주문 생성·업무 조건 변경 | [S07. 주문 생성](shopping-mall-navigation.md#s07-주문서-작성주문-생성) |
| 결제 세션 발급·외부 페이지 이동 | [S08-1. 결제 시작](shopping-mall-navigation.md#s08-1-결제-시작외부-결제창-이동) |
| 외부 결제창 복귀·실패·취소·결과 불명 | [S08-2. 결제 복귀](shopping-mall-navigation.md#s08-2-외부-결제창-복귀실패취소-확인) |
| 결과 재조회·재진입·후속 이동 | [S08-3. 결제 결과 복구](shopping-mall-navigation.md#s08-3-결과-재확인재진입후속-이동) |
| 회원 주문 목록·배송 조회 | [S09. 회원 주문 조회](shopping-mall-navigation.md#s09-회원-주문-조회배송-조회) |
| 기존 비회원 주문의 조회 인증 | [S10. 비회원 주문 조회](shopping-mall-navigation.md#s10-비회원-주문-조회) |
| 출고 전 취소 자격·신청 | [S11. 주문 취소](shopping-mall-navigation.md#s11-출고-전-주문-취소) |
| 배송 완료 후 신청·조건 변경 | [S12. 반품·교환](shopping-mall-navigation.md#s12-배송-완료-후-반품교환) |
| 구매 자격·중복·리뷰 작성 완료 | [S13. 리뷰 작성](shopping-mall-navigation.md#s13-구매-리뷰-작성) |

## 전제가 더 필요할 때

- 가정이나 노드 의미가 불명확하면 [1. 범위와 가정](shopping-mall-navigation.md#1-범위와-가정)의 관련 설명을 확인한다.
- 화면명·경로·접근 조건이 필요하면 [2. 라우트 맵](shopping-mall-navigation.md#2-라우트-맵)에서 해당 화면 행만 확인한다.
- 인증 복구·직접 진입·결과 불명·이탈 처리의 공통 전제가 필요하면 [5. 공통 접근·복구 규칙](shopping-mall-navigation.md#5-공통-접근복구-규칙)의 해당 항목만 확인한다.
- 논리 API와 HTTP 계약 대응이 필요하면 [6. API 계약 예시](shopping-mall-navigation.md#6-이동결과-표시에-필요한-api-계약-예시)에서 해당 API 행만 확인한다.
- 예제의 검토 한계나 미확정 정책이 필요하면 [7. 검토 범위](shopping-mall-navigation.md#7-검토-범위와-실제-서비스에서-정할-사항)를 확인한다.
