/**
 * 国の詳細画面（仮）
 *
 * 層：ui
 * 担当：フロント
 *
 * URL: #/country/{countryId}
 * 今は URL の params の受け取りと画面遷移の確認用に、名前と説明文を出すだけです。
 */
import { BaseScene } from "./BaseScene.js";
import { esc } from "../components/html.js";

export class CountryScene extends BaseScene {
  /**
   * 取得した国の詳細。load で入れて、render で使う
   * @type {import("../../domain/models.js").CountryDetail | null}
   */
  #country = null;

  async load() {
    // params は URL の () で囲んだ部分。#/country/uk なら ["uk"]
    const [countryId] = this.params;
    this.#country = await this.ctx.actions.catalog.getCountry(countryId);
  }

  render() {
    const c = this.#country;
    return `
      <a class="back-link" href="#/">← ホームに戻る</a>
      <div class="card">
        <h1 class="country-title">${esc(c.name)} <span class="country-title__en">${esc(c.nameEn)}</span></h1>
        <p class="country-extract">${esc(c.info.extract)}</p>
      </div>
    `;
  }
}
