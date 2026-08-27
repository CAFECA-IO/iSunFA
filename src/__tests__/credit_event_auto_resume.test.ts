import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

import { publishCreditEvent, subscribeCreditEvents } from "@/lib/credit_events";
import {
  CREDIT_EVENT,
  CREDIT_EVENT_CHANNEL_NAME,
} from "@/constants/credit_events";

/**
 * Info: (20260827 - Luphia) 付款完成後自動接續（issue #6714）。
 *
 * 暫停時畫面上的兩條出路（加購點數、升級方案）都是 `target="_blank"` 開新分頁，
 * 所以**付款一定發生在另一個分頁**。付完錢的人回到原來那一頁時，那一頁對剛剛
 * 發生的事一無所知——他得自己再按一次「接著匯入」，而他剛剛就是為了那件事付的錢。
 *
 * 這一組守三件事：事件層真的送得到、三條付款路徑都會發、以及收到之後的三道閘門。
 */

/**
 * Info: (20260827 - Luphia) jsdom 沒有 BroadcastChannel。用一個最小的替身把
 * 「送到其他物件、但不送回發佈者自己」這個語意實作出來——那個語意正是
 * 「同一個分頁內付款也收得到」的依據，換成一個會送回自己的替身就測不到它。
 */
class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  static reset() {
    FakeBroadcastChannel.instances = [];
  }
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  closed = false;
  constructor(public readonly name: string) {
    FakeBroadcastChannel.instances.push(this);
  }
  postMessage(data: unknown) {
    FakeBroadcastChannel.instances.forEach((peer) => {
      if (peer === this || peer.closed || peer.name !== this.name) return;
      peer.onmessage?.({ data } as MessageEvent<unknown>);
    });
  }
  close() {
    this.closed = true;
  }
}

describe("點數事件的傳遞", () => {
  const original = (globalThis as Record<string, unknown>).BroadcastChannel;

  beforeEach(() => {
    FakeBroadcastChannel.reset();
    (globalThis as Record<string, unknown>).BroadcastChannel =
      FakeBroadcastChannel;
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).BroadcastChannel = original;
  });

  it("訂閱者收得到付款成功", () => {
    const seen: string[] = [];
    const stop = subscribeCreditEvents((event) => seen.push(event.type));
    publishCreditEvent({ type: CREDIT_EVENT.PAYMENT_SUCCEEDED });
    expect(seen).toEqual([CREDIT_EVENT.PAYMENT_SUCCEEDED]);
    stop();
  });

  /**
   * Info: (20260827 - Luphia) 解除訂閱之後不可以再收到：碳盤查的頁面會被卸載，
   * 而收到之後要做的事是**花錢**。
   */
  it("解除訂閱之後不再收到", () => {
    const seen: string[] = [];
    const stop = subscribeCreditEvents((event) => seen.push(event.type));
    stop();
    publishCreditEvent({ type: CREDIT_EVENT.PAYMENT_SUCCEEDED });
    expect(seen).toEqual([]);
  });

  /**
   * Info: (20260827 - Luphia) 頻道是同源共享的，任何同源頁面都寫得進來。
   * 認不出的內容要直接忽略，不是讓它流進判斷式——那一端接著要花錢。
   */
  it.each([
    ["不認得的型別", { type: "GIVE_ME_FREE_CREDITS" }],
    ["型別不是字串", { type: 42 }],
    ["沒有型別", { foo: "bar" }],
    ["不是物件", "PAYMENT_SUCCEEDED"],
    ["null", null],
  ])("忽略認不出的廣播內容：%s", (_label, payload) => {
    const seen: string[] = [];
    const stop = subscribeCreditEvents((event) => seen.push(event.type));
    const channel = new FakeBroadcastChannel(CREDIT_EVENT_CHANNEL_NAME);
    channel.postMessage(payload);
    expect(seen).toEqual([]);
    stop();
  });

  /**
   * Info: (20260827 - Luphia) 兩個訂閱者都要收到：碳盤查可能同時開著兩個分頁，
   * 而「只有一個能真的跑」是由伺服器的執行許可決定的（issue #6721），
   * 不是靠廣播只送給其中一個。
   */
  it("多個訂閱者都收到", () => {
    const a: string[] = [];
    const b: string[] = [];
    const stopA = subscribeCreditEvents((event) => a.push(event.type));
    const stopB = subscribeCreditEvents((event) => b.push(event.type));
    publishCreditEvent({ type: CREDIT_EVENT.PAYMENT_SUCCEEDED });
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    stopA();
    stopB();
  });
});

/**
 * Info: (20260827 - Luphia) 沒有 BroadcastChannel（SSR、舊瀏覽器、隱私設定關掉）
 * 時要安靜降級：這是一條**便利路徑**，掃描行程（≤5 分鐘）與手動按鈕都還在，
 * 不該因為它不可用而讓付款流程報錯。
 */
describe("沒有 BroadcastChannel 時安靜降級", () => {
  const original = (globalThis as Record<string, unknown>).BroadcastChannel;
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).BroadcastChannel;
  });
  afterEach(() => {
    (globalThis as Record<string, unknown>).BroadcastChannel = original;
  });

  it("發佈不拋錯", () => {
    expect(() =>
      publishCreditEvent({ type: CREDIT_EVENT.PAYMENT_SUCCEEDED }),
    ).not.toThrow();
  });

  it("訂閱回傳一個可以安全呼叫的解除函式", () => {
    const stop = subscribeCreditEvents(() => {
      throw new Error("should never be called");
    });
    expect(() => stop()).not.toThrow();
  });
});

describe("三條付款路徑都會發廣播", () => {
  const files: [string, string][] = [
    ["簽章付款", "src/hooks/use_order_transaction.ts"],
    ["刷卡結帳", "src/components/pricing/payment_modal.tsx"],
    ["團隊額度扣抵", "src/hooks/use_team_quota_payment.ts"],
  ];

  it.each(files)("%s 會發 PAYMENT_SUCCEEDED", (_label, file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    expect(source).toContain(
      "publishCreditEvent({ type: CREDIT_EVENT.PAYMENT_SUCCEEDED })",
    );
  });

  /**
   * Info: (20260827 - Luphia) 廣播要在**伺服器確認之後**。發在送出的那一刻等於
   * 廣播一個可能不成立的事實，而收到的那一頁會據此去花錢。
   *
   * 三條路各自的「確認點」不同，但都在 `refreshAuth()` 附近——那一支的存在
   * 本身就代表「伺服器已經改變了餘額，畫面要重取」。
   */
  it.each(files)("%s 的廣播在伺服器確認之後", (_label, file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    const publishAt = source.indexOf("publishCreditEvent(");
    const throwAt = source.lastIndexOf("throw new Error", publishAt);
    expect(publishAt).toBeGreaterThan(-1);
    // Info: (20260827 - Luphia) 失敗的判斷（throw）必須排在廣播之前
    expect(throwAt).toBeLessThan(publishAt);
  });
});

describe("收到之後的三道閘門", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );
  const scope = (() => {
    const start = hook.indexOf("const autoResumeAfterPaymentRef");
    expect(start).toBeGreaterThan(-1);
    const end = hook.indexOf("const toggleImportItem", start);
    expect(end).toBeGreaterThan(start);
    return hook.slice(start, end);
  })();

  it("只有「點數用完」那種暫停會自動接續", () => {
    expect(scope).toContain("JOB_PAUSE_REASON.CREDITS_EXHAUSTED");
  });

  // Info: (20260827 - Luphia) 這一頁已經在跑就不要再發一次
  it("正在跑的時候不動作", () => {
    expect(scope).toContain("if (isRetryingImport) return;");
  });

  it("沒有暫停的份就不動作", () => {
    expect(scope).toContain("if (paused.length === 0) return;");
  });

  /**
   * Info: (20260827 - Luphia) 畫面自己動起來而沒有任何說明，比不動更難理解——
   * 使用者剛從另一個分頁回來，不會知道是誰按了什麼。
   */
  it("開跑之前先說一句話", () => {
    const noticeAt = scope.indexOf("carbon_chatbot.import_auto_resuming");
    const resumeAt = scope.indexOf("resumePausedImportChapters()");
    expect(noticeAt).toBeGreaterThan(-1);
    expect(resumeAt).toBeGreaterThan(noticeAt);
  });

  /**
   * Info: (20260827 - Luphia) 接續本身會先換一把執行許可（issue #6721）。
   * 廣播只是提示，不是授權——同源的任何頁面都寫得進那個頻道。
   */
  it("接續走的是會拿許可的那條路", () => {
    expect(scope).toContain("resumePausedImportChapters()");
    const resumeFn = hook.slice(
      hook.indexOf("const resumePausedImportChapters = useCallback"),
    );
    expect(resumeFn.slice(0, 3000)).toContain(
      "claimImportJob(JOB_CLAIM_INTENT.RESUME)",
    );
  });

  /**
   * Info: (20260827 - Luphia) 訂閱只掛一次（空依賴）。依賴放 `pendingImport`
   * 之類的東西會讓它在每次解析結果變動時重新訂閱，而重新訂閱之間的那個瞬間
   * 收不到訊息——付款完成的廣播只有一則，錯過就沒有了。
   */
  it("訂閱的依賴是空陣列", () => {
    const subAt = hook.indexOf("subscribeCreditEvents((event)");
    expect(subAt).toBeGreaterThan(-1);
    const after = hook.slice(subAt, subAt + 400);
    expect(after).toContain("[],");
  });

  it.each(["zh_tw", "zh_cn", "en", "ja", "ko"])(
    "%s 有自動接續的文案",
    (locale) => {
      const file = readFileSync(
        join(
          process.cwd(),
          "src",
          "i18n",
          "locales",
          locale,
          "carbon_chatbot.ts",
        ),
        "utf8",
      );
      expect(file).toContain("import_auto_resuming:");
    },
  );
});
