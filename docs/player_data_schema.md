# Player Data Schema (v1)

이 문서는 플레이어 데이터(DataStore)에 저장되는 스키마를 정의한다.
현재 스키마 버전은 `1`이며, 서버에서만 저장/복구된다.

## 저장 키
- 키: `UserId`를 문자열로 변환한 값
- DataStore 이름: `ServerConfig.DataStore.Name`

## 스키마 버전
- `version` 필드를 기준으로 마이그레이션을 수행한다.
- 최신 버전: `1`

## 필드 정의 (저장 형태)

| 필드 | 타입 | 기본값 | 제약/설명 |
|---|---|---|---|
| version | number | 1 | 스키마 버전. 마이그레이션 기준 |
| currency1 | number(정수) | 0 | 기본 재화. 저장 시 `floor` 처리, 0 미만은 0으로 보정 |
| updatedAt | number | 저장 시각 | `os.time()` 기준 저장 시각. 현재 로드에서는 사용하지 않음 |

## 마이그레이션 규칙
- v0 → v1
  - `currency1`이 없거나 숫자가 아니면 `0`으로 보정
  - `version`을 `1`로 설정
- 저장된 `version`이 현재보다 높으면 경고를 출력하고 마이그레이션을 건너뛴다.

## 확장 규칙 (필수)
1) 새 필드 추가 시 `defaultData`에 기본값을 추가한다.  
2) `SCHEMA_VERSION`을 증가시키고 `migrations`에 단계 함수를 추가한다.  
3) 로드/저장 로직에서 새 필드를 보정/저장하도록 반영한다.  

## 관련 파일
- `src/ServerScriptService/Services/PlayerDataService.lua`
- `src/ServerScriptService/Config/ServerConfig.lua`
