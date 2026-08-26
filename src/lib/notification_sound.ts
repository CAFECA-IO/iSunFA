/**
 * Info: (20260825 - Julian) 小鈴鐺提示音的決策與播放（計畫書 D7 / D8）。
 *
 * 這支檔案存在的理由是**可測**：原本這些判斷寫在 288 行的元件裡，
 * 而 `jest.config.mjs` 的 `testEnvironment` 是 `node`、repo 也沒有裝
 * jsdom 或 testing-library —— 元件的行為一行都測不到。
 * 唯一的測試是對元件原始碼做 `toMatch(/total > last/)`，
 * 而那擋不住「把 `playChime()` 搬出 if」這種變異（檢查清單 §一.7）。
 *
 * 因此三個判斷（要不要響、節流、跨分頁誰響）做成不依賴瀏覽器的純邏輯，
 * 只有真正碰 WebAudio 與 BroadcastChannel 的那兩層留在元件端。
 */

// Info: (20260825 - Julian) 批次抵達只響一次的窗口
export const CHIME_THROTTLE_MS = 3_000;

// Info: (20260825 - Julian) 記住多少個「別人已經響過」的鍵（避免無上限成長）
const SEEN_KEY_LIMIT = 32;

/**
 * Info: (20260826 - Julian) 「未讀總數」——`hasNewArrival` 的輸入（review T7）。
 *
 * 抽成函式的理由與 `hasNewArrival`、`arrivalKeyOf` 同一條：它原本是 hook 裡的
 * 一行 `next.todoCount + next.completedCount`，而那支 hook **零測試**
 *（repo 沒有 jsdom，`testEnvironment` 是 node）。也就是說把它改成
 * `next.completedCount` 不會讓任何測試變紅 —— 而後果是待辦型的抵達
 *（團隊邀請、錢包升級）從此不搖也不響。
 *
 * 那個缺陷的形狀是**塌陷值**：兩個數字加起來變成一個，而其中一個消失時
 * 剩下的那個看起來完全正常。
 */
export function unreadTotalOf(summary: {
  todoCount: number;
  completedCount: number;
}): number {
  return summary.todoCount + summary.completedCount;
}

/**
 * Info: (20260825 - Julian) 有沒有「新的」通知抵達。
 *
 * 比較的是**總數上升**，不是「有沒有未讀」—— 後者會讓使用者沒收掉的
 * 舊通知每一輪輪詢都搖一次鈴。
 *
 * `prev === null` 是「還沒有基準」（首抓），不是「之前是 0」：
 * 剛打開頁面就被三聲鈴鐺打招呼是缺陷，不是功能。
 */
export function hasNewArrival(prev: number | null, next: number): boolean {
  if (prev === null) return false;
  return next > prev;
}

/**
 * Info: (20260825 - Julian) 這一次抵達的識別字串，給跨分頁搶佔用。
 *
 * 要同時滿足兩件事，少一件這個機制就壞掉：
 *
 * 1. **每個分頁算出來要一樣** —— 否則三個分頁各認為自己是第一個，各響一聲。
 *    所以不能用前端的 `Date.now()`：分頁的輪詢 tick 不同步，值必然不同
 *    （與 `dedupeKey` 拒絕 timestamp 同一條理由，ADR 010 §1）。
 * 2. **不同的抵達要不一樣** —— 否則識別值被 `seenKeys` 記住之後就再也不響。
 *
 * Info: (20260825 - Julian) 原本只用 `todoCount:completedCount`，
 * 滿足第 1 點但**不滿足第 2 點**（計畫書 D17）。數量組合會重複：
 * 「讀完 → 來一則（`0:1`）→ 響 → 讀完 → 再來一則（又是 `0:1`）→ 不響」。
 * 那是最常見的使用節奏，不是邊角情況；而且畫面照樣搖，
 * 沒有任何地方顯示提示音已經失效。
 *
 * 修法是把**伺服器端**最新未讀的 createdAt 一起編進去：它由來源決定，
 * 所有分頁看到的是同一個值（滿足 1），而新的通知必然有更晚的時間（滿足 2）。
 * 三個值一起組是為了涵蓋活算的待辦 —— 團隊邀請沒有通知列、沒有 createdAt，
 * 但它一定讓 `todoCount` 變動。
 */
export function arrivalKeyOf(
  latestUnreadAt: number | null,
  todoCount: number,
  completedCount: number,
): string {
  return `${latestUnreadAt ?? 0}:${todoCount}:${completedCount}`;
}

/**
 * Info: (20260825 - Julian) 「這個分頁該不該出聲」的閘。
 *
 * 兩道獨立的守門：
 *
 * 1. **節流**：3 秒內只響一次。分頁在背景時停輪詢（見 `use_notification_summary`），
 *    切回前景補拉可能一次多 5 則 —— 那是一次抵達，不是五次。
 * 2. **跨分頁**：同一個 arrivalKey 只有一個分頁出聲。三個分頁各響一次
 *    聽起來像故障。
 *
 * ## 已知的殘留競態，以及為什麼不修
 *
 * 兩個分頁在同一個 tick 內同時 `claim()`（彼此的廣播都還沒送達）時，
 * 兩個都會出聲。要完全消除需要「宣告 → 等一個窗口 → 比 tabId 決勝」，
 * 而那讓每一次出聲都延遲 150ms、且多一層需要測的時序。
 *
 * 代價不對等：競態的後果是**偶爾多響一聲**，而修它的後果是
 * 每一聲都變慢、程式碼變難懂。分頁的輪詢起點取決於各自的開啟時間，
 * 同 tick 相撞本來就少見。這裡選擇留著它並寫下來。
 */
export class ChimeGate {
  private readonly throttleMs: number;

  private readonly now: () => number;

  private lastPlayedAt: number | null = null;

  private readonly seenKeys: string[] = [];

  constructor(options?: { throttleMs?: number; now?: () => number }) {
    this.throttleMs = options?.throttleMs ?? CHIME_THROTTLE_MS;
    // Info: (20260825 - Julian) 時鐘可注入，否則節流這件事在測試裡只能靠真的等
    this.now = options?.now ?? (() => Date.now());
  }

  /**
   * Info: (20260825 - Julian) 別的分頁宣告它要響這個 key 了。
   * 記下來，這個分頁就不會重複。
   */
  observePeer(arrivalKey: string): void {
    if (this.seenKeys.includes(arrivalKey)) return;
    this.seenKeys.push(arrivalKey);
    if (this.seenKeys.length > SEEN_KEY_LIMIT) this.seenKeys.shift();
  }

  /**
   * Info: (20260825 - Julian) 這個分頁要不要出聲。
   *
   * 回 true 時已經把 key 記進 seenKeys 並更新節流時間 —— 呼叫端
   * 拿到 true 就該廣播並播放，不需要再回報結果。
   */
  claim(arrivalKey: string): boolean {
    if (this.seenKeys.includes(arrivalKey)) return false;

    const nowMs = this.now();
    if (
      this.lastPlayedAt !== null &&
      nowMs - this.lastPlayedAt < this.throttleMs
    ) {
      /**
       * Info: (20260825 - Julian) 被節流擋下時**仍然記下這個 key**。
       * 不記的話，3 秒後同一次抵達會補響一聲 —— 而使用者早就看到了。
       */
      this.observePeer(arrivalKey);
      return false;
    }

    this.observePeer(arrivalKey);
    this.lastPlayedAt = nowMs;
    return true;
  }
}

/**
 * Info: (20260825 - Julian) AudioContext 的**單例**（原本每次播放都 new 一個）。
 *
 * Chrome 對同時存在的 AudioContext 有上限（約 6 個），超過就靜默失敗 ——
 * 「靜默」是關鍵：沒有錯誤、沒有 log，只是不再出聲。
 *
 * 這一層只在瀏覽器裡有意義，因此每一支都對 `window` 做防禦：
 * 這個模組會被 `testEnvironment: "node"` 的測試 import（為了測上面的純邏輯）。
 */
let audioContext: AudioContext | null = null;

function resolveAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (audioContext === null) audioContext = new AudioCtx();
  return audioContext;
}

/**
 * Info: (20260825 - Julian) 首次使用者手勢時解鎖，而不是等到有通知才 resume。
 *
 * iOS Safari 要求 `resume()` 發生在手勢的**同一個 event tick 內** ——
 * `await` 之後再 resume 會失敗。所以這裡不 await，直接呼叫。
 *
 * 解鎖前發現的新通知只搖不響，而且**不試著播、不 catch、不提示**：
 * 反面做法是「嘗試播放、失敗後提示使用者開啟音效」，那會在每個新開的
 * 分頁上跳一次提示，而使用者什麼都沒做錯。
 */
export function registerAudioUnlock(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const unlock = () => {
    const ctx = resolveAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => undefined);
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };

  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });

  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}

/**
 * Info: (20260825 - Julian) 分頁回到前景時把 context 叫醒。
 * 進背景後瀏覽器會 suspend 它，不 resume 的話回來就再也不出聲。
 */
export function resumeAudio(): void {
  const ctx = resolveAudioContext();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => undefined);
}

/**
 * Info: (20260821 - Luphia) 通知音：WebAudio 兩聲短音。
 * 用 oscillator 而不是音檔——不新增 binary 資產，也不會有載入失敗的路徑。
 *
 * Info: (20260825 - Julian) 改用單例 context，且**不再每次 close()**。
 * 音量乘 0.5：鈴鐺音效比任何 UI 元素都容易變成噪音，而使用者對
 * 「太大聲」的反應是把整個功能關掉。
 */
export function playChime(): void {
  const ctx = resolveAudioContext();
  // Info: (20260825 - Julian) 還沒解鎖就安靜放棄（見 registerAudioUnlock）
  if (!ctx || ctx.state !== "running") return;

  const play = (frequency: number, startAt: number) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.06, ctx.currentTime + startAt);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + startAt + 0.25,
    );
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(ctx.currentTime + startAt);
    oscillator.stop(ctx.currentTime + startAt + 0.3);
  };

  try {
    play(880, 0);
    play(1174.66, 0.12);
  } catch {
    // Info: (20260821 - Luphia) 音效是加分項：任何失敗都不值得打擾主流程
  }
}
