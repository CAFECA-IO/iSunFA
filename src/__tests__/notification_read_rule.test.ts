import { describe, it, expect } from "@jest/globals";
import { canMarkReadByClick } from "@/lib/notification_read";
import {
  NOTIFICATION_TYPE,
  NOTIFICATION_LINK_PATH,
  TODO_NOTIFICATION_TYPES,
  NotificationType,
} from "@/constants/notification";

/**
 * Info: (20260826 - Julian) 「點一下算不算已讀」的規則（review B3）。
 *
 * 這條規則被抽成純函式，是因為它出錯的方式在畫面上是**看不見的**：
 * 點一下團隊邀請會扣錯徽章的桶、把提示音的基準降 1（下一次輪詢就無緣無故
 * 搖一次鈴）、並對一個不存在的通知 id 打 API —— 三件事沒有一件會在畫面上
 * 顯示成錯的。而元件本身測不到（repo 沒有 jsdom，`testEnvironment` 是 node），
 * 所以判斷留在元件裡就等於沒有測試。
 */

describe("canMarkReadByClick", () => {
  it("事件型可以被點成已讀", () => {
    expect(canMarkReadByClick(NOTIFICATION_TYPE.ANALYSIS_COMPLETED)).toBe(true);
    expect(canMarkReadByClick(NOTIFICATION_TYPE.ANALYSIS_FAILED)).toBe(true);
  });

  /**
   * Info: (20260826 - Julian) 團隊邀請：B3 的正題。
   *
   * 它是**活算的**，`readAt` 恆為 null，所以呼叫端那句
   * `if (item.readAt !== null) return` 擋不住它。
   */
  it("團隊邀請不可以", () => {
    expect(canMarkReadByClick(NOTIFICATION_TYPE.TEAM_INVITATION)).toBe(false);
  });

  /**
   * Info: (20260826 - Julian) 錢包升級：今天碰不到，但一定要擋。
   *
   * 它的 `NOTIFICATION_LINK_PATH` 是 null，所以渲染成不可點的 `<div>`。
   * review 建議的 `derived: boolean` 判準修不掉它 —— 而那一欄的註解寫著
   * 「有了升級頁面之後把它填進來」。填進去的那天，點一下就會把一則
   * 還沒處理的待辦標成已讀，`dedupeKey` 是永久唯一鍵，補不回來（D1）。
   */
  it("錢包升級不可以（即使它今天沒有去處）", () => {
    expect(canMarkReadByClick(NOTIFICATION_TYPE.WALLET_UPGRADE)).toBe(false);
  });

  /**
   * Info: (20260826 - Julian) 判準跟著 `TODO_NOTIFICATION_TYPES` 走，不是寫死兩個。
   *
   * 逐一列舉的話，新增第三個待辦型時這支測試照樣全綠，而那個新型別
   * 一被點就會重演整個 B3。
   */
  it("所有待辦型都不可以（新增待辦型時自動涵蓋）", () => {
    TODO_NOTIFICATION_TYPES.forEach((type) => {
      expect(canMarkReadByClick(type)).toBe(false);
    });
  });

  // Info: (20260826 - Julian) 未知型別不當成待辦（保守方向：多標一次已讀，而不是漏掉待辦）
  it("未知型別視為可標記", () => {
    expect(canMarkReadByClick("SOMETHING_NEW")).toBe(true);
  });
});

/**
 * Info: (20260826 - Julian) 這條規則與伺服器端必須是同一個答案。
 *
 * `notificationRepo.markReadById` 的 `excludeTypes` 收的也是
 * `TODO_NOTIFICATION_TYPES`。兩邊分岔的話，前端以為標掉了（徽章少 1），
 * 伺服器回 0 什麼都沒做 —— 下一次輪詢徽章跳回去，而使用者只會覺得畫面在閃。
 */
describe("與伺服器端的守門同源", () => {
  it("前端擋下的型別，正是 service 傳給 repo 排除的那一組", () => {
    const clientBlocked = Object.values(NOTIFICATION_TYPE).filter(
      (type) => !canMarkReadByClick(type),
    );

    expect(clientBlocked.sort()).toEqual([...TODO_NOTIFICATION_TYPES].sort());
  });

  /**
   * Info: (20260826 - Julian) 前提：待辦型清單不是空的。
   *
   * 空清單會讓上面那條變成 `[] === []` —— 一個永遠成立、什麼都沒驗的斷言。
   */
  it("待辦型清單不是空的（上一條的前提）", () => {
    expect(TODO_NOTIFICATION_TYPES.length).toBeGreaterThan(0);
  });
});

/**
 * Info: (20260826 - Julian) B3 的觸發前提：待辦型有去處才點得到。
 *
 * 這一條不是在規定 `NOTIFICATION_LINK_PATH` 該怎麼填，而是把「為什麼
 * 錢包升級今天碰不到這個缺陷」寫成可執行的事實。哪天有人填了升級頁面，
 * 這條會紅 —— 而它紅的時候，上面那組測試正好證明擋得住。
 */
describe("待辦型的去處（記錄現況，不是規範）", () => {
  it("團隊邀請有去處（所以點得到，B3 才會發生）", () => {
    expect(
      NOTIFICATION_LINK_PATH[
        NOTIFICATION_TYPE.TEAM_INVITATION as NotificationType
      ],
    ).not.toBeNull();
  });
});
