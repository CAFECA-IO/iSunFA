import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

/**
 * Info: (20260812 - Luphia) 外部運算節點的資料庫耦合必須是**清單化**的。
 *
 * `async_workers/00_async_worker_overview.md` 要求 mission 管線那個節點沒有主資料庫
 * 權限（那道隔離是防提示詞注入的基礎）。這支測試掃**執行期匯入圖**：從節點入口
 * 出發，沿著會真正被載入的邊走，看能不能走到 `lib/prisma`。
 *
 * 為什麼是匯入圖而不是「有沒有呼叫」：`lib/prisma` 在**載入時**就以
 * `process.env.DATABASE_URL` 建連線池。只要它在圖裡，那個節點就帶著資料庫用戶端 ——
 * 「沒有權限」就只剩紀律：連線池在那裡，只是剛好沒人用。
 *
 * `import type` 不算邊（編譯後消失）。實際掃出來的結果讓五條「幽靈耦合」現形：
 * 那些檔案只用到 `document_parser_db_sync` 的型別，卻寫成值匯入，於是把
 * `document_sync.repo → lib/prisma` 整條拉進圖裡。改成 `import type` 之後就沒了。
 *
 * Info: (20260907 - Luphia) 最後兩條**真的**耦合（排放係數字典）已於本輪清空：
 * 字典由發包端（`issue.service`，維運側）在發包時嵌進 mission.json 的
 * `prerequisiteData.globalCoefficients`，隨 IPFS 過界，運算側以
 * `lib/worker/coefficient_snapshot`（零 prisma 的純模組）讀取——
 * `esg_parsing` 與 `voucher.pipeline.orchestrator` 都不再匯入
 * `EmissionFactorRepo`。**文件那句「絕對沒有存取主資料庫的權限」自此是
 * 由本測試守著的事實**：清單空了，而且只能一直是空的。
 */
const ROOT = process.cwd();

/**
 * Info: (20260907 - Luphia) 已知耦合清單：**空**，而且要一直是空的。
 *
 * 保留清單機制而不是把斷言改寫成 `toEqual([])` 的字面值，是為了讓「有人想
 * 加一條耦合」必須動到**這個常數**——它上面這段註解就是那時要讀的東西：
 * 新的 DB 需求走 mission 快照（發包端嵌入）或維運節點，不走匯入。
 */
const KNOWN_DB_COUPLING: string[] = [];

/**
 * Info: (20260914 - Luphia) `@/` 與**相對路徑**都要解析（review 三輪需修-6）。
 *
 * 原本只認 `@/`：`executor_worker.ts` 用 `../src/...` 匯入服務圖，掃描器走到入口
 * 就停，`toEqual([])` 對它恆真——在 `mission.executor.service` 底下任何地方加
 * `import { prisma }` 都是綠的。入口現已改用 `@/`（CLAUDE.md §3），但掃描器不能
 * 靠「大家都用 `@/`」成立：那又是巧合成立。裸套件名（`viem`、`fs`）回 null。
 */
const resolveModule = (spec: string, fromFile: string): string | null => {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, "src", spec.slice(2));
  else if (spec.startsWith("."))
    base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  const candidates = [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
};

/**
 * Info: (20260812 - Luphia) 只取執行期會載入的邊。
 * `import type` / `export type` 編譯後消失；`await import()` 是延遲載入，
 * 不會把模組帶進啟動時的圖（`chat.service` 正是靠這個把 system_setting 移出圖外）。
 */
const runtimeDependencies = (source: string): string[] => {
  const specs: string[] = [];
  /**
   * Info: (20260914 - Luphia) 一條正則、**依原始碼順序**、一個語句一個匹配：
   * - `(type\s+)?`：`import type`／`export type` 不算邊。
   * - `(?:[^"';]*?\bfrom\s+)?`：具名／預設／`*` 匯入到 `from` 之間的部分；
   *   排除 `"`、`'`、`;` 讓它**不能跨語句**——上一版用 `[\s\S]*?`，遇到側效匯入
   *   `import "./b";` 會從那個 `import` 一路吃到下一句的 `from "…"`，把下一句
   *   的 `import type` 算成執行期邊。
   * - 側效匯入（`import "@/x"`，沒有 `from`；review 二輪）就是 optional 群組缺席。
   * 順序有意義：`worker_node_isolation` 用 `[0]` 釘「第一個執行期匯入是 bootstrap」。
   */
  const pattern =
    /^\s*(?:import|export)\s+(type\s+)?(?:[^"';]*?\bfrom\s+)?"([^"]+)"/gm;
  for (const match of source.matchAll(pattern)) {
    if (match[1]) continue;
    specs.push(match[2]);
  }
  return specs;
};

/**
 * Info: (20260914 - Luphia) 「這個檔案有沒有 prisma 邊」改用**同一份**依賴解析結果
 * 判斷，不再另寫一條只認 `import { prisma } from` 的正則（review 二輪）。
 * 原本的正則對 `import prisma from`、`export { prisma } from`、`import "@/lib/prisma"`
 * 都是綠的——現況 115 處剛好全是具名大括號形式，那是巧合成立不是結構成立
 *（checklist §1.15 的形狀：掃描根對了，偵測器卻是單向的）。
 */
const PRISMA_MODULE = "@/lib/prisma";
const importsPrisma = (source: string): boolean =>
  runtimeDependencies(source).includes(PRISMA_MODULE);

/**
 * Info: (20260812 - Luphia) 蒐集**所有**可達的 prisma 匯入點，不是只找第一條路徑。
 *
 * 只回傳第一條路徑的話,新增一條耦合可能被舊路徑遮住 —— 掃描器先找到舊的就停了。
 * 集合比對與遍歷順序無關,新增任何一個匯入點都會現形。
 */
const scanFrom = (
  entry: string,
): { prismaImporters: string[]; visited: string[] } => {
  const found = new Set<string>();
  const seen = new Set<string>();

  const walk = (file: string): void => {
    if (seen.has(file)) return;
    seen.add(file);

    const source = fs.readFileSync(file, "utf8");
    if (importsPrisma(source)) {
      found.add(path.relative(ROOT, file));
    }

    for (const spec of runtimeDependencies(source)) {
      const dependency = resolveModule(spec, file);
      if (dependency) walk(dependency);
    }
  };

  walk(entry);
  return {
    prismaImporters: [...found].sort(),
    visited: [...seen].map((file) => path.relative(ROOT, file)),
  };
};

const prismaImportersFrom = (entry: string): string[] =>
  scanFrom(entry).prismaImporters;

/**
 * Info: (20260914 - Luphia) 掃描器空轉時 `toEqual([])` 也是綠的（review 三輪需修-6）。
 * 所以每個「乾淨」斷言旁邊都要有**下界**：走訪真的到達了服務圖。
 * `mission.executor.service` 是兩個運算入口都必經的節點；模組數的下界取實測
 *（executor 入口 241、compute 入口 248）的一半，圖縮水一半是需要有人知道的事。
 */
const EXECUTOR_GRAPH_MUST_INCLUDE = "src/services/mission.executor.service.ts";
const MIN_COMPUTE_GRAPH_MODULES = 120;

// Info: (20260812 - Luphia) 去掉註解再比對 —— 註解裡提到檔名不算依賴（這條踩過三次）
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

/**
 * Info: (20260915 - Luphia) 運算圖裡 `new ChatService(` 的**上界**（checklist §1.15，
 * 自我 review 抓到的缺口）。`worker_node_boundary` 釘了三支解析函式的注入形狀
 *（下界），但第四個 skill 自建一個 `new ChatService()`——預設 `allowSystemSettings:
 * true`，第一次要金鑰就動態載入 system_setting → prisma → 守門拋錯，被 per-item
 * catch 吞掉——那三條照綠。這裡走遍運算圖，列出每一處**不是**「可注入預設參數」
 * 形式的建構，斷言只剩 executor 那一處（它帶 `allowSystemSettings: false`）。
 * 註解先剝掉：chat.service 與兩支 route 服務的註解裡都寫著這個字串。
 */
const INJECTABLE_CHAT_SERVICE_DEFAULT =
  "chatService: ChatService = new ChatService(),";
const chatServiceConstructionsFrom = (entry: string): string[] => {
  const found: string[] = [];
  for (const rel of scanFrom(entry).visited) {
    const source = stripComments(fs.readFileSync(path.join(ROOT, rel), "utf8"));
    // Info: (20260915 - Luphia) 記檔名不記行號：行號隨註解增減漂移，檔名才是身分
    source.split("\n").forEach((line) => {
      if (!line.includes("new ChatService(")) return;
      if (line.trim() === INJECTABLE_CHAT_SERVICE_DEFAULT) return;
      found.push(rel);
    });
  }
  return found.sort();
};

describe("worker node isolation", () => {
  /**
   * Info: (20260907 - Luphia) 外部運算節點的匯入圖裡**沒有任何** prisma 匯入點
   *（原「已知清單」在係數字典改走 mission 快照後歸零）。
   * 任何新增的耦合都會在這裡現形——修法不是把它加進清單，
   * 是走發包端嵌入（見 `lib/worker/coefficient_snapshot` 檔頭）或搬去維運節點。
   */
  it("should keep the compute node free of database coupling", () => {
    const scan = scanFrom(path.join(ROOT, "scripts/run_compute_node.ts"));
    expect(scan.prismaImporters).toEqual(KNOWN_DB_COUPLING);
    expect(scan.visited).toContain(EXECUTOR_GRAPH_MUST_INCLUDE);
    expect(scan.visited.length).toBeGreaterThan(MIN_COMPUTE_GRAPH_MODULES);
  });

  /**
   * Info: (20260812 - Luphia) 單一 Executor 入口（`run_executor.ts` 併發啟動的那支）
   * 必須完全乾淨 —— 它是最貼近文件所述「外部節點」的形態。
   *
   * Info: (20260914 - Luphia) 這條從 8/12 到三輪 review 之前是**恆真**的：入口用
   * 相對路徑匯入，舊解析器不跟，走訪只到兩個常數模組。下界斷言讓它不能再空轉。
   */
  it("should keep the single-executor entry free of the database", () => {
    const scan = scanFrom(path.join(ROOT, "scripts/executor_worker.ts"));
    expect(scan.prismaImporters).toEqual([]);
    expect(scan.visited).toContain(EXECUTOR_GRAPH_MUST_INCLUDE);
    expect(scan.visited.length).toBeGreaterThan(MIN_COMPUTE_GRAPH_MODULES);
  });

  // Info: (20260914 - Luphia) 解析器對相對路徑的行為直接測，不靠入口剛好用哪種寫法
  it("should follow relative imports as well as @/ aliases", () => {
    const fromScripts = path.join(ROOT, "scripts/executor_worker.ts");
    expect(resolveModule("../src/lib/worker/shutdown", fromScripts)).toBe(
      path.join(ROOT, "src/lib/worker/shutdown.ts"),
    );
    expect(resolveModule("@/lib/worker/shutdown", fromScripts)).toBe(
      path.join(ROOT, "src/lib/worker/shutdown.ts"),
    );
    expect(resolveModule("viem", fromScripts)).toBeNull();
    expect(
      runtimeDependencies(
        [
          'import "./boot";',
          'import { a } from "../src/a";',
          'import "./b";',
          'import type { T } from "../src/t";',
          'export type { U } from "./u";',
          'import {\n  c,\n  d,\n} from "@/c";',
          'export * from "./e";',
          'import f, { g } from "./f";',
          'export const NOT_AN_IMPORT = "from";',
        ].join("\n"),
      ),
    ).toEqual(["./boot", "../src/a", "./b", "@/c", "./e", "./f"]);
  });

  /**
   * Info: (20260914 - Luphia) 啟動邊界必須是兩個入口的**第一個**執行期匯入
   *（review 三輪需修-7）：ESM 依匯入順序求值，只有排第一才能保證角色旗標、
   * 抹除、`.env.worker` 都發生在服務圖之前。寫在入口檔語句裡的版本，
   * 是在整個圖載完之後才跑。
   */
  it("should load the compute-node bootstrap before any service module", () => {
    ["scripts/run_compute_node.ts", "scripts/executor_worker.ts"].forEach(
      (entry) => {
        const source = fs.readFileSync(path.join(ROOT, entry), "utf8");
        expect(runtimeDependencies(source)[0]).toBe(
          "@/lib/worker/compute_node_bootstrap",
        );
      },
    );
  });

  /**
   * Info: (20260812 - Luphia) 反向也釘住:維運節點**應該**碰資料庫。
   * 若哪天它變乾淨了，代表寫庫的任務被搬走了 —— 那是需要有人知道的事，
   * 不該是靜默的（訂單追蹤、錢包勾稽、訂閱續約停擺不會有錯誤訊息）。
   */
  it("should keep the ops node connected to the database", () => {
    expect(
      prismaImportersFrom(path.join(ROOT, "scripts/run_ops_node.ts")).length,
    ).toBeGreaterThan(0);
  });

  /**
   * Info: (20260915 - Luphia) 上界：運算圖裡自建 ChatService 的只能是 executor 那一處。
   * `toEqual` 精確比對——多一處（新 skill 自建）或少一處（executor 改掉了）都紅。
   * 新增合法的建構點時請一併更新，並說明它為什麼帶 `allowSystemSettings: false`。
   */
  it("should construct ChatService only in the executor within the compute graph", () => {
    ["scripts/run_compute_node.ts", "scripts/executor_worker.ts"].forEach(
      (entry) => {
        expect(chatServiceConstructionsFrom(path.join(ROOT, entry))).toEqual([
          "src/services/mission.executor.service.ts",
        ]);
      },
    );
  });

  // Info: (20260812 - Luphia) 節點入口不得互相匯入 —— 拆分若被一行 import 接回去就白拆了
  it("should keep the two node entries independent", () => {
    const compute = stripComments(
      fs.readFileSync(path.join(ROOT, "scripts/run_compute_node.ts"), "utf8"),
    );
    const ops = stripComments(
      fs.readFileSync(path.join(ROOT, "scripts/run_ops_node.ts"), "utf8"),
    );
    expect(compute).not.toContain("run_ops_node");
    expect(ops).not.toContain("run_compute_node");
  });
});
