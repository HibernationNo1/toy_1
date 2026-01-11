# 로블록스 게임 개발 Start 가이드 



## WinDow



### cursor 설치

- 링크: https://cursor.com/download



### Node.js® 설치 및 프로젝트 구성

powershell 사용

- 링크: https://nodejs.org/ko/download

  ```powershell
  PS C: >  npm.cmd --version
  >>
  11.6.2
  ```

- `roblox-ts` 라이브러리를 실행하여 프로젝트 구성

  ```powershell
  PS C: > npm.cmd init roblox-ts
  ```

  - 예시)
    - 명령어 실행 위치: `C:\Users\taeuk\Desktop\code\roblox-ts`
    - 프로젝트 이름: `toy_1`



### Rojo 설치 및 실행 정리 

이 문서는 Rojo CLI를 Windows에서 수동 설치하고, Studio 플러그인 연결까지 진행하는 절차를 정리한 것이다.



#### 1. Rojo 설치

##### 1) Rojo CLI 다운로드

- 링크: https://github.com/rojo-rbx/rojo/releases
- 최신 릴리즈의 Assets에서 Windows용 바이너리 다운로드
- 예시 파일명: `rojo-<버전>-windows-x86_64`

##### 2) 압축 해제 및 위치 고정

- 압축을 풀어 `rojo.exe`를 확보한다.
- 예시 설치 경로: `C:\Tools\rojo\rojo.exe`

##### 3) PATH 추가 (사용자 변수 권장)

- 환경 변수 편집에서 사용자 변수 `Path`에 `C:\Tools\rojo`를 추가한다.
- 변경 후 새 PowerShell 창을 열어 적용한다.

##### 4) PowerShell에서 버전 확인

```powershell
PS C: > rojo --version
```

커서의 PowerShell은 커서 재시작 필요



#### 2. Rojo  서버 실행

##### 1) Rojo 플러그인 설치 (권장: CLI)

```powershell
rojo plugin install
```

- 설치 후 Roblox Studio를 재시작한다.

- 문제 발생

  1. 지정된 파일 못찾음

     ```
     [ERROR rojo] Couldn't find registry keys, Roblox might not be installed.
     
             Caused by:
                 지정된 파일을 찾을 수 없습니다. (os error 2)
     ```

     이런 경우 Roblox Studio를 종료한 상태에서 명령어 실행. 

     Studio 재시작 후 Plugins 탭에 Rojo가 뜨는지 확인



##### 2) rojo 실행

```powershell
PS C: > cd C:\Users\taeuk\Desktop\code\roblox-ts\toy_1
PS C: > rojo serve default.project.json
```

- 출력:

  ```
   rojo serve default.project.json
  Rojo server listening:
    Address: localhost
    Port:    34872
  
  Visit http://localhost:34872/ in your browser for more information.
  ```

  

##### 3) Roblox Studio 연결

- Plugins 탭에서 Rojo 패널 열기
- Connect → `localhost:34872`
- 연결되면 로컬 변경이 Studio에 동기화된다.



##### 4)  테스트

roblox-ts 의 최초 프로젝트 구성 시 out폴더에  컴파일 결과가 있음. 
로블록스 스튜디오에서 확인해보기

1. 실행

2. 창 -> 출력 에 아래와 같은 출력 확인

   ```
     16:10:59.937  Hello from main.server.ts!  -  서버 - main:4
     16:11:00.045  Hello from main.client.ts!  -  클라이언트 - main:4
   ```

   

### 작업 흐름



1. 자동 컴파일 실행

   ```powershell
   PS C: > npm.cmd run watch
   ```

2. 스튜디오 동기화 

   ```powershell
   PS C: >rojo serve default.project.json
   ```

3. 개발

4. 실시간 테스트





#### 기본 구조

로블록스 스튜디오 탐색기 기본 구조

```
DataModel                          // 게임 전체 최상위 컨테이너(모든 서비스가 속함)
├─ Workspace                        // 월드 공간(파트/캐릭터가 존재)
├─ Players                          // 접속 플레이어와 관련 객체 관리
├─ ReplicatedStorage                // 서버/클라 공용 저장소(모듈, 리모트 등)
├─ ReplicatedFirst                  // 클라에 가장 먼저 복제되는 공간(로딩/초기 UI)
├─ ServerScriptService              // 서버 전용 스크립트 실행 공간
├─ ServerStorage                    // 서버 전용 보관소(클라에 복제되지 않음)
├─ StarterGui                       // UI 템플릿(접속 시 PlayerGui로 복제)
├─ StarterPack                      // 도구 템플릿(접속 시 Backpack으로 복제)
├─ StarterPlayer                    // 플레이어 초기 설정 컨테이너
│  ├─ StarterPlayerScripts           // 클라 스크립트 템플릿(PlayerScripts로 복제)
│  └─ StarterCharacterScripts        // 캐릭터 스크립트 템플릿(캐릭터에 복제)
├─ Lighting                         // 조명/환경 설정
├─ SoundService                     // 사운드 전역 설정/재생
├─ TextChatService                  // 채팅 시스템 설정
├─ Teams                            // 팀 기반 게임 설정
└─ Chat                             // 레거시 채팅 시스템(경우에 따라 사용)

```

