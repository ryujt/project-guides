# Navigation 문서 작성 샘플

Navigation 문서를 작성·수정할 때 먼저 읽는 구성 샘플이다. 규칙의 원본은 [Navigation 가이드](../../../guides/navigation-diagram-guide.md#문서-구성과-화면-확인-링크)이며, 이 문서는 그 규칙을 적용할 모양을 보여 준다. 샘플의 절 제목은 유지하되 페이지·시나리오 수와 도메인 정책은 대상에 맞게 정한다.

## 먼저 확인할 예제

- [작은 완성 예제](document-sample/navigation.md): 가상의 자료 열람 서비스로 문서와 화면을 함께 살펴본다. 범위 설명을 읽고, 지금 작성할 과업에 해당하는 시나리오 절만 확인한다. 실제 구현의 근거를 주장하는 AS-IS 분석 결과가 아니다.
- [페이지 배치와 장면 목록](document-sample/screen-layout.md): 같은 페이지의 여러 장면을 HTML 한 파일과 연결하는 형식이다.
- [큰 AS-IS 예제 안내](../../as-is/README.md): 많은 시나리오를 한 문서 안에 모은 구조가 필요할 때만 참고한다. 원본 코드 링크·과거 검증 기록을 현재 프로젝트의 근거로 재사용하지 않는다.

## 문서 골격

아래는 복사 후 대상 내용으로 채우는 양식이다. 꺾쇠 안의 내용과 경로는 자리표시자이며, 실제 페이지·장면·근거와 존재하는 링크로 바꾼다. 조사 근거는 관련 분석서·설계서에 기록하고, 화면 확인 링크는 시나리오마다 남긴다.

````markdown
# <대상 범위> Navigation

## 범위·확인 기준

<대상 UI·기준선·확인 방법·제외와 미확인>

<a id="n01"></a>
## N01. <사용자 과업>

```navigation
<확인한 페이지 이동과 필요한 API·판단·분기>
```

- <주요 정상 흐름>
- <실패·취소·복귀 흐름과 조건>

### 화면 확인 링크

| 페이지·장면 | 화면 HTML | Layout |
| --- | --- | --- |
| <페이지> · <실패 장면> | [기본](details/screens/<screen-id>.html#<default-scene-id>) · [<실패 장면>](details/screens/<screen-id>.html#<scene-id>) | [배치·장면](screen-layout.md#<screen-id>) |
| <다음/복귀 페이지> · 기본 | [<다음/복귀 화면>](details/screens/<other-screen-id>.html#<default-scene-id>) | [<다음/복귀 페이지> 배치](screen-layout.md#<other-screen-id>) |

````

## 이동이 없는 과업에 적용하기

같은 페이지에서 결과 안내만 바뀌면 과업 제목 아래의 짧은 흐름 설명에 이동이 없다는 사실과 동작·결과를 적고 가짜 다이어그램을 만들지 않는다. `화면 확인 링크` 표에는 현재 페이지의 기본 화면과 그 과업의 입력·결과 장면을 직접 여는 링크를 남긴다. 실제 적용 모습은 [작은 완성 예제](document-sample/navigation.md)의 해당 시나리오를 확인한다.

Navigation만 작성하며 HTML·Layout이 없는 경우의 표기와 UI 없는 시나리오의 처리는 [가이드의 예외 기준](../../../guides/navigation-diagram-guide.md#문서-구성과-화면-확인-링크)을 따른다. 실제 생성 문서에 이 저장소나 설치 사본의 샘플 경로를 화면 링크로 복사하지 않는다.
