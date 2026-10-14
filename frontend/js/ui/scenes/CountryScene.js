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
      <a href="#/">← ホームに戻る</a>
      <h1>${esc(c.name)}（${esc(c.nameEn)}）</h1>
      <p>${esc(c.info.extract)}</p>
    `;
  }
}
