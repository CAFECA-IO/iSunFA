import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { SessionStatusEnum } from "@/types/carbon_chatbot.types";

/**
 * Info: (20260827 - Luphia) 智能溫盤側欄的狀態徽章被壓成一個團塊（2026-08-27 回報）。
 *
 * 症狀：有綁帳本的會話那幾列，「進行中」上下疊成兩到三行。
 *
 * 成因與 `login_button_mobile.test.ts` 那一條**完全相同**，這是同一個缺陷的第二個
 * 現場：那一列是 `justify-between` 的三個 flex 子項（日期、狀態徽章、帳本 chip），
 * 而中文**每個字之間都是合法斷點**，所以 flex 算出的 min-content 只有一個字寬。
 * 空間不足時徽章被壓到一字寬，`rounded-full` 讓那個結果成為一個團塊。
 *
 * 實測（瀏覽器裡以同樣的 class 重現該列，寬度掃描）：
 *
 * | 容器寬度 | 修正前 | 修正後 |
 * |---|---|---|
 * | 200px | 40×31，**2 行** | 44×18，1 行 |
 * | 170px | 33×45，**3 行** | 44×18，1 行 |
 * | 140px | 26×45，**3 行** | 44×18，1 行 |
 *
 * 為什麼只有部分列壞掉：**帳本 chip 不存在時**（個人會話）只有兩個子項，
 * 空間綽綽有餘。回報的截圖裡第一列正常、下面兩列壞掉，差別就在這裡。
 */
describe("側欄的狀態徽章不會被壓成一個團塊", () => {
  const sidebar = readFileSync(
    join(
      process.cwd(),
      "src",
      "components",
      "carbon_chatbot",
      "chat_sidebar.tsx",
    ),
    "utf8",
  );

  /**
   * Info: (20260827 - Luphia) 只取狀態徽章那一個 `className`，不對整個檔案斷言：
   * 上方的註解本身就寫著這些 class 名（解釋為什麼要用它們），而對整個檔案做
   * 斷言時那些字會讓「不包含」型的檢查失效——這個坑在 login_button 那一組
   * 當場踩過。
   */
  const badgeClass = (() => {
    const at = sidebar.indexOf("${s.statusColor}");
    expect(at).toBeGreaterThan(-1);
    const start = sidebar.lastIndexOf("`", at);
    return sidebar.slice(start, at);
  })();

  it("徽章不可被 flex 壓縮，也不可換行", () => {
    expect(badgeClass).toContain("shrink-0");
    expect(badgeClass).toContain("whitespace-nowrap");
  });

  /**
   * Info: (20260827 - Luphia) 日期同樣不該換行。徽章不再被壓縮之後，壓力會移到
   * 其他子項——而三個子項裡只有帳本 chip 備好了 `min-w-0` 與 `truncate`，
   * 它才是設計上該被壓縮的那一個。
   */
  it("日期也不可被壓縮", () => {
    const at = sidebar.indexOf("{s.time}");
    expect(at).toBeGreaterThan(-1);
    /**
     * Info: (20260827 - Luphia) 錨在 `<span className="`（帶標籤）而不是只錨
     * `className="`：時鐘圖示的 class 離 `{s.time}` 更近，只錨屬性名會抓到
     * 那一個（`h-3 w-3`），於是這條測試會綠在一個與行為無關的字串上。
     */
    const start = sidebar.lastIndexOf('<span className="', at);
    expect(start).toBeGreaterThan(-1);
    const from = start + '<span className="'.length;
    expect(sidebar.slice(from, sidebar.indexOf('"', from))).toContain(
      "shrink-0",
    );
  });

  /**
   * Info: (20260827 - Luphia) 帳本 chip 必須保留 `min-w-0` 與 `truncate`：
   * 它是這一列唯一該吸收擠壓的子項，拿掉之後壓力會回到徽章與日期身上。
   */
  it("帳本 chip 仍是唯一該被壓縮的子項", () => {
    /**
     * Info: (20260827 - Luphia) 錨在 `title={s.boundBookName}` 並**往後**看：
     * `{s.boundBookName}` 的第一次出現是那個 `&&` 守門，位置在 chip 的 class
     * **之前**——往前找會找不到那些 class，而測試會紅在錨點而不是行為上。
     */
    const at = sidebar.indexOf("title={s.boundBookName}");
    expect(at).toBeGreaterThan(-1);
    const scope = sidebar.slice(at, at + 500);
    expect(scope).toContain("min-w-0");
    expect(scope).toContain("truncate");
  });

  /**
   * Info: (20260827 - Luphia) `whitespace-nowrap` 在這裡安全的**前提**是標籤很短。
   *
   * 這一條把那個前提釘住：狀態值是一組寫死的短字串，最長三個字。哪天有人加一個
   * 長標籤（例如「等待點數補充」），禁止換行就會從保護變成裁切，而這條測試會先紅。
   *
   * 對照：`common/login_button.tsx` 刻意**不加** `whitespace-nowrap`，因為那顆
   * 按鈕的標籤由呼叫端傳入，其中有幾個相當長。
   */
  it("狀態標籤都很短（nowrap 的前提）", () => {
    const labels = Object.values(SessionStatusEnum);
    expect(labels.length).toBeGreaterThan(0);
    labels.forEach((label) => {
      expect(label.length).toBeLessThanOrEqual(4);
    });
  });

  /**
   * Info: (20260901 - Luphia) 上面那條量的是 **enum 成員**，而畫面渲染的必須是
   * **同一個字**，否則觀測量與被守護的東西脫鉤（review #6731 三輪中-2，
   * 檢查表 §1.9）。
   *
   * 這件事已經排定要變：`SessionStatusEnum` 把中文寫死當 enum 值，已另立案要
   * i18n 化。那張票落地時 `{s.status}` 會換成 `t(...)`，畫面上的字變成
   * "In Progress"（11 字）、"진행 중"、德文 "In Bearbeitung"（14 字），而上面
   * 那條仍然讀 enum、仍然全綠——`whitespace-nowrap` 就從保護變成撐開整列。
   *
   * 這一條讓那一天**先紅在這裡**，而紅的位置正是要重新決定 `nowrap` 的位置。
   */
  it("渲染的就是 enum 值本身（i18n 化當天這條要先紅）", () => {
    expect(sidebar).toContain("{s.status}");
    const at = sidebar.indexOf("{s.status}");
    const scope = sidebar.slice(Math.max(0, at - 300), at);
    // Info: (20260901 - Luphia) 一旦改成譯值，這裡會出現 t( 而這條就紅了
    expect(scope).not.toMatch(/\bt\(/);
  });
});
