import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Info: (20260814 - Luphia) 碳盤查的 LLM 路徑必須計費（PR #6652 review B-1）。
 *
 * 段落草稿端點（`chat/carbon/draft`）漏接了近一個月：它底下確實會呼叫 `recordLlmUsage`，
 * 但不在任何 `runWithUsageCapture` 範圍內，用量被 `usage_scope` 的 `if (!scope) return`
 * 直接吞掉——使用者按一次「生成草稿」，模型成本照付、額度一點都不扣，
 * 而條款寫的是「各項人工智慧作業均依實際使用量計費」。
 *
 * AsyncLocalStorage 解決的是 fan-out 內部的傳遞，「把管線包起來」這一步仍然要有人記得做。
 * 這支測試就是那個「記得」：新增碳盤查的 LLM 端點時，不接計費就會紅。
 */

const CARBON_CHAT_DIR = join(
  process.cwd(),
  "src",
  "app",
  "api",
  "v1",
  "chat",
  "carbon",
);

/**
 * Info: (20260814 - Luphia) 會實際發動 LLM 推論的 service 模組。
 *
 * 以「引用了哪個模組」判定，而不是用命名規則猜：`AttachmentSecurityService` 只做
 * 病毒掃描與儲存，名字裡有 Service 卻不碰模型，用猜的會把它誤判成漏接計費。
 * 新增 LLM service 時必須列進來——這份清單就是「哪些東西要花錢」的單一出處。
 */
const LLM_SERVICE_MODULES = [
  "@/services/paragraph_draft.service",
  "@/services/carbon_diagram.service",
  "@/services/attachment_extraction.service",
  "@/services/carbon_import.service",
  "@/services/chat.service",
];

function collectRouteFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectRouteFiles(full);
    return entry.name === "route.ts" ? [full] : [];
  });
}

describe("carbon LLM routes are billed", () => {
  const routes = collectRouteFiles(CARBON_CHAT_DIR);

  it("finds the carbon chat routes at all", () => {
    // Info: (20260814 - Luphia) 目錄搬家時這支測試不該無聲地變成空集合
    expect(routes.length).toBeGreaterThan(3);
  });

  it("bills every route that runs an LLM task", () => {
    const offenders = routes
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        const usesLlm = LLM_SERVICE_MODULES.some((mod) => source.includes(mod));
        if (!usesLlm) return false;
        return !/runBilledCarbonTask\s*\(/.test(source);
      })
      .map((file) => file.slice(process.cwd().length + 1));

    expect(offenders).toEqual([]);
  });

  // Info: (20260814 - Luphia) 反向確認清單有在作用：目前四個端點確實各自接了計費
  it("covers the known billed endpoints", () => {
    const billed = routes.filter((file) =>
      /runBilledCarbonTask\s*\(/.test(readFileSync(file, "utf8")),
    );
    expect(billed.length).toBeGreaterThanOrEqual(4);
  });
});

/**
 * Info: (20260814 - Luphia) `usage_scope` 說 `invokeGuarded` 是所有 LLM 呼叫的唯一入口——
 * 那句話必須為真，否則下一個人會依賴它。繞過它的呼叫既沒有逾時防護，
 * 用量也不會被回報，於是計費永遠看不到那些 token。
 */
describe("LLM calls go through the guarded entry point", () => {
  const SRC = join(process.cwd(), "src");

  /**
   * Info: (20260814 - Luphia) 已知且刻意的例外：
   * - `chat.service.ts` 自己就是那個入口
   * - `business_monitor.service.ts` 是背景監控，不在計費情境（見該檔註解）
   * - `src/scripts/` 為離線工具，不跑在請求路徑上
   */
  const ALLOWED = new Set([
    join("src", "services", "chat.service.ts"),
    join("src", "services", "business_monitor.service.ts"),
  ]);

  function collectSourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === "scripts" ? [] : collectSourceFiles(full);
      }
      return /\.ts$/.test(entry.name) ? [full] : [];
    });
  }

  it("keeps direct SDK generateContent calls to the known exceptions", () => {
    const offenders = collectSourceFiles(SRC)
      .filter((file) => {
        const relative = file.slice(process.cwd().length + 1);
        if (ALLOWED.has(relative)) return false;
        if (relative.includes(join("src", "__tests__"))) return false;
        /**
         * Info: (20260814 - Luphia) 只抓**對 SDK model 物件**的直接呼叫。
         * `chatService.generateContent(...)` 是包裝後的入口，不在此列。
         */
        return /\b(model|modelInstance|genModel|nameModel)\.generateContent\s*\(/.test(
          readFileSync(file, "utf8"),
        );
      })
      .map((file) => file.slice(process.cwd().length + 1));

    expect(offenders).toEqual([]);
  });
});
