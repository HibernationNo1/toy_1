

아래 문장은 항상 codex에 요청시 첫 줄에 들어가야 함

```
너는 CODEX.md에 정의된 규칙을 반드시 따라야 한다.

이 문서는 다음을 규정한다:
- 작업 범위를 어떻게 설정하는지
- 변경을 어떤 절차로 계획하는지
- 결과를 어떤 기준으로 검증하는지

CODEX.md에서 요구하는 계획 단계를 완료하기 전까지
어떠한 코드도 작성하지 마라.
```

```
다음으로 뭘 하면 좋을까?
C:\Users\taeuk\Desktop\code\roblox-ts\toy_1\WORK_LOG.md
와 
C:\Users\taeuk\Desktop\code\roblox-ts\toy_1\게임_설명.md
를 읽고나서, 다음으로 하면 될 동작을 알려줘
```

```
C:\Users\taeuk\Desktop\code\roblox-ts\toy_1\게임_설명.md 를 읽고, 해당 프로젝트의 목적을 확인하고
C:\Users\taeuk\Desktop\code\roblox-ts\toy_1\CODEX.md 를 읽고 해당 프로젝트에서 너의 역할을 확인하고
C:\Users\taeuk\Desktop\code\roblox-ts\toy_1\WORK_LOG.md 를 읽고 해당 프로젝트가 어느 단계까지 수행했는지지 확인해
```

```
이 프로젝트 전체 구조와 주요 파일을 모두 인덱싱해서
이후 대화에서는 필요 시 참조만 하도록 해줘
```

```
유저 UI화면 좌측 하단에 가로:세로 비율이 1.58:1 이고, 모서리가둥근 네모의 버튼을 만들어줘

유저가 해당 버튼을 클릭하면
C:\Users\taeuk\Desktop\code\roblox-ts\toy_1\docs\banana_table.md
에 있는 표와 같은 바나나 1개가 표에 나와있는 확률로 뽑히고, 사용자의 인벤토리에 추가가 되도록 해줘
```

사용자 인벤토리를 정의해줘

유저 UI 우측 상단  가로:세로 비율이 1.58:1 이고, 모서리가둥근 네모의 버튼을 만들어줘

여기 프로젝트의 타입스립트를 전부 탐색해서 현재까지 개발된 내용을 정리해서 코드블록으로 출력해줘

TODO: 
1. 
InventoryButton 의 내부 세 개의 바나나슬롯 중
활성화 된 것들 중에서
유저가 클릭을 했을 때
유저의 playerInventories 에 있는 바나인 경우
playerInventories 에 대한 바나나의 수량 -1 , 이건 데이터스토어에도 적용되도록

2. 
InventoryButton 의 내부 트리거 슬롯이 클래식 바나나를 1개 소모하도록 

3. 본인 점수를 UI에서 확인할 수 있도록

4.  한쪽에는 서버 전체의 랭킹을 확인할 수 있도록

5. 바나나 거래 마켓

