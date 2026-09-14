import { describe, it, expect, afterEach } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
  resolveMissionDirMismatch,
  scrubForbiddenComputeEnv,
} from "@/lib/worker/node_env";
import {
  isTaskGivenUp,
  readGiveUpVerdict,
  viemMissionBoardReader,
  MISSION_BOARD_READ_ABI,
  type MissionBoardReader,
} from "@/lib/worker/mission_board_verdict";
import {
  DEFAULT_MISSION_DIR,
  MISSION_GIVE_UP_REJECTION_THRESHOLD,
  WORKER_NODE_ROLE,
  WORKER_NODE_ROLE_ENV,
} from "@/constants/worker_node";

/**
 * Info: (20260914 - Luphia) 運算節點邊界的三層守門（PR #6650 review 阻-1／阻-3／
 * 需修-6／需修-7／需修-8）。
 *
 * 判斷全部收斂成純函式直接測（`node_env`、`mission_board_verdict`），進入點只剩
 * 「把結果變成 exit(1)」——那一段以掃描釘接線（checklist §1.11 的做法欄）。
 * `lib/prisma` 的角色旗標守門是**執行期行為**：在隔離的模組空間裡真的載一次，
 * 斷言它在建池前拋錯。
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("MISSION_DIR 兩個來源的一致性（需修-7）", () => {
  it("兩邊都缺席＝同一個預設值，不算分岔", () => {
    expect(resolveMissionDirMismatch({}, {})).toBeNull();
  });

  it("一邊明寫預設值、一邊缺席，不算分岔", () => {
    expect(
      resolveMissionDirMismatch({ MISSION_DIR: DEFAULT_MISSION_DIR }, {}),
    ).toBeNull();
  });

  it("兩邊值不同就是分岔，回報雙方", () => {
    expect(
      resolveMissionDirMismatch(
        { MISSION_DIR: "worker_missions" },
        { MISSION_DIR: "missions" },
      ),
    ).toEqual({ worker: "worker_missions", priority: "missions" });
  });
});

describe("運算節點抹掉繼承的信任根（需修-8）", () => {
  it("明列鍵與 SUPER_ADMIN_ 前綴都抹掉，其餘保留", () => {
    const env: Record<string, string | undefined> = {
      PATH: "/usr/bin",
      DATABASE_URL: "postgres://x",
      SECRET_VAULT_MASTER_KEY: "k",
      DEWT_PRIVATE_KEY_PEM: "pem",
      SUPER_ADMIN_PUB_X: "1",
      SUPER_ADMIN_PUB_Y: "2",
      GEMINI_API_KEY: "g",
    };
    const removed = scrubForbiddenComputeEnv(env);
    expect(removed).toEqual([
      "DATABASE_URL",
      "DEWT_PRIVATE_KEY_PEM",
      "SECRET_VAULT_MASTER_KEY",
      "SUPER_ADMIN_PUB_X",
      "SUPER_ADMIN_PUB_Y",
    ]);
    expect(Object.keys(env).sort()).toEqual(["GEMINI_API_KEY", "PATH"]);
  });

  it("沒有可疑鍵時回空清單、不動任何東西", () => {
    const env: Record<string, string | undefined> = { PATH: "/usr/bin" };
    expect(scrubForbiddenComputeEnv(env)).toEqual([]);
    expect(env).toEqual({ PATH: "/usr/bin" });
  });
});

describe("放棄任務的唯一判準（需修-6）", () => {
  it.each([
    [0n, false, false],
    [2n, true, false],
    [3n, false, false],
    [3n, true, true],
    [7n, true, true],
  ])(
    "submissionCount=%s latestRejected=%s → givenUp=%s",
    (count, rejected, expected) => {
      expect(isTaskGivenUp(count, rejected)).toBe(expected);
    },
  );

  it("門檻常數就是 3（改它要同時改 closer 與 recorder 的預期）", () => {
    expect(MISSION_GIVE_UP_REJECTION_THRESHOLD).toBe(3);
  });

  /**
   * Info: (20260914 - Luphia) 以替身用戶端走完 `readGiveUpVerdict` 的兩次讀鏈：
   * 第二次讀的是**最後一筆**提交（index = count − 1）。
   */
  it("readGiveUpVerdict 讀 tasks 再讀最後一筆提交", async () => {
    const calls: Array<{ functionName: string; args: readonly bigint[] }> = [];
    const read: MissionBoardReader = async (functionName, args) => {
      calls.push({ functionName, args });
      if (functionName === "tasks") return ["0xc", "cid", 1n, 0n, 0n, 1, 3n];
      return ["0xs", "rcid", 0n, true, 0n];
    };
    expect(await readGiveUpVerdict(read, 42n)).toBe(true);
    expect(calls).toEqual([
      { functionName: "tasks", args: [42n] },
      { functionName: "taskSubmissions", args: [42n, 2n] },
    ]);
  });

  it("沒有任何提交時不讀第二次、恆為未放棄", async () => {
    let reads = 0;
    const read: MissionBoardReader = async () => {
      reads += 1;
      return ["0xc", "cid", 1n, 0n, 0n, 0, 0n];
    };
    expect(await readGiveUpVerdict(read, 1n)).toBe(false);
    expect(reads).toBe(1);
  });

  /**
   * Info: (20260914 - Luphia) 生產端的包裝把 viem 的 `readContract` 接成 reader：
   * 兩個 view 函式各帶正確的 address／abi／參數 tuple。這裡的替身只認形狀。
   */
  it("viemMissionBoardReader 把兩個 view 函式接成同一份 ABI 的呼叫", async () => {
    const seen: unknown[] = [];
    const fakeClient = {
      readContract: (async (args: unknown) => {
        seen.push(args);
        return [];
      }) as unknown as Parameters<
        typeof viemMissionBoardReader
      >[0]["readContract"],
    };
    const read = viemMissionBoardReader(fakeClient, "0xabc");
    await read("tasks", [7n]);
    await read("taskSubmissions", [7n, 1n]);
    expect(seen).toEqual([
      {
        address: "0xabc",
        abi: MISSION_BOARD_READ_ABI,
        functionName: "tasks",
        args: [7n],
      },
      {
        address: "0xabc",
        abi: MISSION_BOARD_READ_ABI,
        functionName: "taskSubmissions",
        args: [7n, 1n],
      },
    ]);
  });
});

describe("lib/prisma 的節點角色守門（阻-3，執行期）", () => {
  const original = process.env[WORKER_NODE_ROLE_ENV];
  afterEach(() => {
    if (original === undefined) delete process.env[WORKER_NODE_ROLE_ENV];
    else process.env[WORKER_NODE_ROLE_ENV] = original;
  });

  /**
   * Info: (20260914 - Luphia) 真的在隔離模組空間載一次：旗標為 compute 時
   * 模組頂層在 `new Pool()` 之前拋錯。這不是掃描——是那條動態路徑在
   * 運算節點上真正會撞到的行為。
   */
  it("旗標為 compute 時載入即拋錯", () => {
    process.env[WORKER_NODE_ROLE_ENV] = WORKER_NODE_ROLE.COMPUTE;
    jest.isolateModules(() => {
      // Info: (20260914 - Luphia) jest.requireActual 而非裸 require：同樣觸發模組頂層執行，且不需 eslint-disable
      expect(() => {
        jest.requireActual("@/lib/prisma");
      }).toThrow(/compute node must never load the database client/);
    });
  });
});

describe("接線（進入點與呼叫端）", () => {
  it("run_compute_node：設角色旗標、缺檔退出、抹信任根、檢查 MISSION_DIR", () => {
    const entry = read("scripts/run_compute_node.ts");
    expect(entry).toContain("WORKER_NODE_ROLE.COMPUTE");
    expect(entry).toContain("scrubForbiddenComputeEnv(process.env)");
    expect(entry).toContain("resolveMissionDirMismatch(");
    // Info: (20260914 - Luphia) 缺檔與分岔各自 exit(1)——兩處都要在
    expect(entry.match(/process\.exit\(1\)/g)?.length).toBeGreaterThanOrEqual(
      3,
    );
  });

  /**
   * Info: (20260914 - Luphia) executor_worker 三件都要在（review 二輪中-1）：
   * 旗標、抹除、缺檔退出。第一版只釘了旗標與退出，抹除漏在這支——而它由
   * `run_executor` 以 `env: { ...process.env }` spawn，是繼承 shell 最完整的那個。
   * 旗標改由常數設定（同一份真值），抹除要在 `dotenv.config` 之前。
   */
  it("executor_worker：旗標用常數、抹信任根在載 .env.worker 之前、缺檔退出", () => {
    const entry = read("scripts/executor_worker.ts");
    expect(entry).toContain(
      "process.env[WORKER_NODE_ROLE_ENV] = WORKER_NODE_ROLE.COMPUTE;",
    );
    const scrubAt = entry.indexOf("scrubForbiddenComputeEnv(process.env)");
    const loadAt = entry.indexOf("dotenv.config({ path: workerEnv })");
    expect(scrubAt).toBeGreaterThan(-1);
    expect(loadAt).toBeGreaterThan(scrubAt);
    expect(entry).toContain("process.exit(1);");
  });

  it("run_executor 以完整 env spawn（抹除因此必須在子行程內做）", () => {
    const runner = read("scripts/run_executor.ts");
    expect(runner).toContain("env: { ...process.env }");
  });

  it("getPriorityEnvConfig 第三順位 fallback 到 .env.worker（阻-1）", () => {
    const env = read("src/services/env.service.ts");
    const fn = env.slice(
      env.indexOf("export async function getPriorityEnvConfig"),
    );
    const setup = fn.indexOf("ENV_SETUP_PATH");
    const plain = fn.indexOf("ENV_PATH", setup + 1);
    const worker = fn.indexOf("ENV_WORKER_PATH");
    expect(setup).toBeGreaterThan(-1);
    expect(plain).toBeGreaterThan(setup);
    expect(worker).toBeGreaterThan(plain);
  });

  it(".env.worker.example 帶齊 planner／commitor／closer 要的鏈上座標（阻-1）", () => {
    const example = read(".env.worker.example");
    [
      "GEMINI_API_KEY",
      "MISSION_DIR",
      "NEXT_PUBLIC_RPC_URL",
      "NEXT_PUBLIC_MISSION_BOARD_ADDRESS",
    ].forEach((key) => expect(example).toMatch(new RegExp(`^${key}=`, "m")));
  });

  it("route.smart 接受注入的 chatService，skill 把 executor 的實例傳下去（阻-3）", () => {
    const smart = read("src/services/route.smart.service.ts");
    expect(smart).toContain("chatService: ChatService = new ChatService(),");
    const skill = read(
      "src/skills/document/transportation_carbon_footprint_evaluation.ts",
    );
    expect(skill).toContain("parseMultipleRoutesFromText(text, chatService)");
    expect(skill).not.toMatch(/parseMultipleRoutesFromText\(text\)/);
  });

  it("recorder 讀不到 giveup.md 時改從鏈上重推，closer 用同一支判準（需修-6）", () => {
    const recorder = read("src/services/issue.recorder.service.ts");
    expect(recorder).toContain("readGiveUpVerdict(");
    const closer = read("src/services/mission.closer.service.ts");
    expect(closer).toContain("isTaskGivenUp(submissionCount, isRejected)");
    expect(closer).not.toMatch(/submissionCount >= 3n/);
  });

  it("MISSION_DIR 預設值只有一個來源（需修-7）", () => {
    [
      "src/services/mission.planner.service.ts",
      "src/services/mission.commitor.service.ts",
      "src/services/mission.closer.service.ts",
      "src/services/mission.executor.service.ts",
      "src/services/issue.recorder.service.ts",
    ].forEach((file) => {
      const source = read(file);
      expect(source).toContain("DEFAULT_MISSION_DIR");
      expect(source).not.toMatch(/MISSION_DIR \|\| "missions"/);
    });
  });
});
