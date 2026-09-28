/*
  Firebase 설정
  ------------------------------------------------------------
  여기에 Firebase 콘솔에서 복사한 firebaseConfig 값을 붙여넣으면
  모든 참여자의 의견·좋아요·그룹이 실시간으로 공유됩니다.
  (방법은 README.md의 "Firebase 연결하기"를 보세요.)

  비워두면(null) 각자 브라우저에만 저장되는 모드로 동작합니다.

  ※ Firebase 웹 설정값(apiKey 포함)은 원래 공개되는 값이라
    깃허브에 올려도 괜찮습니다. 접근 제한은 firestore.rules가 담당해요.
*/
window.FIREBASE_CONFIG = null;

/* 예시 — 아래처럼 바꿔 넣으세요
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "futurix-retro.firebaseapp.com",
  projectId: "futurix-retro",
  storageBucket: "futurix-retro.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
*/
