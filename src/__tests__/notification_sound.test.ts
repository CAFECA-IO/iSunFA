import { describe, it, expect } from "@jest/globals";
import {
  CHIME_THROTTLE_MS,
  ChimeGate,
  arrivalKeyOf,
  hasNewArrival,
} from "@/lib/notification_sound";

/**
 * Info: (20260825 - Julian) 小鈴鐺出聲的三個判斷（計畫書 D7 / D8）。
 *
 * 這些判斷原本寫在 288 行的元件裡，而唯一的「測試」是對元件原始碼做
 * `toMatch(/total > last/)` —— 保留那行文字、把 `playChime()` 搬出 if
 * （變成每輪都響），那條照樣綠（檢查清單 §一.7）。
 *
 * `testEnvironment` 是 `node` 且 repo 沒有 jsdom / testing-library，
 * 所以元件本身仍然測不到。能做的是把**判斷**移出來，讓它們是純的、
 * 時鐘可注入、而且每一條都改壞得起來。
 */

describe("hasNewArrival", () => {
  /**
   * Info: (20260825 - Julian) 首抓不算抵達。
   * `prev === null` 是「還沒有基準」，不是「之前是 0」——
   * 兩者混為一談的症狀是使用者一打開頁面就被三聲鈴鐺打招呼。
   */
  it("首抓（prev 為 null）不算抵達", () => {
    expect(hasNewArrival(null, 3)).toBe(false);
    expect(hasNewArrival(null, 0)).toBe(false);
  });

  it("數字不變不算抵達", () => {
    expect(hasNewArrival(3, 3)).toBe(false);
  });

  /**
   * Info: (20260825 - Julian) 下降不算 —— 那是使用者自己標記已讀。
   * 用「有沒有未讀」當條件的話這裡會回 true，而那正是要避免的形狀。
   */
  it("數字下降不算抵達", () => {
    expect(hasNewArrival(5, 3)).toBe(false);
    expect(hasNewArrival(5, 0)).toBe(false);
  });

  it("數字上升才算抵達", () => {
    expect(hasNewArrival(3, 5)).toBe(true);
    expect(hasNewArrival(0, 1)).toBe(true);
  });
});

describe("arrivalKeyOf", () => {
  /**
   * Info: (20260825 - Julian) 同一次抵達在不同分頁必須算出**同一把鍵**。
   *
   * 這是跨分頁搶佔的前提。用時間戳的話三個分頁各算各的，
   * 每個都認為自己是第一個 —— 與 `dedupeKey` 拒絕 timestamp 同一個理由。
   */
  it("同樣的摘要算出同樣的鍵", () => {
    expect(arrivalKeyOf(1_700_000_000_000, 1, 2)).toBe(
      arrivalKeyOf(1_700_000_000_000, 1, 2),
    );
  });

  it("不同的摘要算出不同的鍵", () => {
    expect(arrivalKeyOf(1_700_000_000_000, 1, 2)).not.toBe(
      arrivalKeyOf(1_700_000_000_000, 2, 1),
    );
    expect(arrivalKeyOf(1_700_000_000_000, 0, 1)).not.toBe(
      arrivalKeyOf(1_700_000_000_000, 1, 0),
    );
  });

  /**
   * Info: (20260825 - Julian) 計畫書 D17 的回歸測試。
   *
   * 這一條釘住的是手動驗收實際抓到的行為：使用者把通知讀完、來了一則新的、
   * 再讀完、再來一則 —— 兩次的數量組合都是「0 則待辦、1 則完成」，
   * 舊的 `arrivalKeyOf(todo, completed)` 兩次算出同一把鍵，
   * 而 `ChimeGate.seenKeys` 記得第一次，於是第二則**搖但不響**，
   * 且畫面沒有任何地方顯示提示音已經失效。
   *
   * 斷言成對：同一次抵達仍要算出同一把鍵（跨分頁搶佔的前提），
   * 只驗後者的話「每次都回亂數」也會通過。
   */
  it("數量相同但來源不同的兩次抵達，鍵必須不同", () => {
    const first = arrivalKeyOf(1_700_000_000_000, 0, 1);
    const second = arrivalKeyOf(1_700_000_060_000, 0, 1);

    expect(second).not.toBe(first);

    const gate = new ChimeGate({ now: () => 0 });
    expect(gate.claim(first)).toBe(true);
    // Info: (20260825 - Julian) 節流窗口之外，且是另一次抵達 —— 必須出聲
    expect(new ChimeGate({ now: () => 0 }).claim(second)).toBe(true);
  });

  /**
   * Info: (20260825 - Julian) 活算的待辦沒有 createdAt（團隊邀請不入庫）。
   * 那種抵達只有數量會動，鍵仍然要跟著變。
   */
  it("沒有入庫通知時仍靠數量區分", () => {
    expect(arrivalKeyOf(null, 0, 0)).not.toBe(arrivalKeyOf(null, 1, 0));
  });
});

describe("ChimeGate：節流", () => {
  const buildClock = (start = 0) => {
    let current = start;
    return {
      now: () => current,
      advance: (ms: number) => {
        current += ms;
      },
    };
  };

  it("第一次抵達會出聲", () => {
    const clock = buildClock();
    const gate = new ChimeGate({ now: clock.now });

    expect(gate.claim("1:0")).toBe(true);
  });

  /**
   * Info: (20260825 - Julian) 批次抵達只響一次。
   *
   * 分頁在背景時停輪詢，切回前景補拉可能一次多 5 則 ——
   * 那是一次抵達，不是五次。這裡用兩個不同的 key 模擬
   * 「短時間內連續兩次不同的抵達」。
   */
  it("節流窗口內的第二次抵達不出聲", () => {
    const clock = buildClock();
    const gate = new ChimeGate({ now: clock.now });

    expect(gate.claim("1:0")).toBe(true);
    clock.advance(CHIME_THROTTLE_MS - 1);
    expect(gate.claim("2:0")).toBe(false);
  });

  it("超過節流窗口就能再出聲", () => {
    const clock = buildClock();
    const gate = new ChimeGate({ now: clock.now });

    expect(gate.claim("1:0")).toBe(true);
    clock.advance(CHIME_THROTTLE_MS);
    expect(gate.claim("2:0")).toBe(true);
  });

  /**
   * Info: (20260825 - Julian) 被節流擋下的 key **也要記住**。
   *
   * 不記的話，窗口過了之後同一次抵達會補響一聲 —— 而使用者早就看到了。
   * 這條抓的是「節流只更新時間戳、忘了記 key」那個寫法。
   */
  it("被節流擋下的抵達不會在窗口過後補響", () => {
    const clock = buildClock();
    const gate = new ChimeGate({ now: clock.now });

    gate.claim("1:0");
    clock.advance(1);
    expect(gate.claim("2:0")).toBe(false);
    clock.advance(CHIME_THROTTLE_MS);
    expect(gate.claim("2:0")).toBe(false);
  });
});

describe("ChimeGate：跨分頁", () => {
  /**
   * Info: (20260825 - Julian) 別的分頁先宣告了，這個分頁就閉嘴。
   * 三個分頁各響一次聽起來像故障（計畫書 D7）。
   */
  it("別的分頁先宣告過的 key 不出聲", () => {
    const gate = new ChimeGate({ now: () => 0 });

    gate.observePeer("1:0");

    expect(gate.claim("1:0")).toBe(false);
  });

  /**
   * Info: (20260825 - Julian) 但**別的** key 仍然要出聲。
   * 只驗上一條的話，「一律不出聲」也會通過 —— 斷言要成對。
   */
  it("別的分頁宣告的是另一個 key 時照樣出聲", () => {
    const gate = new ChimeGate({ now: () => 0 });

    gate.observePeer("1:0");

    expect(gate.claim("2:0")).toBe(true);
  });

  it("同一個分頁不會對同一個 key 出聲兩次", () => {
    const gate = new ChimeGate({ now: () => 0 });

    expect(gate.claim("1:0")).toBe(true);
    expect(gate.claim("1:0")).toBe(false);
  });

  /**
   * Info: (20260825 - Julian) 記憶有上限，但不會把「最近那一個」擠掉。
   * 上限是為了避免長時間開著的分頁無上限成長。
   */
  it("久遠的 key 被擠掉之後不影響最近的判斷", () => {
    const gate = new ChimeGate({ now: () => 0 });

    for (let index = 0; index < 40; index += 1) {
      gate.observePeer(`old-${index}`);
    }
    gate.observePeer("recent");

    expect(gate.claim("recent")).toBe(false);
  });
});
