import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Info: (20260911 - Luphia) dotenv-expand 必須留在 v13,而我們的 .env 值不做命令替換。
 *
 * ## 這支測試擋的是一個 CI 看不見的變更
 *
 * Dependabot #6603 想把 dotenv-expand 從 13.0.0 升到 1000.0.0。那個版號跳躍是維護者
 * 刻意的(CHANGELOG:「Yes, the jump to major version 1000 is intentional」),套件本身
 * 沒有被投毒 —— 發布者仍是 motdotla、沒有安裝期腳本、沒有資安公告。
 *
 * 壞的是它新增的功能:**`.env` 的值從 v1000 起會做命令替換**。
 *
 *     .env:  APP_URL="http://example.com/$(echo INJECTED)"
 *
 *     v13.0.0    → http://example.com/$(echo INJECTED)   惰性字串
 *     v1000.0.0  → http://example.com/INJECTED           命令執行了
 *
 * 雙引號擋不住(與 shell 的語意一致)。入口檔從 2,594 bytes 變成 135,714 bytes,
 * 多出 `execSync`、secp256k1 與 DOTENV_PRIVATE_KEY —— dotenvx 那一整套被打包進來,
 * 連 dotenv 本身也被 esbuild 內嵌(v1000 沒有 `dependencies`)。
 *
 * ## 為什麼非測不可
 *
 * 本專案有三處展開,分別落在最要緊的三條路上:
 *
 *     src/lib/prisma.ts            應用伺服器本體
 *     prisma.config.ts             每一次 prisma 指令(含 CI 的 db push / db seed)
 *     scripts/executor_worker.ts   背景 worker
 *
 * 而整套測試沒有一條會碰到 `.env` 的展開 —— #6603 的四項 CI check 全部是綠的。
 * **綠燈在這件事上不是證據**,所以要有這一支。
 *
 * 真正的代價不需要攻擊者:一組隨機產生、剛好含 `$(` 的密碼會被靜默改寫,
 * 症狀是「密碼明明填對了卻連不上資料庫」,而 `.env` 看起來完全正常。
 */

const ROOT = process.cwd();

const readJson = (relativePath: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(ROOT, relativePath), "utf8"));

describe("dotenv-expand 版本護欄", () => {
  it("package.json 宣告的必須是 v13", () => {
    const pkg = readJson("package.json") as {
      dependencies: Record<string, string>;
    };
    const range = pkg.dependencies["dotenv-expand"];

    expect(range).toBeDefined();
    /**
     * Info: (20260911 - Luphia) 允許 `^13.x`(v13 內的小版本更新是安全的),
     * 但不允許 `^1000`、`>=13`、`*` 這類會滑進命令替換那一版的寫法。
     *
     * `^13.0.0` 目前擋得住 1000.0.0 是因為 caret 只放行 `<14` —— 那是運氣,
     * 不是設計:下一個 major(若有)同樣會帶著 execSync 那一套。這條斷言與
     * dependabot 的 ignore 規則是兩道不同的門,見本檔最後一條。
     */
    expect(range).toMatch(/^\^?13\./);
  });

  /**
   * Info: (20260911 - Luphia) 「我們的 env 值不做命令替換」寫成可執行的斷言。
   *
   * 這一條比版本那條重要:版本那條守的是「今天不要升」,這一條守的是
   * **哪天真的要升時,先知道自己的 env 乾不乾淨**。
   *
   * 只掃已提交的範本 —— `.env` 本身不在版控(CI 也沒有那個檔),
   * 對開發者私人檔案下斷言既掃不到也不該掃。範本是新部署的起點,
   * 值的寫法會從這裡被抄過去。
   */
  describe(".env 範本裡不得出現命令替換", () => {
    /**
     * Info: (20260911 - Luphia) 掃描根是**走目錄找出來的**,不是寫死一個檔名(§1.1)。
     * 哪天多一個 `.env.worker.example`,它會自動進來;而下面那條
     * 「`.env.example` 必須在清單裡」是下界,擋住「一個都沒掃到卻照綠」(§1.15)。
     */
    const templates = readdirSync(ROOT).filter(
      (name) => name.startsWith(".env") && name.includes("example"),
    );

    it("掃描根真的掃到東西(`.env.example` 必須在裡面)", () => {
      expect(templates).toContain(".env.example");
    });

    it.each(templates)("%s 的值裡沒有 `$(`", (name) => {
      const lines = readFileSync(join(ROOT, name), "utf8").split("\n");
      const offending = lines
        .map((line, index) => ({ line, lineNo: index + 1 }))
        .filter(({ line }) => !line.trimStart().startsWith("#"))
        .filter(({ line }) => line.includes("$("))
        .map(({ line, lineNo }) => `${name}:${lineNo}  ${line.trim()}`);

      /*
       * Info: (20260911 - Luphia) 註解行排除在外:範本裡用 `$(...)` 舉例說明是合理的,
       * 而 dotenv 不會展開註解。斷言列出違規的行號與內容,不是只回一個 false ——
       * 這種測試紅的時候,人要能直接看到是哪一行。
       */
      expect(offending).toEqual([]);
    });
  });

  /**
   * Info: (20260911 - Luphia) 規則被刪掉這件事本身要會紅。
   *
   * 比照 `maplibre_version_guard.test.ts` 的同一條:那支測試的存在理由是
   * 「規則在、但沒擋住」發生過兩次(maplibre 到 2026-09-11 已經第三次)。
   * 這條擋不了 Dependabot,但它讓「有人把規則刪掉」變成一個紅燈。
   */
  it("dependabot 的 dotenv-expand 例外規則必須還在", () => {
    const config = readFileSync(join(ROOT, ".github/dependabot.yml"), "utf8");

    /**
     * Info: (20260911 - Luphia) 取出該套件那一條的內容再比對,不做兩次獨立的子字串比對 ——
     * 後者只要檔案裡「任何一處」有 `dotenv-expand`、「另外任何一處」有
     * `version-update:semver-major` 就通過,即使那條 ignore 掛在 maplibre-gl 上。
     * 這個檔案現在正好有兩條 ignore,所以那個假通過是真的會發生。
     * (作法沿用 maplibre 那支的切段;手工切而不引 yaml 套件的理由見該檔。)
     */
    const entries = config
      .split(/^\s*-\s+dependency-name:/m)
      .slice(1)
      .map((chunk) => `dependency-name:${chunk}`);

    const dotenvExpand = entries.find((entry) =>
      /^dependency-name:\s*"?dotenv-expand"?\s*$/m.test(entry.split("\n")[0]),
    );

    expect(dotenvExpand).toBeDefined();
    expect(dotenvExpand).toContain("version-update:semver-major");
  });
});
