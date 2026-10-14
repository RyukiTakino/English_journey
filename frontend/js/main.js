/**
 * 起動・組み立て
 *
 * 層：（最外周。各層の部品を作ってつなぐ）
 * 担当：フロント
 */
import { EventBus, EVENTS } from "./application/events.js";

const events = new EventBus();

// 動作確認用：出来事を受け取って、通知して、画面に表示する
events.on(EVENTS.SESSION_CHANGED, () => {
  document.getElementById("app").textContent = "EventBus works!";
});
events.emit(EVENTS.SESSION_CHANGED);
