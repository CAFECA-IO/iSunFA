import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Info: (20260911 - Luphia) 我們的 `.env` 值裡不放命令替換(`$(...)`)。
 *
 * ## 這是關於我們自己的 env,不是關於任何套件的版本
 *
 * 起因是 Dependabot #6603(dotenv-expand 13 → 1000)。v1000 起 `.env` 的值會做
 * 命令替換 —— 實測同一個 `.env`、同一段程式碼,只換版本:
 *
 *     .env:  APP_URL="http://example.com/$(echo INJECTED)"
 *
 *     v13.0.0    → http://example.com/$(echo INJECTED)   惰性字串
 *     v1000.0.0  → http://example.com/INJECTED           命令執行了
 *
 * 雙引號擋不住(與 shell 的語意一致)。那支 PR 已關閉,而我第一版的護欄是
 * 「dotenv-expand 必須是 13.x」—— owner 判定那不合理,判斷是對的:
 * **把版號寫死是用一句永久斷言處理一個暫時的問題**,而它過期的方式已經有前例
 * (見 issue #6804:maplibre-gl 鎖在 v5,公告來了卻沒有 v5 修補版,護欄自己變成障礙)。
 *
 * 所以這一支不看任何版本,只守一個與版本無關的性質:**我們的 env 範本裡沒有 `$(`。**
 *
 * ## 它在什麼時候有用
 *
 * 1. **今天**:本專案的秘密保管地是資料庫(見 `setup.system_setting.service.ts`),
 *    `.env` 只放環境差異與 `NEXT_PUBLIC_*`。範本裡出現 `$(` 幾乎一定是誤會。
 * 2. **哪天真的要換展開器**(dotenv-expand 升 major、或改用 dotenvx):
 *    那一刻要問的第一個問題是「我們的 env 乾不乾淨」,而這一支已經答好了。
 *    這是它比版號斷言有價值的地方 —— 版號斷言在那一天只會擋路。
 *
 * ## 它守不到的地方(說清楚,不要以為有了它就夠)
 *
 * 只掃**已提交的範本**。正式部署機器上的 `.env` 不在版控(CI 也沒有那個檔),
 * 對開發者與生產環境的私人檔案下斷言既掃不到也不該掃。範本是新部署的起點、
 * 值的寫法會從這裡被抄過去,所以守它有意義;但換展開器的那一天,
 * **生產環境的 `.env` 仍然要人工看一眼**,尤其是密碼類的值 ——
 * 一組隨機產生、剛好含 `$(` 的密碼會被靜默改寫,症狀是「密碼明明填對了卻連不上」。
 */

const ROOT = process.cwd();

/**
 * Info: (20260911 - Luphia) 掃描根是**走目錄找出來的**,不是寫死一個檔名(§1.1)。
 * 哪天多一個 `.env.worker.example`,它會自動進來。
 */
const templates = readdirSync(ROOT).filter(
  (name) => name.startsWith(".env") && name.includes("example"),
);

describe(".env 範本裡不得出現命令替換", () => {
  /**
   * Info: (20260911 - Luphia) 下界:擋住「一個檔案都沒掃到卻照綠」(§1.15)。
   * 少了這一條,上面那個 filter 寫錯(或範本被改名)時,`it.each` 會跑零次而測試通過。
   */
  it("掃描根真的掃到東西(`.env.example` 必須在裡面)", () => {
    expect(templates).toContain(".env.example");
  });

  it.each(templates)("%s 的值裡沒有 `$(`", (name) => {
    const offending = readFileSync(join(ROOT, name), "utf8")
      .split("\n")
      .map((line, index) => ({ line, lineNo: index + 1 }))
      /*
       * Info: (20260911 - Luphia) 註解行排除在外:範本裡用 `$(...)` 舉例說明是合理的,
       * 而 dotenv 不會展開註解。
       */
      .filter(({ line }) => !line.trimStart().startsWith("#"))
      .filter(({ line }) => line.includes("$("))
      .map(({ line, lineNo }) => `${name}:${lineNo}  ${line.trim()}`);

    /*
     * Info: (20260911 - Luphia) 斷言列出違規的行號與內容,不是只回一個 false ——
     * 這種測試紅的時候,人要能直接看到是哪一行。
     */
    expect(offending).toEqual([]);
  });
});
