




## UI

### 버튼

- **Instance Name**

  pull_banana 

- **기준점**

  AnchorPoint: `Vector2.new(0, 1)`  왼쪽 하단

  ```
  # 예시
  (1, 0) = 우측 상단
  (0, 0) = 왼쪽 상단
  (0.5, 0.5) = 가운데
  (1, 1) = 오른쪽 하단
  ```

- **등장 시점**

  유저가 서버에 들어오자마자 등장

- **화면 비율 기준 위치**

  x=0.03 y=0.95

- **크기/비율**

  - UIAspectRatioConstraint 사용, 기준은 Width 
  - 크기: x=0.18, y= 비율에 맞게
  - 가로/세로 비율: 1.58:1 

- **외관**

  - 배경

    BackgroundColor3: `212, 80, 80`

  - 테두리

    - UIStroke 사용
    - 두께: 2px
    - 20% 투명
    - 외곽선 없음
    - 모서리 둥글게

    

  - 텍스트

    - Text = ""

    - 숨김 여부

      TextTransparency = 1  

  - 모서리

    둥글게, 높이의 0.1 비율

- **입력/상호작용**

  - 입력 상호작용: 있음. 클릭 시.

  - UI 위에 있는 동안 다른 UI 입력: 막음. 반드시 해당 버튼만 눌려야함

  - 출력할 로그 (print)

    ```
    "pull버튼 클릭"
    ```

  - 딸각 모션

    - Size -> 0.95배 축소 후 복귀
    -  `184, 53, 53` 색으로 플래시

    

### Panel

- **Instance Name**

  BananaSubmitPanel

- **기준점**

  AnchorPoint: `Vector2.new(1, 1)`

- **등장 시점**

  처음 서버가 시작될 때 

- **화면 비율 기준 위치**

  x=0.9 y=0.95

- **크기/비율**

  - UIAspectRatioConstraint 사용, 기준은 Width 
  - 크기: x=0.2, y= 비율에 맞게
  - 가로/세로 비율: 3:1 

- **외관**

  - 배경

    BackgroundColor3: `189, 189, 189`

  - 테두리

    - UIStroke 사용
    - 두께: 1px
    - 색: 66, 66, 66
    - 20% 투명
    - 외곽선 없음

  - 모서리

    직각

- **닫힘 방식**: 없음

- 내부 칸 규칙: 

- **표시 데이터 구조**

  - 이름

- **내부 UI규칙**

  - 정렬 규칙: 각 칸마다 C:\Users\taeuk\Desktop\code\roblox-ts\toy_1\src\shared\banana-table.ts 에 정의된 바나나중에 하나 랜덤하게 할당 (확률은 모든 바나나 동일)
  - 슬롯형 그리드 3개의 정사각형 칸이 가로로 3개 정렬
  - 스크롤 여부: X



## DATASTORE



#### user inventory

- datastore API 타입: DataStore

  ```
  # 예시임
  DataStore:  일반적인 키‑값 저장  (인벤토리, 설정, 스탯 등)
  OrderedDataStore: 랭킹/순위용 숫자 저장  (상위 N명 조회 가능)
  ```

- datastore 이름: PlayerInventoryV1

- 저장 형식: 맵형

  - 키: `UserId:bananas`

  - 데이터 filed

    ```
    {
      "schemaVersion": 1,
      "items": {
        "[itemId]": {
          "qty": 0,
          "firstAt": 0,
          "updatedAt": 0
        }
      },
      "createdAt": 0,
      "lastSavedAt": 0,
      "lastUpdatedBy": "pull"
    }
    ```

    

- 저장

  - PlayerRemoving 때 강제 저장
  - BindToClose 저장: 서버 종료 시 마지막 저장 호출
  - 저장 방식 API: UpdateAsync
  - GetRequestBudgetForRequestType로 호출 가능 여부 체크 API 사용
  - Load on join / Save on leave: 접속 시 GetAsync, 나갈 때 SetAsync
  - 저장 호출 방식
    - 기본 이벤트: 플래그 + 디바운스 + 주기 저장(30초)
    - 중요 이벤트: 즉시 저장
  - 저장 실패 재시도 정책
    - 횟수: 3회
    - 지연 시간: 3초 
    - 중요 이벤트 즉시, 나머지는 배치 저장이 일반적

- 로그/모니터링: 저장 실패 카운트, 마지막 성공 저장 시각 기록





#### user score

- datastore API 타입: OrderedDataStore

  ```
  # 예시임
  DataStore:  일반적인 키‑값 저장  (인벤토리, 설정, 스탯 등)
  OrderedDataStore: 랭킹/순위용 숫자 저장  (상위 N명 조회 가능)
  ```

- datastore 이름: PlayerBananaScoreV1

- 저장 형식: 키->숫자

  - 키: `UserId:bananasScore`
  - 데이터 : 정수형 (점수 넣을거임)

- 저장

  - PlayerRemoving 때 강제 저장
  - 점수 증가 시 메모리 업데이트
  - BindToClose 저장: 서버 종료 시 마지막 저장 호출
  - 저장 방식 API: UpdateAsync
  - GetRequestBudgetForRequestType로 호출 가능 여부 체크 API 사용
  - Load on join / Save on leave: 접속 시 GetAsync, 나갈 때 SetAsync
  - 저장 호출 방식: 주기 저장 (30초)
  - 저장 실패 재시도 정책
    - 횟수: 3회
    - 지연 시간: 3초 
    - 중요 이벤트 즉시, 나머지는 배치 저장이 일반적

- 로그/모니터링: 저장 실패 카운트, 마지막 성공 저장 시각 기록





