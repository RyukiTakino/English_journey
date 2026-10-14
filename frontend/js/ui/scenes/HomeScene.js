/**
 * ホーム画面（仮）
 *
 * 層：ui
 * 担当：フロント
 *
 * 今は Router と BaseScene の動作確認用に、国の名前を並べるだけです。
 * 本物のホーム画面を作るときに、中身を作り直します。
 */
import { BaseScene } from "./BaseScene.js";
import { esc } from "../components/html.js";

export class HomeScene extends BaseScene {
  /** 画面に必要なデータを取る。ここで投げた例外は Router がエラー表示にする */
  async load() {
    await this.ctx.actions.catalog.loadCountries();
  }

  /** load の後に呼ばれる。Store から読むだけにする */
  render() {
    const items = this.ctx.store.countries
      // サーバー由来の文字列は、必ず esc() を通して埋め込む
      // href="#/country/uk" のリンクを押すと URL が変わり、Router が国の詳細画面に切り替える
      .map((c) => `<li><a href="#/country/${esc(c.id)}">${esc(c.name)}（${esc(c.nameEn)}）</a></li>`)
      .join("");
    return `<h1>English journey</h1><ul>${items}</ul>`;
  }
}
