# 퓨처릭스 일잘법 GIT 회고

퓨처릭스 ‘일하는 9가지 방법’을 **Good · Improvement · Try**로 함께 돌아보는 웹 회고 보드입니다.

**진행 순서:** 이름 입력 → 시작하기 → GIT와 일잘법 → 의견 쓰기 → 투표(그룹 묶기 · 좋아요 · 최종 확정) → 결과 복사

## 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 페이지 뼈대 |
| `styles.css` | 퓨처릭스 디자인 (다크 · 오렌지) |
| `app.js` | 화면과 동작 전체 |
| `firebase-config.js` | Firebase 연결 설정 (여기만 채우면 실시간 공유) |
| `firestore.rules` | Firestore 보안 규칙 |

## 저장 방식

- **`firebase-config.js`가 비어 있을 때:** 각자 브라우저에만 저장돼요. 오른쪽 위에 ‘이 기기에만 저장’이 표시됩니다.
- **Firebase를 연결했을 때:** 모든 참여자의 의견 · 좋아요 · 그룹 · 확정이 실시간으로 공유돼요. 오른쪽 위에 ‘실시간 공유 중’이 표시됩니다.

## Firebase 연결하기 (처음 한 번, 약 5분)

1. [Firebase 콘솔](https://console.firebase.google.com)에 구글 계정으로 들어가 **프로젝트 추가**를 누릅니다.
   - 프로젝트 이름: 예) `futurix-retro`
   - Google 애널리틱스는 **사용 안 함**으로 해도 됩니다.
2. 왼쪽 메뉴 **빌드 → Firestore Database → 데이터베이스 만들기**를 누릅니다.
   - 위치: `asia-northeast3 (서울)`
   - 모드: **프로덕션 모드**로 시작
3. Firestore 화면의 **규칙** 탭에서 기존 내용을 지우고, 이 폴더의 `firestore.rules` 내용을 붙여넣은 뒤 **게시**를 누릅니다.
4. 톱니바퀴 **프로젝트 설정 → 일반 → 내 앱**에서 웹 아이콘 **`</>`**을 눌러 앱을 등록합니다(호스팅 설정은 체크하지 않아도 됩니다).
5. 화면에 나오는 `firebaseConfig = { ... }` 안의 값을 복사해 `firebase-config.js`의 `window.FIREBASE_CONFIG = null;`을 아래처럼 바꿉니다.

   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "…",
     authDomain: "…",
     projectId: "…",
     storageBucket: "…",
     messagingSenderId: "…",
     appId: "…"
   };
   ```

6. 저장하고 GitHub에 올리면(아래 ‘수정 내용 반영하기’) 1~2분 뒤 사이트에 반영됩니다.

> Firebase 웹 설정값(apiKey 포함)은 원래 브라우저에 공개되는 값이라 GitHub에 올려도 괜찮습니다. 누가 무엇을 쓸 수 있는지는 `firestore.rules`가 막아줍니다.

## 회고방 나누기

주소 뒤에 `#방이름`을 붙이면 의견이 따로 모이는 회고방이 됩니다.

- `https://gainge2bu.github.io/futurix-git-retro/` → 기본 방
- `https://gainge2bu.github.io/futurix-git-retro/#홀서비스팀` → ‘홀서비스팀’ 방
- `https://gainge2bu.github.io/futurix-git-retro/#2026-10월` → ‘2026-10월’ 방

방 이름에는 한글 · 영문 · 숫자 · `-` · `_`를 쓸 수 있어요.

## 수정 내용 반영하기

```bash
git add .
git commit -m "설명"
git push
```

GitHub Pages가 1~2분 안에 사이트를 다시 배포합니다.

## 알아둘 점

- 로그인이 없어서 **주소를 아는 사람은 누구나 참여**할 수 있어요. 사내에서만 공유하세요.
- ‘나’는 브라우저 단위로 구분돼요. 같은 사람이 다른 기기로 들어오면 다른 사람으로 인식돼 좋아요를 한 번 더 누를 수 있습니다.
- 내 의견만 수정 · 삭제할 수 있고, 그룹 묶기와 최종 확정은 누구나 할 수 있어요.
