import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { teamManagement as zhTw } from "@/i18n/locales/zh_tw/team_management";
import { teamManagement as zhCn } from "@/i18n/locales/zh_cn/team_management";
import { teamManagement as en } from "@/i18n/locales/en/team_management";
import { teamManagement as ja } from "@/i18n/locales/ja/team_management";
import { teamManagement as ko } from "@/i18n/locales/ko/team_management";

/**
 * Info: (20260819 - Luphia) 分配處理中的動畫與「不要關閉」提示（產品需求 20260819）。
 *
 * 分配不是一次資料庫寫入：先在交易內扣團隊池，**接著在交易外鑄到成員的鏈上錢包**
 * （ADR 015 修訂）。中途離開的代價很具體——那筆 `ALLOCATE` 可能停在 `txHash: null`，
 * 即「已扣池、尚未確認上鏈」，需要人工追查。
 *
 * ⚠️ 本 repo 沒有元件測試環境（無 jsdom / testing-library），因此這一支是**原始碼掃描**
 * 而不是渲染測試。它證明得了「該有的東西在檔案裡」，證明不了「使用者真的看得到」——
 * 後者只有人工檢查或引入元件測試環境才辦得到，這一點寫在這裡以免它被當成完整的保護。
 *
 * 掃描守的是三件最容易被日後改動弄掉的事：
 * 1. `beforeunload` 只在處理中掛、處理完卸下（常駐會讓提示被無視）
 * 2. 提示文字用 i18n key（不是硬寫中文）
 * 3. 處理中不得關閉視窗
 */

const MODAL = "src/components/team/allocation_modal.tsx";

const source = readFileSync(join(process.cwd(), MODAL), "utf8");

describe("分配視窗的處理中狀態", () => {
  it("處理中攔住重新整理與關閉分頁（beforeunload）", () => {
    expect(source).toMatch(/addEventListener\("beforeunload"/);
    // Info: (20260819 - Luphia) 跨瀏覽器：規範認 preventDefault、Chrome 早期只認 returnValue
    expect(source).toMatch(/event\.preventDefault\(\)/);
    expect(source).toMatch(/event\.returnValue/);
  });

  /**
   * Info: (20260819 - Luphia) 只在處理中掛、處理完卸下。
   *
   * 少了 `removeEventListener`，使用者在這一頁的任何離開都會被瀏覽器問一次——
   * 而那種提示很快就會被無視，等於把這個保護自己弄壞。
   */
  it("處理完會卸下監聽，不常駐", () => {
    expect(source).toMatch(/removeEventListener\("beforeunload"/);
    expect(source).toMatch(/if \(!submitting\) return undefined;/);
  });

  it("處理中顯示動畫與提示，且不得關閉視窗", () => {
    expect(source).toMatch(/animate-spin/);
    expect(source).toMatch(/allocating_title/);
    expect(source).toMatch(/allocating_warning/);
    // Info: (20260819 - Luphia) Dialog 的 onClose 與取消鈕都要看 submitting
    expect(source).toMatch(/onClose=\{\(\) => !submitting && onClose\(\)\}/);
    expect(source).toMatch(/disabled=\{submitting\}/);
  });

  // Info: (20260819 - Luphia) 三個 key 在五個語系都要齊（少一個語系就會顯示 key 本身）
  it.each([
    ["zh_tw", zhTw],
    ["zh_cn", zhCn],
    ["en", en],
    ["ja", ja],
    ["ko", ko],
  ])("%s 有三個處理中文案", (_locale, dict) => {
    const wallet = (dict as { wallet: Record<string, unknown> }).wallet;

    for (const key of [
      "allocating_title",
      "allocating_warning",
      "allocating_button",
    ]) {
      expect(typeof wallet[key]).toBe("string");
      expect((wallet[key] as string).length).toBeGreaterThan(3);
    }
  });
});
