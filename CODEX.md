
# CODEX.md
## Cognitive Framework–Driven Coding Protocol

> 목적  
> 이 문서는 Codex(코딩 에이전트)를 “코드를 대신 치는 도구”가 아니라  
> “실패 확률이 낮은 실행 엔진”으로 사용하기 위한 사고·설계·검증 기준서이다.  
>  
> 모든 코딩 작업은 본 문서의 프레임워크를 따른다.

---

## 0. 기본 전제 (Non-Negotiable Rules)

- Codex는 설계 판단을 대신하지 않는다
- Codex는 명확히 쪼개진 작업을 가장 잘 수행한다
- 값(Value)은 임시여도 되지만, 구조(Structure)는 임시일 수 없다
- 모든 작업은 계획 → 실행 → 검증 루프를 반드시 거친다

---

## 1. Codex 사용의 기본 사고 구조

### 기본 루프 (강제)

Pyramid / MECE → OODA → Inversion / Red Team → AAR

- 이 루프를 생략한 코딩은 “작동해도 실패한 코드”로 간주한다

---

## 2. 프레임워크별 사용 목적과 적용 기준

### 2.1 Pyramid Principle + MECE  
(프롬프트를 ‘작업 명세’로 만들기)

**언제 쓰는가**
- 기능 추가
- 코드 작성 요청
- 작은 단위 리팩터

**Codex에 주기 전 반드시 정리할 것**
- 결론(Goal)
- 비목표(Non-goal)
- 제약(Constraints)
- 변경 범위(Scope)
- 검증 방법(Validation)

**프롬프트 골격**

Goal:
- 무엇을 만들거나 고칠 것인가

Non-goal:
- 절대 건드리지 말 것

Constraints:
- 성능 / 호환성 / 스타일 / 파일 범위

Tasks (MECE):
1.
2.
3.

Validation:
- 성공을 어떻게 확인하는가

---

### 2.2 First Principles + Logic Tree  
(큰 변경, 리팩터, 구조 설계)

**언제 쓰는가**
- 구조 변경
- 데이터 모델 변경
- 이벤트/상태 흐름 설계

**사고 순서**
1. 이 코드에서 절대 변하면 안 되는 것은 무엇인가
2. 현재 문제의 원인은 무엇인가 (Logic Tree로 분해)
3. 해결 경로는 몇 개인가
4. 가장 변경 비용이 낮은 경로는 무엇인가

---

### 2.3 OODA Loop  
(Codex 작업 안정성의 핵심 루프)

1. Observe
   - 현재 코드
   - 테스트 상태
   - 에러 / 로그

2. Orient
   - 레거시 제약
   - 성능 / 플랫폼 제약
   - 리스크 지점

3. Decide
   - 변경 최소 경로 선택
   - 이번 작업에서 하지 않을 것 명시

4. Act
   - 코드 변경
   - 테스트 실행
   - 결과 요약

---

### 2.4 Inversion Thinking + Red Team / Blue Team  
(버그·악용·회귀 방지)

- Inversion: 이 코드는 어떻게 망가질 수 있는가?
- Red Team: 유저/시스템이 악용하면?
- Blue Team: 이를 막거나 감지하려면?

---

### 2.5 AAR + Self-Regulated Learning (SRL)  
(Codex 품질을 누적시키는 장치)

- 의도했던 것
- 실제 결과
- 차이가 난 이유
- 다음 작업에서 추가할 규칙

---

## 3. Codex 작업 유형별 권장 프레임워크 조합

| 작업 유형 | 필수 프레임워크 |
|---------|----------------|
| 기능 추가 | Pyramid + MECE + OODA |
| 리팩터링 | First Principles + Logic Tree + OODA |
| 버그 수정 | Inversion + Red/Blue + OODA |
| 테스트 작성 | Inversion + MECE |
| 성능 개선 | First Principles + Second-Order Thinking |
| 시스템 설계 | First Principles + Systems Thinking |

---

## 4. 절대 금지 규칙

- 전체 코드베이스를 한 번에 수정 요청 금지
- 목표/비목표 없이 “고쳐줘” 요청 금지
- 테스트/검증 없는 코드 생성 금지
- 왜 바꾸는지 모르는 리팩터 금지

---

## 5. 최종 원칙

Codex는 코드를 쓰는 도구가 아니라  
사고를 강제하면 강해지는 실행 엔진이다.

---

END OF CODEX.md
