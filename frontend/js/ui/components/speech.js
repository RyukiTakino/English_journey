/**
 * 英単語の読み上げ（ブラウザ標準の speechSynthesis を使う）
 *
 * 層：ui（単語帳・復習カードで使う小さな道具）
 * 担当：フロント
 *
 * speechSynthesis は、ブラウザが持っている「文字を声にする」機能です。通信は不要です。
 * ただし、端末やブラウザによっては使えないので、必ず speechSupported で確認してから呼びます。
 */

/** 読み上げが使えるか（window に speechSynthesis があるか）。使えなければ、読み上げボタンを出さない */
export const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

/**
 * 英語で読み上げる。いま読んでいる声があれば止めてから読む（連打しても重ならないように）。
 * @param {string} text 読み上げる英語
 */
export function speak(text) {
  if (!speechSupported || !text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text); // 読み上げ 1 回ぶんの指示書（C# の new と同じ）
  u.lang = "en-US";
  u.rate = 0.9; // 少しゆっくり
  synth.speak(u);
}

/** 読み上げを止める。画面を離れるときに呼ぶ */
export function cancelSpeech() {
  if (speechSupported) window.speechSynthesis.cancel();
}
