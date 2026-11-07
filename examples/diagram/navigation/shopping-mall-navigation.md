# 일반적인 쇼핑몰 시나리오별 네비게이션 다이어그램

일반적인 B2C 실물 상품 쇼핑몰의 화면 이동을 설명하는 설계 예제다. 상품을 찾는 순간부터 주문·결제, 배송 조회, 취소·반품·교환, 리뷰 작성까지 사용자의 목적별로 나눈다. 가상의 서비스를 전제로 하며, 아래 라우트·API·정책은 예시로 제안한 계약이다.

이 문서는 추가 업무 분기를 골라 보는 보충 자료이며 HTML 화면을 제공하지 않는다. 새 Navigation 문서의 고정 구성과 시나리오별 화면 확인 링크 형식은 [작성 샘플](document-template.md)과 [작은 완성 예제](document-sample/navigation.md)를 따른다. 이 문서의 분기 그림만 복사해 화면 링크와 상세 절을 생략하지 않는다.

## 1. 범위와 가정

- 회원과 비회원 모두 상품 탐색과 장바구니를 이용한다. 비회원 주문도 허용하며, 주문 전 연락처 인증을 받는다.
- 찜과 리뷰는 회원만 이용한다. 회원 주문 조회에는 로그인과 주문 소유권 확인이 필요하다.
- 배송지·쿠폰·결제 수단 선택은 하나의 주문서 화면에서 처리한다. 옵션 선택, 확인 창, 탭, 로딩 표시처럼 주소가 없는 요소는 별도 화면 노드로 만들지 않는다.
- 결제창은 결제사가 제공하는 외부 페이지다. 결제 완료 화면은 서버에서 결제 확정을 확인한 뒤 표시한다.
- 취소는 출고 전, 반품·교환은 배송 완료 후 정책에 따라 신청할 수 있다고 가정한다. 기간·비용·부분 처리 등 상세 정책은 실제 서비스에서 결정한다.
- 관리자, 판매자, 정기 구독, 해외 배송, 소셜 로그인은 범위에서 제외한다.

`화면명`은 라우트 페이지, `(/api_name)`은 화면 이동이나 결과 표시를 결정하는 API, `(process_name)`은 이동 판단을 나타낸다. API 이름은 다이어그램용 논리 이름이며 실제 주소 예시는 문서 끝의 계약 표에 대응시킨다.

URL 직접 접속도 해당 페이지에서 시작하며, 진입 검사는 페이지에서 출발하는 조건부 이동이나 API 호출로 표현한다. 필요한 조건을 확인한 뒤 입력 폼·보호 데이터를 표시한다. API 결과가 호출한 페이지로 돌아오는 화살표는 현재 페이지에서 결과나 오류를 표시한다는 뜻이다.

## 2. 라우트 맵

경로의 `:productId`, `:orderId`, `:claimId`는 식별자 파라미터다. 같은 화면명은 모든 시나리오에서 같은 라우트를 가리킨다.

| 화면명 | 경로 예시 | 역할과 접근 조건 |
| --- | --- | --- |
| Home | `/` | 홈, 전체 공개 |
| ProductList | `/categories/:categoryId/products` | 카테고리 상품 목록, 전체 공개 |
| SearchResult | `/search?q=...` | 검색 결과, 전체 공개 |
| ProductDetail | `/products/:productId` | 상품 상세, 전체 공개 |
| NotFound | `/not-found` | 삭제된 상품·없는 주소 안내, 전체 공개 |
| Login | `/login?returnTo=...` | 로그인, 완료 후 유효한 복귀 주소로 이동 |
| SignupTerms | `/signup/terms` | 가입 약관 확인·동의, 로그아웃 상태 |
| Signup | `/signup` | 회원 정보 입력, 로그아웃 상태이며 필수 약관 동의 필요 |
| SignupVerify | `/signup/verify` | 진행 중인 가입 요청의 인증 |
| SignupComplete | `/signup/complete` | 가입 완료, 자동 로그인하지 않음 |
| ForgotPassword | `/password/forgot` | 비밀번호 재설정 안내 요청 |
| ResetPassword | `/password/reset?token=...` | 이메일 링크의 일회용 비밀번호 재설정 토큰 확인 후 입력 허용 |
| ResetPasswordNotice | `/password/reset/notice` | 재설정 링크 만료·무효·사용됨 안내, 메일 재발송·로그인 선택 |
| MyPage | `/my` | 회원 홈, 로그인 필요 |
| Wishlist | `/my/wishlist` | 찜 목록, 로그인 필요 |
| Cart | `/cart` | 장바구니, 회원·비회원 |
| CheckoutEntry | `/checkout/start` | 비회원의 로그인·비회원 주문 선택 |
| GuestCheckout | `/checkout/guest` | 주문자 정보·연락처 인증, 유효한 장바구니 필요 |
| Checkout | `/checkout` | 주문서, 회원 세션 또는 비회원 주문 인증 필요 |
| Payment | `/orders/:orderId/payment` | 결제 진행·실패·확인 대기, 해당 주문 접근 권한 필요 |
| PaymentGateway | 결제사가 발급한 외부 URL | 외부 결제창, 서버가 발급한 결제 세션 필요 |
| PaymentReturn | `/payment/return` | 외부 결제창에서 돌아오는 경로, 서버 검증 전용 |
| OrderComplete | `/orders/:orderId/complete` | 결제 확정된 주문의 완료 안내, 주문 접근 권한 필요 |
| OrderList | `/my/orders` | 회원 주문 목록, 로그인 필요 |
| OrderDetail | `/orders/:orderId` | 주문 상세, 회원 소유권 또는 해당 비회원 주문 조회 권한 필요 |
| GuestOrderLookup | `/guest/orders` | 주문번호·주문자 연락처로 조회 인증 시작 |
| GuestOrderVerify | `/guest/orders/verify` | 진행 중인 비회원 주문 조회 요청의 인증 |
| DeliveryTracking | `/orders/:orderId/tracking` | 배송 조회, 주문 접근 권한 필요 |
| CancelRequest | `/orders/:orderId/cancel` | 취소 신청, 주문 접근 권한과 취소 가능 조건 필요 |
| ReturnRequest | `/orders/:orderId/return` | 반품 신청, 주문 접근 권한과 반품 가능 조건 필요 |
| ExchangeRequest | `/orders/:orderId/exchange` | 교환 신청, 주문 접근 권한과 교환 가능 조건 필요 |
| ClaimDetail | `/claims/:claimId` | 취소·반품·교환 접수 상세, 신청 건 접근 권한 필요 |
| ReviewWrite | `/my/orders/:orderId/items/:itemId/review` | 구매 리뷰 작성, 로그인과 구매 자격 필요 |

인증 코드 입력·쿠폰 선택·배송지 편집은 해당 페이지 내부 UI로 가정한다. 비회원 주문 생성용 인증과 기존 주문 조회용 인증은 서로 다른 권한이다. 알 수 없는 주소는 `NotFound`로 고정 이동하며, 이 고정 리다이렉트는 다이어그램에서 생략한다.

## 3. 전체 이동 요약

일반적인 구매·구매 후 관리 경로를 요약했다. 인증·업무 조건·API 분기는 뒤의 상세 시나리오에서 다룬다.

```navigation
Home --> ProductList : 카테고리 선택
Home --> SearchResult : 검색
ProductList --> ProductDetail : 상품 선택
SearchResult --> ProductDetail : 상품 선택
ProductDetail --> Cart : 장바구니 담기 완료
Cart --> Checkout : 주문 자격 확인 완료
Checkout --> Payment : 주문 생성 완료
Payment --> PaymentGateway : 결제 시작
PaymentGateway --> PaymentReturn : 쇼핑몰로 복귀
PaymentReturn --> OrderComplete : 결제 확정
OrderComplete --> OrderDetail : 주문 확인
Home --> MyPage : 마이페이지
MyPage --> OrderList : 주문 내역
OrderList --> OrderDetail : 주문 선택
OrderDetail --> DeliveryTracking : 배송 조회
OrderDetail --> CancelRequest : 취소 신청
OrderDetail --> ReturnRequest : 반품 신청
OrderDetail --> ExchangeRequest : 교환 신청
OrderDetail --> ReviewWrite : 리뷰 작성
```

- 상품 탐색 → 장바구니 → 주문서 → 결제 → 완료가 기본 구매 경로다.
- 주문 상세는 배송 조회와 구매 후 처리의 공통 출발점이다. 각 기능의 자격 판정은 상세 흐름에 포함한다.
- 로그인·비회원 인증·실패 복구는 요약에서 생략했다. 요약의 완료 라벨은 해당 조건을 이미 충족한 이동을 뜻한다.

## 4. 시나리오별 상세

### S01. 카테고리·검색으로 상품 찾기

구매할 상품을 찾는 사용자가 홈에서 카테고리를 둘러보거나 검색어를 입력하는 상황이다. 목록에서 상품을 선택하면 상세 정보를 확인하며, 상품이 없거나 더 이상 공개되지 않으면 안내 화면으로 이동한다. 검색 결과나 상품 링크로 바로 들어온 경우에도 같은 탐색 흐름을 이어간다.

```navigation
Home --> ProductList : 카테고리 선택
Home --> (/product_search) : 검색 실행
SearchResult --> (/product_search) : 직접 진입 또는 검색 조건 변경 또는 재시도
(/product_search) --> SearchResult : 검색 결과 표시
(/product_search) --> SearchResult : 검색 결과 없음
(/product_search) --> Home : 홈에서 실행한 검색 실패
(/product_search) --> SearchResult : 결과 화면에서 실행한 조회 실패
ProductList --> ProductDetail : 상품 선택
SearchResult --> ProductDetail : 상품 선택
ProductDetail --> (/product_get) : 진입 또는 다시 조회
(/product_get) --> ProductDetail : 조회 성공
(/product_get) --> NotFound : 상품 없음
(/product_get) --> NotFound : 판매 공개 종료
(/product_get) --> NotFound : 접근 불가
(/product_get) --> ProductDetail : 일시 오류와 재시도 안내
NotFound --> Home : 홈으로 이동
ProductDetail --> ProductList : 해당 카테고리 보기
ProductDetail --> SearchResult : 검색 결과로 복귀
```

- 홈에서 검색하면 `/product_search`를 먼저 호출하고, 성공 응답을 받은 뒤 검색 조건과 결과를 `SearchResult`에 전달해 표시한다. 검색어는 결과 화면 URL의 `q`에 반영한다.
- 검색 URL 직접 접속·새로고침은 `SearchResult`에서 검색 조건을 읽어 `/product_search`를 호출한다. 검색어·정렬·필터·페이지 변경과 재시도도 결과 화면에서 조회한다.
- 검색 결과가 없으면 `SearchResult`에서 검색어·필터를 바꾼다. 빈 결과 전용 페이지는 만들지 않는다.
- 검색 조회에 실패하면 요청한 화면에 머물러 오류를 안내하고 같은 조건으로 재시도한다. 홈 검색 실패는 `Home`, 결과 화면의 조회 실패는 `SearchResult`에서 처리한다.
- 상세 조회의 일시 오류는 `ProductDetail`의 오류 UI에 표시하고 같은 주소에서 다시 조회한다. 상품 없음과 구분한다.
- 검색 결과 복귀는 검색에서 진입했을 때만 제공하고, 검색어·정렬·필터를 보존한다. 직접 링크로 진입한 경우 카테고리나 홈으로 이동한다.

### S02. 회원가입과 인증

계정이 없는 사용자가 회원 기능을 이용하기 위해 가입하는 상황이다. 홈이나 로그인 화면에서 먼저 약관에 동의한 뒤 가입 정보를 입력하고 인증 코드를 확인하면 회원가입이 완료된다. 가입 후에는 로그인 화면으로 이동하며, 구매 중 가입했다면 로그인 후 원래 흐름으로 돌아갈 수 있다.

```navigation
Home --> SignupTerms : 회원가입
Login --> SignupTerms : 회원가입
SignupTerms --> (validate_signup_terms) : 동의하고 계속
(validate_signup_terms) --> SignupTerms : 필수 약관 미동의
(validate_signup_terms) --> Signup : 필수 약관 동의 완료
SignupTerms --> Home : 가입 취소
Signup --> SignupTerms : 진입 시 필수 약관 동의 없음
Signup --> SignupTerms : 약관 다시 확인
Signup --> (validate_signup) : 가입 신청
(validate_signup) --> Signup : 입력 오류
(validate_signup) --> SignupTerms : 필수 약관 동의 없음
(validate_signup) --> (/signup_start) : 입력 유효
(/signup_start) --> Signup : 가입 불가 또는 요청 실패
(/signup_start) --> SignupTerms : 필수 약관 동의 누락 또는 버전 만료
(/signup_start) --> SignupVerify : 인증 요청 접수
SignupVerify --> (/signup_verify) : 인증 코드 제출
(/signup_verify) --> SignupVerify : 코드 불일치 또는 일시 오류
(/signup_verify) --> Signup : 인증 요청 만료
(/signup_verify) --> SignupComplete : 가입 완료
SignupVerify --> Signup : 정보 수정 또는 취소
SignupComplete --> Login : 로그인하기
Signup --> Login : 기존 계정으로 로그인
```

- 약관 동의는 `SignupTerms`, 회원 정보 입력은 `Signup`에서 처리한다. 선택 약관 미동의는 가입을 막지 않으며, 필수 약관에 동의하지 않으면 가입 폼으로 이동하지 않는다.
- `/signup` 직접 접속·새로고침은 `Signup`에서 시작한다. 페이지가 필수 약관 동의 상태를 확인해 유효하지 않으면 `SignupTerms`로 이동하고, 유효하면 가입 폼을 표시한다. 가입 신청 시 서버도 동의 항목과 약관 버전을 다시 검증한다.
- 약관 페이지로 돌아가도 허용된 `returnTo`를 유지한다. 약관 재확인과 인증 정보 수정으로 돌아온 가입 폼도 필수 약관 동의가 유효해야 이용할 수 있다.
- 인증이 끝나기 전에는 가입 완료 화면으로 이동하지 않는다.
- 인증 요청이 만료되면 가입 화면으로 돌아가 재요청한다. 코드 재발송은 `SignupVerify` 안에서 처리한다.
- 구매 도중 가입한 경우 허용된 `returnTo`를 가입·로그인 화면까지 전달한다. 가입 완료 자체로 주문을 실행하지 않는다.

### S03. 로그인·세션 만료·로그아웃

회원 기능을 이용하려는 사용자가 로그인하거나, 이용 중 세션이 만료되어 다시 로그인해야 하는 상황이다. 인증에 성공하면 원래 이용하려던 화면으로 돌아가고, 복귀할 화면이 없으면 홈으로 이동한다. 마이페이지에서 로그아웃하면 세션을 종료하고 홈으로 돌아간다.

```navigation
Home --> Login : 로그인
OrderList --> Login : 진입 시 미로그인
OrderList --> Login : 세션 만료 안내 후 이동
Login --> (/login) : 로그인 제출
(/login) --> Login : 인증 실패 또는 일시 오류
(/login) --> (resolve_return_to) : 인증 성공
(resolve_return_to) --> OrderList : 주문 내역에서 진입
(resolve_return_to) --> Checkout : 주문서에서 진입
(resolve_return_to) --> Wishlist : 찜 목록에서 진입
(resolve_return_to) --> MyPage : 마이페이지에서 진입
(resolve_return_to) --> ProductDetail : 상품 찜에서 진입
(resolve_return_to) --> ReviewWrite : 리뷰 작성에서 진입
(resolve_return_to) --> PaymentReturn : 결제 복귀 중 인증 만료
(resolve_return_to) --> Home : 복귀 주소 없음 또는 허용되지 않음
Login --> Home : 로그인 취소
MyPage --> (/logout) : 로그아웃
(/logout) --> Home : 로그아웃 완료
(/logout) --> MyPage : 로그아웃 실패
```

- `/my/orders` 직접 접속은 `OrderList`에서 시작한다. 페이지가 세션을 확인해 유효하면 주문 목록을 표시하고, 미로그인이거나 만료되었으면 `Login`으로 이동한다. 다른 회원 전용 페이지도 같은 방식으로 동작한다.
- 이용 중 로그인 세션이 만료되면 “로그인 유효시간이 지났습니다. 다시 로그인해 주세요.”를 안내한 뒤 `Login`으로 이동한다. 처음부터 미로그인인 경우에는 로그인 필요 안내를 제공한다.
- 복귀 주소는 서비스 내부 허용 라우트로 제한한다. 상품 찜처럼 쓰기 요청을 하던 중 로그인했다면 상품 화면으로 복귀한 뒤 사용자가 다시 실행한다. 로그인 후 쓰기 요청을 자동 재생하지 않는다.
- 표에 없는 보호 화면의 복귀도 동일한 규칙을 사용한다. 주문·신청 화면은 복귀 후 서버에서 소유권과 업무 조건을 다시 확인한다.
- 로그인 취소 시 홈으로 이동하며, 주문·장바구니 데이터는 해당 보존 정책에 따른다. 로그아웃 실패 시 성공한 것처럼 홈으로 이동하지 않는다.

### S04. 비밀번호 찾기·재설정

비밀번호를 잊은 사용자가 이메일로 재설정 링크를 받아 새 비밀번호를 정하는 상황이다. 만료되었거나 사용할 수 없는 링크를 열면 전용 안내 페이지에서 사유를 확인하고 메일 재발송 또는 로그인을 선택한다. 유효한 링크로 비밀번호 변경을 마치면 새 비밀번호로 로그인한다.

```navigation
Login --> ForgotPassword : 비밀번호 찾기
ForgotPassword --> (/password_request) : 이메일 입력 후 재설정 메일 요청
(/password_request) --> ForgotPassword : 찾기 화면 요청 접수 또는 입력·요청 오류
ResetPassword --> (/password_token_check) : 진입 또는 재설정 링크 확인 재시도
(/password_token_check) --> ResetPassword : 재설정 링크 유효
(/password_token_check) --> ResetPasswordNotice : 재설정 링크 만료·무효·이미 사용됨
(/password_token_check) --> ResetPassword : 확인 일시 오류와 재시도 안내
ResetPassword --> (validate_password) : 새 비밀번호 제출
(validate_password) --> ResetPassword : 입력 오류
(validate_password) --> (/password_reset) : 입력 유효
(/password_reset) --> ResetPassword : 일시 오류
(/password_reset) --> ResetPasswordNotice : 재설정 링크 만료·무효·이미 사용됨
(/password_reset) --> Login : 비밀번호 변경 완료 안내 후 이동
ResetPasswordNotice --> (/password_request) : 이메일 입력 후 메일 다시 보내기
(/password_request) --> ResetPasswordNotice : 안내 화면 재발송 요청 접수
(/password_request) --> ResetPasswordNotice : 안내 화면 재발송 입력 오류 또는 요청 실패
ResetPasswordNotice --> Login : 로그인하기 선택
ForgotPassword --> Login : 로그인하기 선택
```

- 최초 메일 요청은 `ForgotPassword`, 링크 만료 후 재발송 요청은 `ResetPasswordNotice`에서 처리한다. `/password_request` 응답은 요청을 보낸 페이지에서 표시하며, 접수 안내는 계정 존재 여부와 무관하게 동일하게 제공한다고 가정한다.
- 이 흐름의 `token`은 이메일의 비밀번호 재설정 링크에 포함된 일회용 변경 권한으로, 로그인 세션과 별개다. 유효기간이 지나면 만료되고, 비밀번호 변경을 완료하면 사용 처리되어 같은 링크로 다시 변경할 수 없다.
- 이메일의 재설정 링크를 열면 `ResetPassword`에서 토큰 확인 API를 호출한다. 유효성을 확인한 뒤 입력을 허용하며, 확인 중 일시 오류가 나면 같은 페이지에서 재시도한다.
- 링크 만료 시 `ResetPasswordNotice`로 이동해 “비밀번호 재설정 링크의 유효기간이 지났습니다. 메일을 다시 보내시겠어요?”를 표시한다. 이미 사용되었거나 무효한 경우에도 같은 페이지에서 서버 확인 결과에 맞는 사유를 안내한다. 안내 주소로 직접 접속해 사유 정보가 없으면 링크를 사용할 수 없다는 일반 안내를 표시한다.
- 안내 페이지에서 이메일을 입력하고 **메일 다시 보내기**를 선택하면 기존 `/password_request`를 호출한다. 재발송 대상은 사용자가 입력한 이메일로 서버가 확인하며, 만료된 링크를 열었다는 사실만으로 메일을 자동 발송하지 않는다.
- 재발송 요청이 접수되면 안내 페이지에 머물러 “입력하신 정보와 일치하는 계정이 있으면 재설정 메일을 보내드립니다. 메일함을 확인해 주세요.”를 표시한다. 입력·요청 오류도 같은 페이지에서 수정·재시도하며, 새 메일의 링크를 열면 `ResetPassword`에서 다시 확인한다.
- `ResetPasswordNotice`와 `ForgotPassword`에서 **로그인하기**를 선택하면 `Login`으로 이동한다. 비밀번호 변경이 완료된 경우에는 완료 안내 후 `Login`으로 이동한다.

### S05. 찜·장바구니에 상품 담기

관심 있는 상품을 나중에 다시 보거나 구매하기 위해 저장하는 상황이다. 찜은 로그인한 회원만 이용할 수 있고, 장바구니는 회원과 비회원 모두 옵션과 수량을 선택해 담을 수 있다. 저장에 성공하면 찜 목록이나 장바구니로 이동해 담긴 상품을 확인한다.

```navigation
ProductDetail --> Login : 찜 선택 시 미로그인
ProductDetail --> (/wishlist_add) : 찜 선택 시 로그인됨
(/wishlist_add) --> ProductDetail : 저장 실패
(/wishlist_add) --> Wishlist : 저장 완료
Wishlist --> ProductDetail : 상품 선택
ProductDetail --> (validate_cart_item) : 장바구니 담기
(validate_cart_item) --> ProductDetail : 옵션 미선택 또는 수량 오류
(validate_cart_item) --> (/cart_add) : 입력 유효
(/cart_add) --> ProductDetail : 품절 또는 판매 종료
(/cart_add) --> ProductDetail : 일시 오류
(/cart_add) --> Cart : 담기 완료
ProductDetail --> Cart : 장바구니 보기
Cart --> ProductDetail : 상품 다시 보기
```

- 이 예제는 담기·찜 성공 시 해당 목록으로 이동하는 UX를 선택했다. 성공 알림만 띄우고 상세에 머무는 방식도 가능하지만 여기서는 사용하지 않는다.
- 찜을 위해 로그인한 사용자는 `ProductDetail`로 복귀해 다시 저장한다. S03의 복귀 주소 규칙을 따른다.
- 장바구니의 수량 변경·삭제·선택, 찜 해제는 현재 목록 안에서 처리하므로 별도 이동으로 그리지 않는다.

### S06. 주문 진입과 비회원 주문 인증

장바구니에서 선택한 상품을 주문하려는 사용자의 주문 자격을 확인하는 상황이다. 로그인한 회원이나 주문용 인증을 마친 비회원은 주문서로 이동하고, 인증이 필요하면 로그인과 비회원 주문 중 하나를 선택한다. 비회원은 주문자 정보와 연락처 인증을 마친 뒤 주문서를 작성할 수 있다.

```navigation
Cart --> Checkout : 선택 상품 주문
Checkout --> Cart : 진입 시 주문 대상 없음 또는 유효하지 않음
Checkout --> CheckoutEntry : 진입 시 인증 필요
CheckoutEntry --> Login : 회원으로 주문
Login --> Checkout : 주문 중 로그인 성공
CheckoutEntry --> GuestCheckout : 비회원으로 주문
CheckoutEntry --> Cart : 주문 취소
GuestCheckout --> (/guest_checkout_verify) : 주문자 정보와 인증 코드 제출
(/guest_checkout_verify) --> GuestCheckout : 입력 오류 또는 코드 불일치
(/guest_checkout_verify) --> GuestCheckout : 만료 또는 일시 오류
(/guest_checkout_verify) --> Checkout : 주문용 인증 완료
GuestCheckout --> Cart : 주문 취소
```

- `/checkout` 직접 접속도 `Checkout`에서 시작한다. 페이지에서 주문 대상의 유효성을 먼저 확인하고, 대상이 유효하면 회원 세션 또는 비회원 주문 인증을 확인한다. 모두 충족하면 주문서를 표시하며, 대상이 잘못되면 `Cart`, 인증이 필요하면 `CheckoutEntry`로 이동한다.
- 주문 중 로그인 화면에는 `returnTo=/checkout`을 전달하며, 로그인 성공 후에는 `Checkout`으로 자동 복귀한다. 위 `Login → Checkout` 선은 S03의 로그인 API와 복귀 주소 판단을 요약한 것이다. 비회원 인증 완료도 같은 주문서로 연결된다.
- 비회원 인증 코드는 `GuestCheckout`에서 요청·재발송한다. 인증 성공은 이번 주문서 진입 권한만 부여한다.
- 인증 도중 장바구니가 바뀌거나 비면 주문서 진입 시 다시 확인하고 `Cart`로 돌려보낸다. 가격·재고 최종 판정은 S07에서 수행한다.
- 상품 상세의 바로 구매도 구매 대상 초안을 만든 뒤 `Checkout`으로 연결해 같은 진입 검사를 적용할 수 있다. 이 문서는 장바구니 주문을 기준 경로로 삼는다.

### S07. 주문서 작성·주문 생성

주문서에 도착한 사용자가 배송지와 할인, 결제 수단을 정해 주문을 만드는 상황이다. 제출 시 서버가 가격과 재고 등을 다시 확인하며, 조건이 달라졌다면 내용을 수정하거나 상품을 다시 선택한다. 주문 생성이 확인되면 결제 화면으로 이동하며, 응답을 받지 못한 경우에는 기존 요청의 결과를 확인해 중복 주문을 막는다.

```navigation
Checkout --> (validate_checkout) : 결제 진행
(validate_checkout) --> Checkout : 필수 입력 또는 약관 오류
(validate_checkout) --> (/order_create) : 입력 유효
(/order_create) --> Checkout : 가격 또는 할인 변경
(/order_create) --> Cart : 품절 또는 판매 종료
(/order_create) --> Login : 회원 세션 만료 안내 후 이동
(/order_create) --> CheckoutEntry : 비회원 주문 인증 만료 안내 후 이동
(/order_create) --> Checkout : 주문 생성 실패
(/order_create) --> (recover_order_create) : 응답 유실로 결과 불명
(recover_order_create) --> (/order_create) : 같은 요청 키로 결과 복구
(/order_create) --> Payment : 주문 생성 확인
Checkout --> Cart : 상품 구성 변경
```

- 주문 생성 시 서버가 금액·재고·쿠폰을 다시 검증한다. 금액이 달라지면 주문서에 변경 내용을 표시하고 사용자 확인 후 다시 진행한다.
- 주문 생성에는 요청 식별자를 사용한다. 응답을 받지 못해도 같은 요청 키로 기존 결과를 확인하므로 새 주문이 중복 생성되지 않는 계약을 가정한다.
- `Payment`에는 서버에서 생성 확인된 `orderId`만 전달한다. 주문 생성이 결제 확정을 뜻하지는 않는다.

### S08. 외부 결제·실패·취소·결과 복구

생성된 주문의 결제를 외부 결제창에서 진행하고, 서버가 확인한 결과에 따라 완료·결제·주문 상세 화면으로 이동하는 상황이다. 결제 시작, 외부 결제창 복귀, 결과 재확인을 아래 세 다이어그램으로 나눴다. 각 그림의 같은 화면명은 같은 페이지를 뜻하며, 앞 그림에서 도착한 화면의 다음 행동은 해당 그림에서 이어 읽는다.

#### S08-1. 결제 시작·외부 결제창 이동

S07에서 주문 생성이 확인되면 `Payment`로 이동한다. 결제 화면 진입 시에는 S08-3의 상태 확인을 먼저 거치며, 서버가 미결제를 확인한 경우에만 아래 결제를 시작한다.

```navigation
Payment --> (/payment_start) : 결제하기
(/payment_start) --> PaymentGateway : 결제 세션 발급
(/payment_start) --> Payment : 발급 실패 또는 처리 중
(/payment_start) --> OrderComplete : 이미 결제 확정
(/payment_start) --> OrderDetail : 주문 취소 또는 만료
```

- **결제 세션 발급:** 서버가 해당 주문·금액으로 결제를 진행할 수 있도록 결제사에 결제 세션을 만들고, 외부 결제창 주소를 받은 상황이다. 발급된 주소로 `PaymentGateway`를 열며, 아직 결제가 완료된 것은 아니다.
- **이미 결제 확정:** 결제 화면을 연 뒤 다른 탭이나 이전 결제 시도에서 같은 주문의 결제가 완료되어, 결제 시작 요청 시 서버가 이미 결제된 주문임을 확인한 상황이다. 중복 결제를 막기 위해 새 결제창을 열지 않고 `OrderComplete`로 이동한다.
- **주문 취소 또는 만료:** 주문 자체가 취소되었거나 결제 가능 기한이 지나 주문이 만료되어 더는 결제할 수 없는 상황이다. `OrderDetail`로 이동해 최신 주문 상태를 보여 준다. 외부 결제창에서 결제 시도만 취소한 경우와는 구분한다.
- 외부 결제창에서 돌아오는 흐름은 S08-2로 이어진다.

#### S08-2. 외부 결제창 복귀·실패·취소 확인

결제사에서 `/payment/return`으로 돌아오거나 해당 주소를 직접 열고 새로고침하면 모두 `PaymentReturn`에서 복귀 정보를 읽고 결제 확인 API를 호출한다.

```navigation
PaymentGateway --> PaymentReturn : 결제 결과와 함께 복귀
PaymentReturn --> (/payment_confirm) : 진입 시 복귀 정보 검증
(/payment_confirm) --> OrderComplete : 서버 결제 확정
(/payment_confirm) --> Payment : 결제 실패 또는 사용자 취소
(/payment_confirm) --> Payment : 처리 중 또는 결과 불명
(/payment_confirm) --> Payment : 검증 일시 오류
(/payment_confirm) --> OrderDetail : 주문 취소 또는 만료
(/payment_confirm) --> Login : 회원 세션 만료 안내 후 이동
(/payment_confirm) --> GuestOrderLookup : 비회원 주문 조회 권한 없음 안내 후 이동
```

- 외부 결제창의 성공 문구나 URL 파라미터만으로 완료 화면을 표시하지 않는다. 서버가 결제사와 확인한 결과를 기준으로 이동한다.
- 실패·취소·확인 지연으로 `Payment`에 돌아오면 S08-3에서 상태를 다시 확인하고 후속 행동을 선택한다.
- 결제 복귀 중 세션이 사라진 회원은 로그인 후 원래 복귀 주소로 돌아온다. 비회원은 `GuestOrderLookup`에서 해당 주문을 다시 인증한다. 서버 결제 처리는 화면 이탈 여부와 별개로 확인되어야 한다.

**결제는 완료됐지만 세션이 만료되거나 쇼핑몰 처리가 실패한 경우**

결제사에서 실제 결제 승인이 완료된 경우를 기준으로, 이 설계에서는 다음 복구 정책을 가정한다.

- **회원 세션만 만료:** 로그인 권한이 만료된 것이므로 이미 승인된 결제를 자동 취소하지 않는다. 로그인 후 원래 복귀 주소에서 주문 접근 권한과 결제 상태를 다시 확인하고, 주문의 결제 확정이 확인되면 `OrderComplete`로 이동한다.
- **승인 결과 반영 실패:** 결제사에서는 승인됐지만 쇼핑몰의 응답 유실·서버 오류로 주문에 반영되지 않은 상황이다. 사용자 로그인·화면 복귀와 별개로 서버가 검증된 결제사 알림과 거래 조회를 통해 주문 ID·결제 거래 ID·금액을 대조하고, 누락된 결제·주문 상태 반영을 재시도한다. 같은 거래를 중복 확정하지 않으며, 주문을 정상 확정할 수 있으면 기존 결제로 복구한다.
- **주문을 완료할 수 없음:** 주문 취소·만료 등으로 정상 확정이 불가능하다고 서버가 최종 판단하면, 해당 결제 거래에 승인 취소 또는 환불을 요청한다. 취소·환불 요청 접수만으로 완료로 표시하지 않고, 결제사에서 실제 처리 완료를 확인한 뒤 주문 상세에 결과를 반영한다. 취소 방식과 환불 소요 시간은 결제 수단·결제사 정책에 따른다.
- **복구·취소 결과 확인 지연:** 실제 승인 상태나 취소·환불 결과가 불명확하면 화면에 확인·처리 중임을 안내하고 새 결제를 막는다. 서버는 같은 거래의 최신 상태를 조회해 중복 처리 없이 복구를 이어가며, 자동 처리로 해결되지 않는 건은 운영자가 확인한다. 로그인 실패나 일시적인 서버 오류만으로 결제 실패·환불 완료를 단정하지 않는다.

#### S08-3. 결과 재확인·재진입·후속 이동

`Payment` 주소를 다시 열거나 결과를 재확인할 때는 서버의 최신 주문·결제 상태를 조회한다. 결제가 확정되면 완료 화면으로 이동하고, 미결제라면 S08-1에서 결제를 시작하거나 주문 상세에서 나중에 이어갈 수 있다.

```navigation
Payment --> (/payment_status) : 진입 또는 결과 다시 확인
(/payment_status) --> OrderComplete : 결제 확정
(/payment_status) --> Payment : 미결제 또는 처리 중
(/payment_status) --> Payment : 조회 오류와 재확인 안내
(/payment_status) --> OrderDetail : 주문 취소 또는 만료
Payment --> OrderDetail : 나중에 결제
OrderComplete --> OrderDetail : 주문 상세 보기
OrderComplete --> Home : 계속 쇼핑하기
```

- 결제창을 닫아 복귀가 없으면 자동 이동도 없다. 원래 결제 화면이나 주문 상세에서 상태를 다시 확인한다.
- 결과 불명·처리 중에는 재확인을 제공하고 새 결제는 막는다. 서버가 미결제를 확정한 경우에만 기존 주문으로 새 결제를 시작한다. 이미 결제된 주문의 재진입은 `OrderComplete`로 연결된다.
- 위 결제 API는 같은 주문·결제 시도를 중복 확정하지 않는 계약을 갖는다. 유효한 주문 식별자조차 없으면 라우트 검증에서 `NotFound`로 이동한다.

### S09. 회원 주문 조회·배송 조회

회원이 이전 주문의 내용과 배송 진행 상황을 확인하는 상황이다. 마이페이지의 주문 목록이나 주문 완료 화면에서 상세를 열면 서버가 해당 주문을 볼 권한을 확인하고, 배송 정보가 있으면 배송 조회로 이어진다. 주문 상세 주소로 바로 들어와도 같은 확인을 거치며, 아직 결제하지 않은 주문은 결제를 이어갈 수 있다.

```navigation
MyPage --> OrderList : 주문 내역
OrderList --> OrderDetail : 주문 선택
OrderComplete --> OrderDetail : 주문 상세 보기
OrderDetail --> (/order_get) : 진입 또는 다시 조회
(/order_get) --> Login : 회원 세션 만료 안내 후 이동
(/order_get) --> GuestOrderLookup : 비회원 조회 인증 만료 안내 후 이동
(/order_get) --> OrderList : 회원의 주문 없음 또는 접근 불가
(/order_get) --> GuestOrderLookup : 비회원의 주문 없음 또는 접근 불가
(/order_get) --> OrderDetail : 조회 성공
(/order_get) --> OrderDetail : 일시 오류와 재시도 안내
OrderDetail --> (/tracking_get) : 배송 조회
(/tracking_get) --> DeliveryTracking : 배송 정보 있음
(/tracking_get) --> OrderDetail : 배송 준비 중 또는 조회 실패
DeliveryTracking --> OrderDetail : 주문 상세로 복귀
OrderDetail --> Payment : 미결제 주문 이어서 결제
OrderDetail --> OrderList : 회원 주문 목록으로 복귀
```

- 주문 목록이 비면 `OrderList`에 빈 목록과 쇼핑 계속하기를 표시한다. 상세 조회의 일시 오류는 같은 상세 주소에서 재시도한다.
- `/orders/:orderId` 직접 접속도 `OrderDetail`에서 시작해 주문 조회 API로 접근 권한과 주문 정보를 확인한 뒤 내용을 표시한다.
- 로그인만으로 다른 회원의 주문을 열 수 없다. 서버의 소유권 확인을 통과해야 한다. 비회원 권한도 인증한 주문 한 건으로 제한한다.
- 배송 조회는 내부 `DeliveryTracking` 화면을 가정한다. 송장 발급 전에는 주문 상세에 머문다.
- 미결제 주문만 결제를 이어갈 수 있다. 취소·만료 여부는 S08의 서버 상태 확인에서 다시 판정한다.

### S10. 비회원 주문 조회

회원가입 없이 구매한 사용자가 자신의 주문 내역을 확인하는 상황이다. 비회원 주문 조회 화면에서 주문번호와 연락처를 입력하고 인증 코드를 확인하면 해당 주문의 상세를 볼 수 있다. 인증한 주문에 한해 배송 조회나 취소·반품·교환을 이용하며, 다른 주문을 보려면 다시 조회 인증을 진행한다.

```navigation
Home --> GuestOrderLookup : 비회원 주문 조회
GuestOrderLookup --> (/guest_order_challenge) : 주문번호와 연락처 제출
(/guest_order_challenge) --> GuestOrderLookup : 입력 오류 또는 일시 오류
(/guest_order_challenge) --> GuestOrderVerify : 조회 인증 절차 시작
GuestOrderVerify --> (/guest_order_verify) : 인증 코드 제출
(/guest_order_verify) --> GuestOrderVerify : 코드 불일치 또는 일시 오류
(/guest_order_verify) --> GuestOrderLookup : 인증 요청 만료
(/guest_order_verify) --> OrderDetail : 해당 주문 조회 인증 완료
GuestOrderVerify --> GuestOrderLookup : 정보 수정 또는 취소
OrderDetail --> GuestOrderLookup : 비회원 다른 주문 조회
```

- 주문번호와 연락처만으로 상세를 바로 공개하지 않고 해당 연락처의 인증 코드를 확인한다. 요청 접수 화면은 주문 존재 여부를 구별하지 않으며, 일치하는 정보에만 코드를 보낸다고 가정한다.
- 인증 후 조회 권한은 해당 주문에만 부여한다. 배송 조회와 취소·반품·교환도 같은 주문 범위에서 허용한다.
- 비회원 주문 상세에서는 회원 주문 목록 버튼 대신 다른 주문 조회를 제공한다. 리뷰 작성은 회원 구매 정책을 따른다.

### S11. 출고 전 주문 취소

주문한 상품이 출고되기 전에 구매를 취소하려는 상황이다. 주문 상세에서 취소를 선택하면 서버가 가능 여부를 확인하고, 사용자가 대상과 사유를 제출하면 접수 결과 화면으로 이동한다. 신청하는 동안 출고되어 취소가 불가능해질 수 있으며, 접수 후 취소·환불 진행 상황은 신청 상세에서 확인한다.

```navigation
OrderDetail --> CancelRequest : 주문 취소
CancelRequest --> (/cancel_eligibility) : 진입 시 취소 가능 여부 확인
(/cancel_eligibility) --> CancelRequest : 취소 가능
(/cancel_eligibility) --> OrderDetail : 취소 불가 또는 확인 실패
CancelRequest --> (/cancel_request) : 사유와 취소 대상 제출
(/cancel_request) --> CancelRequest : 입력 오류 또는 일시 오류
(/cancel_request) --> OrderDetail : 출고 등으로 취소 불가
(/cancel_request) --> ClaimDetail : 취소 접수 확인
CancelRequest --> OrderDetail : 신청 취소
ClaimDetail --> OrderDetail : 주문 확인
```

- 취소 URL 직접 접속도 `CancelRequest`에서 시작한다. 페이지에서 서버에 취소 가능 여부를 확인해 가능할 때만 신청 폼을 표시하고, 불가하거나 확인에 실패하면 주문 상세로 이동한다.
- 취소 화면 진입과 최종 제출 시 모두 서버가 취소 가능 여부를 확인한다. 화면을 보는 동안 출고되면 신청을 거절하고 최신 주문 상세로 이동한다.
- 접수 성공은 환불 완료와 다르다. `ClaimDetail`에서 취소·환불 진행 상황을 확인한다. 단순 취소라면 접수와 완료가 동시에 처리될 수도 있다.
- 접수 응답이 유실되면 같은 요청 키로 접수 결과를 복구한다. 중복 접수는 기존 `claimId`를 반환한다는 공통 계약을 따른다.

### S12. 배송 완료 후 반품·교환

배송받은 상품을 돌려보내거나 다른 옵션으로 바꾸려는 상황이다. 주문 상세에서 반품 또는 교환을 선택하면 신청 자격을 확인하고, 대상 상품과 사유·수거 정보 등을 입력해 접수한다. 신청 기간이나 교환 재고 등의 조건을 충족해야 하며, 접수 후 수거·검수·환불·재배송 진행 상황은 신청 상세에서 확인한다.

```navigation
OrderDetail --> ReturnRequest : 반품 신청
ReturnRequest --> (/return_eligibility) : 진입 시 반품 자격 확인
(/return_eligibility) --> ReturnRequest : 신청 가능
(/return_eligibility) --> OrderDetail : 신청 불가 또는 확인 실패
ReturnRequest --> (/return_request) : 대상과 사유와 수거 정보 제출
(/return_request) --> ReturnRequest : 입력 오류 또는 일시 오류
(/return_request) --> OrderDetail : 신청 기간 만료 또는 중복 처리
(/return_request) --> ClaimDetail : 반품 접수 확인
ReturnRequest --> OrderDetail : 신청 취소
OrderDetail --> ExchangeRequest : 교환 신청
ExchangeRequest --> (/exchange_eligibility) : 진입 시 교환 자격 확인
(/exchange_eligibility) --> ExchangeRequest : 신청 가능
(/exchange_eligibility) --> OrderDetail : 신청 불가 또는 확인 실패
ExchangeRequest --> (/exchange_request) : 교환 옵션과 수거 정보 제출
(/exchange_request) --> ExchangeRequest : 옵션 품절 또는 입력 오류
(/exchange_request) --> ExchangeRequest : 일시 오류
(/exchange_request) --> OrderDetail : 신청 기간 만료 또는 중복 처리
(/exchange_request) --> ClaimDetail : 교환 접수 확인
ExchangeRequest --> OrderDetail : 신청 취소
ClaimDetail --> OrderDetail : 주문 확인
```

- 반품·교환 URL 직접 접속은 각각 `ReturnRequest`·`ExchangeRequest`에서 시작한다. 각 페이지가 자격 확인 API를 호출하고, 신청 가능 응답을 받은 뒤에만 입력 폼을 표시한다.
- 배송 완료 여부, 신청 기간, 상품별 제한, 기존 신청 여부를 서버에서 판정한다. 교환 옵션 재고는 최종 제출 시에도 확인한다.
- 반품·교환 접수 후 수거·검수·환불·재배송은 `ClaimDetail`의 표시 상태로 다룬다. 화면 이동이 없는 업무 단계는 이 다이어그램에 펼치지 않는다.
- 접수 결과 불명 시에는 S11과 같은 요청 키로 복구한다. 부분 반품·교환은 대상 상품을 신청 화면에서 선택하는 것으로 가정하며 비용 계산 정책은 미확정이다.

### S13. 구매 리뷰 작성

상품을 구매한 회원이 배송 완료 후 사용 경험을 리뷰로 남기는 상황이다. 주문 상세에서 리뷰 작성을 선택하면 구매 자격과 기존 작성 여부를 확인한 뒤 평점과 본문 등을 입력한다. 등록에 성공하면 상품 상세의 리뷰 영역으로 이동하며, 로그인 세션이 만료되면 다시 로그인한 뒤 작성 자격을 확인한다.

```navigation
OrderDetail --> ReviewWrite : 리뷰 작성
ReviewWrite --> (/review_eligibility) : 진입 시 구매 자격 확인
(/review_eligibility) --> Login : 회원 세션 없음
(/review_eligibility) --> OrderDetail : 작성 불가 또는 이미 작성됨
(/review_eligibility) --> OrderDetail : 자격 확인 실패
(/review_eligibility) --> ReviewWrite : 작성 가능
ReviewWrite --> (/review_create) : 리뷰 등록
(/review_create) --> ReviewWrite : 입력 오류 또는 일시 오류
(/review_create) --> Login : 회원 세션 만료 안내 후 이동
(/review_create) --> OrderDetail : 구매 자격 상실 또는 이미 작성됨
(/review_create) --> ProductDetail : 등록 완료 후 리뷰 영역 보기
ReviewWrite --> OrderDetail : 작성 취소
```

- 리뷰 작성 URL 직접 접속도 `ReviewWrite`에서 시작해 구매 자격 확인 API를 호출한다. 작성 가능 응답을 받은 뒤 입력 폼을 표시하며, 인증이나 자격 문제가 있으면 해당 응답에 따라 이동한다.
- 배송 완료된 회원 구매 상품만 리뷰를 작성할 수 있다고 가정한다. 주문 상품별 한 번만 등록하며 서버에서 중복을 막는다.
- 로그인 후에는 원래 `ReviewWrite`로 복귀하고 자격을 다시 확인한다. 비회원 주문을 회원 구매로 전환하는 정책은 범위에서 제외한다.
- 평점·본문 검증과 이미지 업로드는 `ReviewWrite` 내부에서 수행한다. 완료 후 상품 상세의 리뷰 영역으로 이동하며 리뷰 영역을 독립 페이지로 만들지 않는다.

## 5. 공통 접근·복구 규칙

1. **보호 라우트:** 회원 전용 URL은 해당 페이지에서 세션을 확인한 뒤 내용을 표시하거나 로그인 화면으로 이동한다. 주문·배송·신청·결제 URL은 회원 소유권 또는 해당 비회원 주문 권한을 서버에서 검사한다. 인증이 없으면 회원은 `Login`, 비회원은 `GuestOrderLookup`으로 이동하고, 인증 후 원래 주소의 접근·업무 조건을 다시 확인한다. S11~S13에서는 중복을 줄이기 위해 S03·S09·S10의 인증 복구 분기를 일부 생략했다.
2. **직접 진입:** URL 입력·북마크·이메일·새로고침은 화면 간 클릭으로 그리지 않는다. 해당 URL의 페이지에서 시작하고, 그 페이지가 조건을 확인해 다른 페이지로 이동하거나 API를 호출하는 흐름으로 그린다. 주문 완료 주소 직접 진입도 서버 상태를 확인하고 미결제는 `Payment`, 취소·만료는 `OrderDetail`로 보낸다.
3. **유효하지 않은 대상:** 상품은 `NotFound`, 주문·신청은 권한에 맞는 주문 목록 또는 비회원 조회 화면으로 돌려보낸다. 식별자 자체가 잘못된 URL은 `NotFound`로 이동한다. 권한 없는 주문의 존재나 개인정보는 노출하지 않는다.
4. **세션 만료:** 회원의 로그인 세션이 만료되면 “로그인 유효시간이 지났습니다. 다시 로그인해 주세요.”를 안내한 뒤 `Login`으로 이동한다. 비회원 주문 인증·조회 권한 만료는 해당 인증을 다시 진행하도록 사유를 안내한다. 안내는 현재 페이지의 알림 UI로 제공한다. 변경 요청은 인증 오류 후 자동 재생하지 않으며, 로그인·인증 완료 후 화면으로 복귀해 최신 정보를 확인하고 사용자가 다시 제출한다. 결제 복귀의 서버 검증은 같은 결제 시도를 안전하게 다시 확인하는 예외다.
5. **결과 불명:** 주문 생성·결제·신청·리뷰 등 쓰기 요청은 요청 키나 업무상의 고유 키로 중복을 막고 같은 결과를 복구한다. 네트워크 오류를 처리 실패 확정으로 간주하지 않는다. 조회 실패는 해당 화면에 재시도를 제공한다.
6. **뒤로가기·이탈:** 브라우저 뒤로가기로 취소·결제 완료를 되돌리지 않는다. 페이지 재진입 시 서버 상태를 읽는다. 입력 중 이탈 확인은 현재 페이지의 확인 UI로 처리한다. 장바구니와 허용 가능한 초안만 보존하며 인증 코드·결제 인증 정보는 복귀 데이터로 저장하지 않는다.

## 6. 이동·결과 표시에 필요한 API 계약 예시

아래는 실제 구현 주소가 아니라 제안한 HTTP 계약이다. 인증·권한 오류는 5절의 공통 규칙을 따른다. 일시 오류는 해당 입력 화면에 머무는 것이 기본이며, 조회 결과의 빈 값·접근 불가·업무 조건 변경은 상세 시나리오의 분기로 구분한다.

| 논리 API | HTTP 계약 예시 | 화면 이동·표시를 결정하는 결과 |
| --- | --- | --- |
| `/product_search` | `GET /api/products/search?q=...&sort=...&filter=...&page=...` | 검색 결과 표시, 결과 없음, 조회 오류 |
| `/product_get` | `GET /api/products/:productId` | 상세 표시, 상품 없음·공개 종료·접근 불가, 조회 오류 |
| `/signup_start` | `POST /api/auth/signup/challenges` | 가입 입력 오류, 필수 약관 동의 누락·버전 만료, 인증 요청 접수 |
| `/signup_verify` | `POST /api/auth/signup/verify` | 코드 오류·만료, 가입 완료 |
| `/login` | `POST /api/auth/login` | 인증 실패, 회원 세션 발급 |
| `/logout` | `POST /api/auth/logout` | 세션 종료 완료, 종료 실패 |
| `/password_request` | `POST /api/auth/password/reset-requests` | 입력 이메일의 최초 요청·재발송 접수, 입력 오류·요청 실패, 요청한 페이지에서 안내 |
| `/password_token_check` | `POST /api/auth/password/reset-token/verify` | 재설정 링크 토큰 유효·무효·만료·이미 사용됨, 확인 실패 |
| `/password_reset` | `POST /api/auth/password/reset` | 입력 오류, 재설정 링크 토큰 무효·만료·이미 사용됨, 비밀번호 변경 완료 |
| `/wishlist_add` | `POST /api/me/wishlist/items` | 저장 완료 또는 기존 저장 확인, 저장 실패 |
| `/cart_add` | `POST /api/cart/items` | 담기 완료, 품절·판매 종료·입력 오류 |
| `/guest_checkout_verify` | `POST /api/checkout/guest/verify` | 코드 오류·만료, 주문서용 인증 발급 |
| `/order_create` | `POST /api/orders` | 가격 변경, 품절, 인증 만료, 생성한 주문 ID |
| `/payment_start` | `POST /api/orders/:orderId/payment-sessions` | 외부 결제 URL, 이미 결제됨, 처리 중·취소·만료 |
| `/payment_confirm` | `POST /api/payments/confirm` | 서버 검증 후 확정·실패·취소·처리 중·결과 불명 |
| `/payment_status` | `GET /api/orders/:orderId/payment-status` | 확정·미결제·처리 중·취소·만료, 조회 오류 |
| `/order_get` | `GET /api/orders/:orderId` | 접근 가능한 주문, 인증 만료, 없음·접근 불가 |
| `/tracking_get` | `GET /api/orders/:orderId/tracking` | 배송 정보, 준비 중, 조회 실패 |
| `/guest_order_challenge` | `POST /api/guest/orders/challenges` | 입력 오류, 조회 인증 절차 시작 |
| `/guest_order_verify` | `POST /api/guest/orders/verify` | 코드 오류·만료, 해당 주문의 조회 권한 발급 |
| `/cancel_eligibility` | `GET /api/orders/:orderId/cancel-eligibility` | 취소 가능 여부 |
| `/cancel_request` | `POST /api/orders/:orderId/cancellations` | 입력 오류, 취소 불가, 접수한 신청 ID |
| `/return_eligibility` | `GET /api/orders/:orderId/return-eligibility` | 반품 가능 여부 |
| `/return_request` | `POST /api/orders/:orderId/returns` | 입력 오류, 기간 만료·중복 처리, 접수한 신청 ID |
| `/exchange_eligibility` | `GET /api/orders/:orderId/exchange-eligibility` | 교환 가능 여부 |
| `/exchange_request` | `POST /api/orders/:orderId/exchanges` | 옵션 품절, 기간 만료·중복 처리, 접수한 신청 ID |
| `/review_eligibility` | `GET /api/orders/:orderId/items/:itemId/review-eligibility` | 구매 자격, 기존 리뷰 여부 |
| `/review_create` | `POST /api/orders/:orderId/items/:itemId/reviews` | 입력 오류, 자격 상실·중복, 등록 완료 |

검색 결과 조회는 S01의 검색 실행 흐름을 설명하기 위해 포함했다. 그 외 목록 조회, 인증 코드 발송·재발송, 배송지 저장, 쿠폰 적용, 신청 상세 조회 등 현재 화면에 데이터를 표시하는 API는 이 표에서 생략했다. `PaymentGateway`의 주소는 클라이언트에서 조합하지 않고 결제 세션 발급 결과를 사용한다.

## 7. 검토 범위와 실제 서비스에서 정할 사항

이 문서는 제안한 화면·라우트·API와 분기 조건의 일관성을 검토하는 설계 예제다. 성공, 입력 오류, 인증 만료, 권한 거부, 빈 결과, 품절, 결제 취소, 결과 불명, 주요 직접 진입 경로를 다뤘다. 실제 쇼핑몰 코드나 결제사에 연결한 검증은 수행하지 않았다.

전체 요약 1개와 상세 시나리오 13개를 총 16개의 다이어그램으로 구성했다. S08은 결제 시작·외부 결제창 복귀·결과 재확인으로 나눴다. 작성 당시의 검토 기록에는 화면·라우트·논리 API의 정적 대조, 다이어그램 변환 결과의 파서 확인, S08의 세 다이어그램에 대한 브라우저 배치·가독성 확인이 포함된다. 이는 당시 사용한 구현과 확인한 화면 범위에 한정하며, 예제를 설치하거나 재사용한 환경에서의 렌더링·실행 검증을 뜻하지 않는다. 다른 시나리오의 브라우저 배치는 검증하지 않았다.

실제 구현 전에 다음 정책을 확정해야 한다.

- 로그인 시 비회원 장바구니 병합 방식과 주문서·입력 초안의 보존 기간.
- 결제 수단별 승인 방식, 가상계좌 입금 대기, 결제·재고 예약 만료 시간.
- 부분 취소·반품·교환 범위, 배송비·쿠폰 재계산과 추가 결제 경로.
- 반품·교환 신청 기간, 수거 방식, 검수 후 거절·철회 처리.
- 비회원 인증 수단과 조회 권한 만료 시간, 회원 구매 전환·리뷰 허용 여부.
- 품절·중복 신청·외부 결제 결과 지연처럼 동시 요청으로 생기는 조건의 최종 서버 계약.
