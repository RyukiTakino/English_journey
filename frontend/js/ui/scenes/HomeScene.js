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
import { APP_NAME } from "../../domain/constants.js";

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
      .map(
        (c) => `
          <li>
            <a class="card country-card" href="#/country/${esc(c.id)}">
              <div class="country-card__name">${esc(c.name)}</div>
              <div class="country-card__name-en">${esc(c.nameEn)}</div>
            </a>
          </li>`
      )
      .join("");
    return `
      <h1>${esc(APP_NAME)}</h1>
      <p class="home-lead">行きたい国を選んで、英語で旅しよう。</p>
      <ul class="grid">${items}</ul>`;
  }
}
