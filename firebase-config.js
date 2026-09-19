/* 順位表（Firestore）の接続先。

   ここに書く値は秘密鍵ではない。ブラウザに配られる以上、誰でも読める前提のもの。
   実際の保護は Firestore のセキュリティルール側でかけている（SPEC.md を参照）。

   プロジェクト: conductor-dojo（Spark＝無料プラン。上限で止まるだけで課金はされない）
   ロケーション: asia-northeast1（東京） */
window.KD_FIREBASE = {
  apiKey: "AIzaSyCKZNqq3u-QdaBaHoJ-ntfVbkRCIMqKxok",
  authDomain: "conductor-dojo.firebaseapp.com",
  projectId: "conductor-dojo",
  storageBucket: "conductor-dojo.firebasestorage.app",
  messagingSenderId: "1051886486656",
  appId: "1:1051886486656:web:2ea669eae597b5fc395265"
};
