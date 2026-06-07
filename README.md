# STREAM MATCH — 인터넷방송 성향 테스트

치지직/인터넷방송 시청 취향을 10개 문항으로 분석해 `data/streamers.json`에서 가장 잘 맞는 스트리머를 추천하는 정적 웹앱입니다. 외부 서버나 프레임워크 없이 HTML, CSS, JavaScript만 사용하며 GitHub Pages에서 바로 동작합니다.

## 주요 기능

- 버튜버 포함/제외 필터 및 쉽게 변경 가능한 듀라한 포함 옵션
- 598명 데이터 기반 검색형 최애 스트리머 선택
- 9개 취향 축을 이용한 10문항 성향 테스트
- 테스트 응답과 최애 유사도를 조합한 추천 결과 5명
- SVG 레이더 차트, 라이브 방송 화면, 가상 채팅 UI
- 모바일 360px부터 데스크톱 16:9까지 대응하는 반응형 디자인
- 세션 상태 저장, 중복 클릭 잠금, 데이터 누락 및 후보 부족 fallback 처리

## 로컬 실행

보안 정책상 브라우저에서 `index.html`을 파일로 직접 열면 JSON `fetch`가 차단될 수 있습니다. 저장소 루트에서 간단한 정적 서버를 실행하세요.

```bash
python3 -m http.server 8000
```

브라우저에서 <http://localhost:8000>을 엽니다.

## GitHub Pages 배포

1. 저장소를 GitHub에 push합니다.
2. 저장소의 **Settings → Pages**로 이동합니다.
3. **Build and deployment**의 Source를 **Deploy from a branch**로 선택합니다.
4. 배포할 브랜치와 `/ (root)` 폴더를 선택하고 저장합니다.
5. 잠시 후 표시되는 GitHub Pages URL로 접속합니다.

모든 경로가 상대 경로이므로 프로젝트 Pages와 사용자 Pages 모두에서 동작합니다.

## 스트리머 JSON 교체

`data/streamers.json`을 같은 이름의 JSON 배열 파일로 교체합니다. 앱은 다음 필드를 사용합니다.

- `정제된이름`
- `버튜버여부`: `캠방`, `듀라한`, `버튜버`
- `주력/종합게임`, `특징`
- `매운맛`, `텐션`, `채팅속도`, `낮비중`, `저녁비중`, `새벽비중`, `덕후지수`, `합방비중`, `실력지수`

일반 지표는 `0~5`, 시간대 비중은 `0~1` 또는 `0~5`를 권장합니다. 숫자 문자열과 누락 필드도 안전하게 처리합니다. 공식 채널로 보이는 이름은 기본 추천에서 제외합니다.

## 커스터마이징

- 문항/선택지/축 점수: `src/main.js`의 `QUESTIONS` 상단 TODO
- 버튜버 제외 시 듀라한 포함 여부: `INCLUDE_DULLAHAN_WHEN_EXCLUDING_VTUBERS`
- 공식 채널 제외 단어: `OFFICIAL_WORDS`
- 추천 가중치: 마지막 질문의 `favoriteWeight` 및 `similarity()`
- 색상/레이아웃: `src/style.css`의 `:root` 변수와 미디어 쿼리

## 파일 구조

```text
.
├── index.html
├── src/
│   ├── main.js
│   └── style.css
├── data/
│   └── streamers.json
└── README.md
```
