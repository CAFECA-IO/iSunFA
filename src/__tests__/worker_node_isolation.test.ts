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

const resolveModule = (spec: string): string | null => {
  if (!spec.startsWith("@/")) return null;
  const base = path.join(ROOT, "src", spec.slice(2));
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
  const pattern =
    /^\s*(?:import|export)\s+(type\s+)?([\s\S]*?)from\s+"(@\/[^"]+)"/gm;
  for (const match of source.matchAll(pattern)) {
    if (match[1]) continue;
    specs.push(match[3]);
  }
  return specs;
};

/**
 * Info: (20260812 - Luphia) 蒐集**所有**可達的 prisma 匯入點，不是只找第一條路徑。
 *
 * 只回傳第一條路徑的話,新增一條耦合可能被舊路徑遮住 —— 掃描器先找到舊的就停了。
 * 集合比對與遍歷順序無關,新增任何一個匯入點都會現形。
 */
const prismaImportersFrom = (entry: string): string[] => {
  const found = new Set<string>();
  const seen = new Set<string>();

  const walk = (file: string): void => {
    if (seen.has(file)) return;
    seen.add(file);

    const source = fs.readFileSync(file, "utf8");
    if (/^\s*import\s+\{[^}]*\}\s+from\s+"@\/lib\/prisma"/m.test(source)) {
      found.add(path.relative(ROOT, file));
    }

    for (const spec of runtimeDependencies(source)) {
      const dependency = resolveModule(spec);
      if (dependency) walk(dependency);
    }
  };

  walk(entry);
  return [...found].sort();
};

// Info: (20260812 - Luphia) 去掉註解再比對 —— 註解裡提到檔名不算依賴（這條踩過三次）
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

describe("worker node isolation", () => {
  /**
   * Info: (20260907 - Luphia) 外部運算節點的匯入圖裡**沒有任何** prisma 匯入點
   *（原「已知清單」在係數字典改走 mission 快照後歸零）。
   * 任何新增的耦合都會在這裡現形——修法不是把它加進清單，
   * 是走發包端嵌入（見 `lib/worker/coefficient_snapshot` 檔頭）或搬去維運節點。
   */
  it("should keep the compute node free of database coupling", () => {
    expect(
      prismaImportersFrom(path.join(ROOT, "scripts/run_compute_node.ts")),
    ).toEqual(KNOWN_DB_COUPLING);
  });

  /**
   * Info: (20260812 - Luphia) 單一 Executor 入口（`run_executor.ts` 併發啟動的那支）
   * 必須完全乾淨 —— 它是最貼近文件所述「外部節點」的形態。
   */
  it("should keep the single-executor entry free of the database", () => {
    expect(
      prismaImportersFrom(path.join(ROOT, "scripts/executor_worker.ts")),
    ).toEqual([]);
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
