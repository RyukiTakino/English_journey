/**
 * マイページ（#/me）：プロフィール・学習の記録・バッジ・行きたいリスト・設定
 *
 * 層：ui
 * 担当：フロント（マイページ）
 *
 * 画面の流れ
 *   load()  … 学習記録(me)・バッジ・国の一覧を actions 経由で読む
 *   render() … Store から読むだけで HTML を作る
 *   mount() … 外枠 1か所でクリック／送信を受け取る（イベント委譲）
 *
 * ■ 描き直しの方針
 *   プロフィール・行きたい・音のスイッチは、それぞれ「その部分だけ」描き直す関数（#paintXxx）を持つ。
 *   リセットのときだけ、画面全体を描き直す（#paintAll）。
 *   #app は他の画面と共有なので、イベントは自分の外枠（.me-scene）に付ける。
 *
 * TODO(Backend): 履歴は今 50 件までしか返らない。全件見せたいなら、ページ送りの API が要る。
 */
import { BaseScene } from "./BaseScene.js";
import { esc, formatDate } from "../components/html.js";
import { icon } from "../components/icons.js";
import { img, hydratePhotos } from "../assets.js";
import { badgeView } from "../components/BadgeView.js";
import { levelPicker } from "../components/LevelPicker.js";
import { settingsPanel } from "../components/SettingsPanel.js";
import { historyItems } from "../components/HistoryList.js";
import { emptyView } from "../components/states.js";
import { accuracy, stampsById, tourStops } from "../../domain/progress.js";

/** 履歴を最初に出す件数（「もっと見る」で全部出す） */
const HISTORY_FIRST = 8;
/** 表示名の最大文字数（LocalApi と合わせる） */
const NAME_MAX = 16;

export class MyPageScene extends BaseScene {
  /** @type {import("../../domain/models.js").Badge[]} */
  #badges = [];
  /** @type {HTMLElement|null} この画面の外枠 */
  #el = null;
  /** 表示名を編集中か */
  #editingName = false;
  /** 履歴を全部出すか */
  #historyAll = false;

  async load() {
    const { catalog, profile } = this.ctx.actions;
    // 3 つを同時に読む（Promise.all は C# の Task.WhenAll と同じ）
    const [, , badges] = await Promise.all([catalog.loadCountries(), profile.loadMe(), profile.loadBadges()]);
    this.#badges = badges;
  }

  render() {
    return `<div class="me-scene">${this.#bodyHtml()}</div>`;
  }

  mount(root) {
    this.#el = root.querySelector(".me-scene");
    if (!this.#el) return;
    hydratePhotos(this.#el, this.ctx);

    const onClick = (e) => this.#onClick(e);
    const onSubmit = (e) => this.#onSubmit(e);
    // ヘッダーの音ボタンが押されたら、こちらのスイッチも合わせる。
    // ヘッダー側の処理（#sound-toggles）が先に動き、そのあとイベントが document まで上ってくるので、変更後の値が読める
    const onDocClick = (e) => {
      if (e.target.closest?.("[data-sound]")) this.#paintSwitches();
    };
    this.#el.addEventListener("click", onClick);
    this.#el.addEventListener("submit", onSubmit);
    document.addEventListener("click", onDocClick);
    this.onCleanup(() => {
      this.#el?.removeEventListener("click", onClick);
      this.#el?.removeEventListener("submit", onSubmit);
      document.removeEventListener("click", onDocClick);
    });
  }

  // ---------- HTML（全体） ----------

  #bodyHtml() {
    const { sound } = this.ctx;
    return `
      <h1 class="me-title">マイページ</h1>
      <section class="card me-profile" data-me="profile" aria-label="プロフィール">${this.#profileHtml()}</section>
      <section class="me-stats" aria-label="学習のまとめ">${this.#statsHtml()}</section>

      <section class="me-section" aria-labelledby="me-h-badges">
        <h2 id="me-h-badges">バッジ</h2>
        <ul class="me-badges">${this.#badgesHtml()}</ul>
      </section>

      <section class="me-section" aria-labelledby="me-h-wants">
        <h2 id="me-h-wants">行きたいリスト</h2>
        <div data-me="wants">${this.#wantsHtml()}</div>
      </section>

      <section class="me-section" aria-labelledby="me-h-history">
        <h2 id="me-h-history">学習履歴</h2>
        <div data-me="history">${this.#historyHtml()}</div>
      </section>

      <section class="me-section" aria-labelledby="me-h-settings">
        <h2 id="me-h-settings">設定</h2>
        <div data-me="settings">${settingsPanel({ se: sound.seEnabled, bgm: sound.bgmEnabled })}</div>
      </section>`;
  }

  // ---------- HTML（部品ごと） ----------

  #profileHtml() {
    const user = this.ctx.store.me.user;
    const name = this.#editingName
      ? `<form class="me-name-form" data-form="name">
           <label class="sr-only" for="me-name-input">表示名</label>
           <input id="me-name-input" class="me-name-input" name="displayName" value="${esc(user.displayName)}" maxlength="${NAME_MAX}" autocomplete="off" required>
           <button type="submit" class="btn btn--sm">保存</button>
           <button type="button" class="btn btn--ghost btn--sm" data-action="name-cancel">やめる</button>
         </form>`
      : `<div class="me-name-row">
           <span class="me-name">${esc(user.displayName)}</span>
           <button type="button" class="btn btn--ghost btn--sm" data-action="name-edit" aria-label="表示名を変える">名前を変える</button>
         </div>`;
    return `
      ${img("mascot/bird-happy.png", { cls: "me-profile__bird", width: 96 })}
      <div class="me-profile__body">
        <p class="me-profile__kicker muted small">旅人</p>
        ${name}
        <p class="me-profile__label"><strong>英語のレベル</strong> <span class="muted small">記事の難しさに反映されます</span></p>
        ${levelPicker(user.level)}
      </div>`;
  }

  #statsHtml() {
    const { me, countries } = this.ctx.store;
    const total = tourStops(countries).length || countries.length;
    const got = Object.keys(stampsById(me)).length;
    const acc = accuracy(me);
    const tile = (ic, value, label) =>
      `<div class="me-stat"><span class="me-stat__icon" aria-hidden="true">${icon(ic, 20)}</span><strong class="me-stat__value">${value}</strong><span class="me-stat__label">${label}</span></div>`;
    return [
      tile("flame", `${esc(me.streak)}<small>日</small>`, "連続学習"),
      tile("check", acc == null ? "－" : `${acc}<small>%</small>`, "正答率"),
      tile("stamp", `${got}<small>/${total}</small>`, "スタンプ"),
      tile("star", `${esc(me.wordCount)}<small>語</small>`, "単語"),
      tile("medal", `${this.#badges.filter((b) => b.earnedAt).length}<small>/${this.#badges.length}</small>`, "バッジ")
    ].join("");
  }

  /** 取ったバッジを先に、まだのものを後ろに（元の順は保つ） */
  #badgesHtml() {
    const sorted = [...this.#badges].sort((a, b) => Number(Boolean(b.earnedAt)) - Number(Boolean(a.earnedAt)));
    return sorted
      .map(
        (b) => `
        <li>
          <button type="button" class="me-badge ${b.earnedAt ? "" : "is-locked"}" data-action="badge" data-id="${esc(b.id)}" aria-label="${esc(b.name)}（${b.earnedAt ? "獲得済み" : "未獲得"}）">
            ${badgeView(b, { size: "md", showText: false })}
            <span class="me-badge__name">${esc(b.name)}</span>
          </button>
        </li>`
      )
      .join("");
  }

  #wantsHtml() {
    const { me, countries } = this.ctx.store;
    const rows = me.wants
      .map((id) => this.ctx.store.findTrip(id))
      .filter(Boolean) // 記事が見つからないもの（データの食い違い）は飛ばす
      .map((trip) => {
        const country = this.ctx.store.findCountry(trip.countryId) ?? countries[0];
        return `
          <li class="me-want">
            <a class="me-want__link" href="#/read/${esc(trip.id)}">
              <span class="me-want__thumb" data-photo="${esc(trip.imageKey)}" style="--c:${esc(country?.color)}"></span>
              <span class="me-want__text">
                <strong>${esc(trip.name)}</strong>
                <span class="muted small">${esc(country?.name)} ・ ${esc(trip.city)}</span>
              </span>
            </a>
            <button type="button" class="word-icon-btn me-want__off" data-action="unwant" data-id="${esc(trip.id)}" aria-label="${esc(trip.name)} を行きたいリストから外す">${icon("heart", 20)}</button>
          </li>`;
      });
    if (!rows.length) {
      return emptyView({
        image: "mascot/bird-think.png",
        title: "行きたい場所はまだありません",
        text: "記事の「行きたい」を押すと、ここに集まります。",
        action: `<a class="btn btn--ghost" href="#/">記事をさがす</a>`
      });
    }
    return `<ul class="me-wants">${rows.join("")}</ul>`;
  }

  #historyHtml() {
    const { me } = this.ctx.store;
    const findCountry = (id) => this.ctx.store.findCountry(id); // アロー関数で包むのは、this（store の呼び出し元）を保つため
    if (!me.history.length) {
      return emptyView({
        image: "mascot/bird-read.png",
        title: "学習の記録はまだありません",
        text: "記事を読むかニュースを聴くと、ここに記録されます。",
        action: `<a class="btn" href="#/">学習をはじめる</a>`
      });
    }
    const shown = this.#historyAll ? me.history : me.history.slice(0, HISTORY_FIRST);
    const more = !this.#historyAll && me.history.length > HISTORY_FIRST;
    return `
      <ul class="card history-list">${historyItems(shown, findCountry)}</ul>
      ${more ? `<button type="button" class="btn btn--ghost me-more" data-action="history-more">残り ${me.history.length - HISTORY_FIRST} 件を見る</button>` : ""}`;
  }

  // ---------- 部分的な描き直し ----------

  #paint(key, html) {
    const target = this.#el?.querySelector(`[data-me="${key}"]`);
    if (target) target.innerHTML = html;
    return target;
  }

  #paintProfile() {
    this.#paint("profile", this.#profileHtml());
    this.#el.querySelector(".me-stats").innerHTML = this.#statsHtml();
  }

  #paintWants() {
    const el = this.#paint("wants", this.#wantsHtml());
    if (el) hydratePhotos(el, this.ctx);
  }

  #paintSwitches() {
    const { sound } = this.ctx;
    if (this.#el?.isConnected) this.#paint("settings", settingsPanel({ se: sound.seEnabled, bgm: sound.bgmEnabled }));
  }

  /** 画面全体（リセットのあと） */
  #paintAll() {
    this.#editingName = false;
    this.#historyAll = false;
    this.#el.innerHTML = this.#bodyHtml();
    hydratePhotos(this.#el, this.ctx);
  }

  // ---------- 操作 ----------

  #onClick(e) {
    const sw = e.target.closest("[data-switch]");
    if (sw) return this.#toggleSound(sw.dataset.switch);

    const lv = e.target.closest("[data-level]");
    if (lv) return this.#changeLevel(lv.dataset.level);

    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    switch (btn.dataset.action) {
      case "name-edit":
        this.#editingName = true;
        this.#paintProfile();
        this.#el.querySelector(".me-name-input")?.focus();
        break;
      case "name-cancel":
        this.#editingName = false;
        this.#paintProfile();
        this.#el.querySelector('[data-action="name-edit"]')?.focus();
        break;
      case "badge": return this.#openBadge(btn.dataset.id);
      case "unwant": return this.#unwant(btn.dataset.id);
      case "history-more":
        this.#historyAll = true;
        this.#paint("history", this.#historyHtml());
        break;
      case "reset": return this.#confirmReset();
    }
  }

  /** 表示名の保存（フォームの送信：Enter キーでも動く） */
  async #onSubmit(e) {
    if (!e.target.matches('[data-form="name"]')) return;
    e.preventDefault(); // ページ遷移（フォームの標準動作）を止める
    const name = new FormData(e.target).get("displayName").trim();
    if (!name) {
      this.ctx.toast.show("名前を入力してください");
      return;
    }
    try {
      await this.ctx.actions.profile.updateProfile({ displayName: name.slice(0, NAME_MAX) });
      this.#editingName = false;
      if (this.#el?.isConnected) this.#paintProfile();
      this.ctx.toast.show("名前を保存しました");
    } catch (err) {
      console.error(err);
      this.ctx.toast.show("保存できませんでした。もう一度お試しください");
    }
  }

  async #changeLevel(level) {
    if (level === this.ctx.store.me.user.level) return;
    try {
      await this.ctx.actions.profile.updateProfile({ level });
      if (this.#el?.isConnected) this.#paintProfile();
      this.ctx.toast.show(`英語のレベルを ${level} にしました`);
      this.#el?.querySelector(`[data-level="${level}"]`)?.focus();
    } catch (err) {
      console.error(err);
      this.ctx.toast.show("保存できませんでした。もう一度お試しください");
    }
  }

  #toggleSound(kind) {
    const { sound } = this.ctx;
    // ヘッダーの音ボタンは、自分が押されたときしか表示を更新しない。
    // そこで、ヘッダーのボタンを「プログラムから押す」ことで、切り替えと表示更新を同時に任せる。
    // （押すと onDocClick が動いて、こちらのスイッチも描き直される）
    const headerBtn = document.querySelector(`#sound-toggles [data-sound="${kind}"]`);
    if (headerBtn) headerBtn.click();
    else {
      // ヘッダーが無いとき用の予備
      if (kind === "se") sound.setSeEnabled(!sound.seEnabled);
      else sound.setBgmEnabled(!sound.bgmEnabled);
      this.#paintSwitches();
    }
    this.#el.querySelector(`[data-switch="${kind}"]`)?.focus(); // 描き直したのでフォーカスを戻す
    // TODO(フロント): AppShell が「音の設定が変わった」出来事（EVENTS）を送るようになれば、上の回りくどい処理は要らなくなる。
  }

  #openBadge(id) {
    const b = this.#badges.find((x) => x.id === id);
    if (!b) return;
    this.ctx.modal.open(
      `<div class="me-badge-modal">
        ${badgeView(b, { size: "lg", showText: false })}
        <h2>${esc(b.name)}</h2>
        <p>${esc(b.description)}</p>
        <p class="me-badge-modal__state ${b.earnedAt ? "is-got" : ""}">${b.earnedAt ? `${icon("check", 16)} ${esc(formatDate(b.earnedAt))} に獲得` : `${icon("lock", 16)} まだ獲得していません`}</p>
        <button type="button" class="btn btn--ghost" data-close>閉じる</button>
      </div>`,
      { onMount: (wrap) => wrap.querySelector("[data-close]")?.focus() }
    );
  }

  async #unwant(tripId) {
    try {
      await this.ctx.actions.profile.toggleWant(tripId);
      if (this.#el?.isConnected) this.#paintWants();
      this.ctx.toast.show("行きたいリストから外しました");
    } catch (err) {
      console.error(err);
      this.ctx.toast.show("外せませんでした。もう一度お試しください");
    }
  }

  /** 2 段階の確認 → リセット。1 つ目で「続ける」を押すと、2 つ目の最終確認が出る */
  #confirmReset() {
    const stepOne = () =>
      this.ctx.modal.open(
        `<div class="me-reset">
          <h2>学習記録をリセットしますか？</h2>
          <p>スタンプ・履歴・単語帳・行きたいリスト・バッジが、すべて消えます。</p>
          <div class="me-reset__actions">
            <button type="button" class="btn btn--ghost" data-close>やめる</button>
            <button type="button" class="btn btn--danger" data-next>続ける</button>
          </div>
        </div>`,
        {
          onMount: (wrap) => {
            wrap.querySelector("[data-close]")?.focus();
            wrap.querySelector("[data-next]").addEventListener("click", stepTwo);
          }
        }
      );

    const stepTwo = () =>
      this.ctx.modal.open(
        `<div class="me-reset">
          <h2>本当に消しますか？</h2>
          <p><strong>元には戻せません。</strong>最初から旅をやり直します。</p>
          <div class="me-reset__actions">
            <button type="button" class="btn btn--ghost" data-close>やめる</button>
            <button type="button" class="btn btn--danger" data-ok>${icon("trash", 16)} 消してやり直す</button>
          </div>
        </div>`,
        {
          onMount: (wrap) => {
            wrap.querySelector("[data-close]")?.focus();
            wrap.querySelector("[data-ok]").addEventListener("click", async (ev) => {
              ev.currentTarget.disabled = true;
              try {
                await this.ctx.actions.profile.resetProgress();
                this.ctx.toast.show("学習記録をリセットしました");
                this.#badges = await this.ctx.actions.profile.loadBadges();
                if (this.#el?.isConnected) this.#paintAll();
              } catch (err) {
                console.error(err);
                this.ctx.toast.show("リセットできませんでした");
              }
              this.ctx.modal.close();
            });
          }
        }
      );

    stepOne();
  }
}
