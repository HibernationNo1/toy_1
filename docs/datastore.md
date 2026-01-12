[DataStoreService 구현 정리 — 6개 Store별 “코드 구현 방식” 가이드]
- 목표: "각 Store 책임 1개" + "저장 규칙/실패 대응/관측(로그)"까지 포함한 구현 설계
- 절대원칙:
  1) DataStoreService API(GetDataStore/SetAsync/UpdateAsync 등)는 DataService(서버)에서만 호출
  2) 다른 서비스는 DataService의 “행동 이름 Mutator”만 호출 (AddMoney, AddBanana, CreateListing...)
  3) 저장은 “DB”가 아니라 “유저가 했다고 느낀 행동”을 보존하는 신뢰 시스템

================================================================================
0) 공통 코드 구조(먼저 고정) — DataService.server.lua
================================================================================
[파일/모듈]
- ServerScriptService/Services/DataService.server.lua
- Shared/Constants.lua (bananaId 목록, 확률표 등)
- Shared/Util/Timer.lua (디바운스/주기 Flush)
- Server/Config/ServerConfig.lua (저장 주기, 재시도 횟수, 상한선)

[공통 네이밍/키]
- StoreName: "BananaGame:<Domain>:v1"
- Key:
  - Player:        "u_<UserId>"
  - Listing:       "l_<ListingId>"
  - GlobalConfig:  "g_config"
  - Snapshot:      "g_snapshot"
  - Audit(선택):   "a_<yyyymmdd>" or "a_<serverJobId>" (로그 버킷)

[공통 스키마]
- 모든 저장 데이터에 meta.schemaVersion 필수
- Load 시 migrate(schemaVersion) 통과 -> 최신 스키마만 캐시에 유지/저장

[공통 저장 전략]
- PlayerStore: 캐시 + 지연 저장(10~30초) + 중요 이벤트 Flush 후보
- MarketListingStore: UpdateAsync 중심(경합) + 상태 전이 원자성 보장
- Leaderboard: OrderedDataStore 별도 갱신(30~60초 또는 이벤트 기반)
- GlobalConfig: 읽기 캐시 + 관리자/운영툴이 쓸 때만 UpdateAsync
- Audit: “다 저장”이 아니라 “운영에 필요한 것만” + 버킷 방식
- Snapshot: 주기 저장(예: 60~180초), 실패해도 게임 로직엔 영향 최소

[공통 실패/재시도]
- 모든 DataStore 호출 pcall
- 재시도 3회(0.5s, 1s, 2s 백오프)
- 최종 실패 시:
  - Player 캐시는 유지(세션 내 체감 보존)
  - “dirty/pending” 플래그 유지 -> 다음 Flush 때 재시도
  - 유저에게 “저장 실패” 문장 UI 금지(불안 유발) / 대신 즉시 행동 가능 유지

[공통 관측(로그)]
- 표준 필드:
  userId, storeName, key, op(Load/Save/Update), reason, attempt, durationMs, success, error
- 경제 이벤트 reason 필수:
  "GACHA", "NPC_SELL", "LIST_CREATE", "LIST_CANCEL", "MARKET_BUY", "SLOT_UPGRADE" 등

================================================================================
1) BananaGame:Player:v1  (타입: DataStore)
================================================================================
[책임]
- “유저 개인 상태의 단일 진실” (돈/인벤/가챠쿨타임/NPC슬롯수)

[Key]
- key = "u_<UserId>"

[Schema(예시)]
- {
    bananaMoney: number,
    inventory: { [bananaId]: number },
    gacha: { nextAt: number },
    npc: { slotCount: number },
    meta: { schemaVersion: 1, createdAt: number, updatedAt: number }
  }

[구현 방식]
- 접속(PlayerAdded): Load(user) 1회 -> 캐시(playerUserId -> data)
- 읽기(Get): 캐시만 반환(절대 DataStore GetAsync를 매번 하지 않음)
- 변경(Mutator):
  - AddMoney(user, amount, reason)
  - SpendMoney(user, amount, reason)  // 음수 금지, 부족하면 실패 반환
  - AddBanana(user, bananaId, count, reason)
  - RemoveBanana(user, bananaId, count, reason)
  - SetNextGachaAt(user, timestamp, reason)
  - UpgradeNpcSlots(user, newSlotCount, cost, reason)
  -> 모든 Mutator는:
     (1) 검증(범위/상한/존재) -> (2) 캐시 반영 -> (3) Commit(user, reason)

[저장(Write Strategy)]
- Commit은 “저장 요청 큐 등록”만(즉시 저장 아님)
- 저장 루프(예: 15초마다):
  - dirty인 유저만 SetAsync(혹은 UpdateAsync도 가능하지만 Player는 세션 소유가 명확하므로 SetAsync 허용)
- 중요 이벤트(즉시 Flush 후보):
  - MARKET_BUY(구매 후 돈/인벤 변동)
  - SLOT_UPGRADE(큰 비용)
  - (선택) GACHA 결과 반영 직후
- PlayerRemoving: Flush(user) 최우선(재시도 포함)

[Validation/정규화]
- bananaMoney < 0 금지
- inventory count < 0 금지
- 0개 아이템은 inventory에서 키 제거(저장 크기/성능)
- bananaId는 Constants에 정의된 것만 허용
- slotCount는 1~3 고정

[실패 처리]
- Load 실패: 기본값 생성 + “미저장” 플래그 -> 다음 저장 때 정상화
- Save 실패: 캐시는 유지, dirty 유지, 다음 주기에 재시도(유저 체감 보존)

================================================================================
2) BananaGame:Market:Listings:v1  (타입: DataStore)
================================================================================
[책임]
- “마켓 리스팅 상태의 원자적 전이” (OPEN->SOLD/CANCELLED)

[Key]
- listingKey = "l_<ListingId>"
- ListingId는 서버 생성(UUID/난수) + 충돌 방지(길이/문자 제한)

[Schema(예시)]
- {
    listingId: string,
    sellerUserId: number,
    bananaId: string,
    quantity: number,
    price: number,
    status: "OPEN"|"SOLD"|"CANCELLED",
    createdAt: number,
    updatedAt: number,
    meta: { schemaVersion: 1 }
  }

[구현 방식(핵심: UpdateAsync)]
- CreateListing(player, bananaId, qty, price):
  1) PlayerStore에서 보유 확인/차감(“잠금/예약” 전략 중 택1)
  2) listingKey 생성
  3) SetAsync(listingKey, listingData) 또는 UpdateAsync로 “존재하면 실패” 처리
  4) Commit/Flush는 PlayerStore 쪽도 같이 고려(경제 신뢰)

- CancelListing(player, listingId):
  1) UpdateAsync(listingKey, function(old)
       - old.status가 OPEN이고 old.sellerUserId가 요청자면 CANCELLED로 변경
       - 아니면 no-op/실패 반환
     end)
  2) 취소 성공 시: PlayerStore에 아이템 반환(서버 권한) + Commit

- BuyListing(buyer, listingId):
  1) UpdateAsync(listingKey, function(old)
       - old.status == OPEN인지 확인
       - 구매자 돈 충분한지는 "외부에서" 먼저 확인 가능하지만, 최종은 서버 로직에서 재검증 필요
       - status를 SOLD로 바꾸고 buyerUserId, soldAt 같은 필드 추가(선택)
     end)
  2) UpdateAsync가 SOLD 확정되면:
     - buyer: 돈 차감 + 아이템 지급
     - seller: 돈 지급(세금 있으면 반영)
     - 양쪽 PlayerStore Commit/필요시 Flush

[주의(동시성/정합성)]
- MarketListingStore는 “경합 가능”이므로 UpdateAsync 기본
- 돈/인벤 이동은 PlayerStore에 있지만, “체결 확정”은 listing status에서 결정
- 순서:
  - (A) listing SOLD 확정 -> (B) 돈/아이템 이동
  - (B)에서 저장 실패가 나도 “SOLD 상태는 유지”되고, 다음 재시도로 정산 가능하도록 보정 로그 남김

[가격/수량 검증]
- price 최소/최대 상한(테러 방지)
- qty는 1 이상, 보유량 이하
- bananaId 검증

================================================================================
3) BananaGame:Leaderboard:Money:v1  (타입: OrderedDataStore)
================================================================================
[책임]
- “표시용 랭킹” (게임 로직 판단 금지)

[Key/Value]
- key = tostring(userId) (OrderedDataStore는 string key 권장)
- value = bananaMoney (number)

[구현 방식]
- PlayerStore bananaMoney 변경 시:
  - 즉시 반영하지 않고 “LeaderboardUpdateQueue”에 등록
- 주기(예: 30~60초)로 큐 플러시:
  - SetAsync(userIdStr, bananaMoney) pcall
- 표시(게시판):
  - GetSortedAsync(false, topN)로 상위 N 읽기
  - 닉네임은 별도 캐시(Players:GetNameFromUserIdAsync는 호출 비용 있으니 캐시/백오프)

[실패 처리]
- 리더보드 업데이트 실패는 게임 진행에 영향 X
- 다만 운영 관측(로그)에는 남김

================================================================================
4) BananaGame:GlobalConfig:v1  (타입: DataStore)
================================================================================
[책임]
- “라이브 운영 조정값” (세율, 가격 배수, 기능 토글 등)

[Key]
- "g_config"

[구현 방식]
- 서버 시작 시 1회 LoadConfig()
  - 없으면 기본값으로 생성(SetAsync)
- 메모리 캐시 유지(읽기 잦음)
- 운영툴/관리자 커맨드가 있을 때만 UpdateAsync로 수정
  - UpdateAsync에서 schemaVersion 유지 + validation 수행
- 변경 시:
  - 서버 메모리 캐시 갱신
  - 관련 서비스(EconomyService 등)에 Signal로 통지(선택)

[주의]
- GlobalConfig를 PlayerStore와 섞지 말 것
- “모든 서버가 동일 설정”이 필요하면 MessagingService/MemoryStore(추후) 고려 가능하지만,
  지금 단계에서는 단순 DataStore + 서버 재시작 반영으로도 충분

================================================================================
5) BananaGame:Audit:v1  (타입: DataStore)
================================================================================
[책임]
- “운영/분쟁/악용 분석을 위한 감사 로그”
- 목적은 ‘모든 이벤트 저장’이 아니라 ‘꼬였을 때 복구 가능한 증거’ 확보

[Key 전략(버킷)]
- "a_<yyyymmdd>" (하루 버킷) 또는 "a_<serverJobId>" (서버 단위)
- 값은 배열 누적 형태로 가면 크기 제한에 걸리기 쉬움 -> 권장 방식:
  - “샘플링/중요 이벤트만”
  - 또는 “이상 징후만”
  - 또는 “최근 N개만 링버퍼” 구조(UpdateAsync로 push/pop)

[구현 방식(추천)]
- AuditService(또는 DataService 내부 함수)로 통일:
  - LogEconomyEvent(userId, type, payload, reason)
- 저장은 주기 플러시(예: 10~30초) + 치명 이벤트 즉시 1회
- UpdateAsync(bucketKey, function(old)
    old = old or { schemaVersion=1, events={} }
    table.insert(old.events, newEvent)
    if #old.events > MAX then table.remove(old.events, 1) end
    return old
  end)

[주의]
- Audit는 “게임 신뢰”를 직접 보장하진 않지만,
  문제 발생 시 ‘왜’가 사라지면 운영 불가 -> 최소한은 꼭 남겨라

================================================================================
6) BananaGame:ServerSnapshot:v1  (타입: DataStore)
================================================================================
[책임]
- “서버 상태 스냅샷” (운영 모니터링/디버깅 보조)
- 게임 로직과 분리(실패해도 플레이 영향 최소)

[Key]
- "g_snapshot" 또는 "g_snapshot_<region>" 등

[저장 대상(예시)]
- {
    schemaVersion: 1,
    updatedAt: now,
    activePlayers: number,
    openListings: number,
    saveFailuresLast5m: number,
    avgSaveDurationMs: number
  }

[구현 방식]
- 주기 저장(예: 60~180초)
- SetAsync로 덮어쓰기(히스토리 필요 없으면)
- 실패 시: 로그만 남기고 무시

================================================================================
[각 Store 구현 시 “이 게임에 맞춘 핵심 포인트”]
================================================================================
1) “15분 가챠”는 PlayerStore.gacha.nextAt가 단일 진실
   - 클라 타이머는 연출용
   - 서버가 nextAt 검증 -> 뽑기 결과 반영 -> Commit

2) “NPC 판매”는 PlayerStore 인벤/돈 트랜잭션
   - NPC가 제시하는 바나나(요구품목)는 서버가 결정하고 PlayerStore에 저장하거나,
     (가벼운 방식) 세션 메모리로 들고 가되 서버 재시작/이동 시 일관성 필요하면 PlayerStore에 포함

3) “마켓 체결”은 ListingStore에서 SOLD 확정이 1차,
   돈/아이템 이동은 2차(저장 실패 대비 보정 로그/Audit 필수)

4) “랭킹 게시판”은 OrderedDataStore 분리
   - 표시용이므로 실패해도 UX를 깨지 말고 마지막 성공값을 보여주는 캐시 허용

================================================================================
[최종 구현 체크리스트(코드로 옮길 때 빠지면 망가지는 것)]
================================================================================
- (필수) DataService만 DataStoreService를 호출하는가?
- (필수) PlayerStore는 캐시 + 디바운스 저장 + PlayerRemoving Flush 인가?
- (필수) MarketListingStore는 UpdateAsync로 상태 전이를 원자화했는가?
- (필수) schemaVersion + migrate가 Load 경로에 존재하는가?
- (필수) 음수 돈/음수 수량/슬롯 범위 검증이 Mutator에 있는가?
- (필수) 저장 실패 시 “유저 체감 보존”을 깨는 UI/정지 흐름이 없는가?
- (권장) 경제 이벤트에 reason이 항상 붙는가(Audit/로그)?
- (권장) 리더보드 갱신이 PlayerStore 저장과 결합되어 있지 않은가?

================================================================================
[너가 지금 바로 코드로 옮길 때의 우선순위(실행 순서)]
================================================================================
1) PlayerStore(Load/Cache/Commit/Flush/Mutator 최소셋) 먼저 완성
2) LeaderboardStore는 PlayerStore money 변경 훅으로 “주기 갱신”만
3) MarketListingStore는 Create/Cancel/Buy를 UpdateAsync로 원자화
4) Audit는 “MARKET_BUY, LIST_CREATE, GACHA” 3개 이벤트만 우선 기록
5) GlobalConfig/Snapshot은 마지막(운영 편의)

(이 순서를 따르면 Week1~Week3 목표(신뢰/루프/경제)를 기술적으로 뒷받침하면서 확장 가능)