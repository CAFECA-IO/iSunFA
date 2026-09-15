import { describe, it, expect, afterEach } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
  missingRequiredComputeEnv,
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
  ENV_PATH,
  ENV_SETUP_PATH,
  ENV_WORKER_PATH,
  selectPriorityEnvPath,
} from "@/services/env.service";
import {
  COMPUTE_NODE_REQUIRED_ENV_KEYS,
  MISSION_GIVE_UP_REJECTION_THRESHOLD,
  WORKER_NODE_ROLE,
  WORKER_NODE_ROLE_ENV,
} from "@/constants/worker_node";
import {
  parseMultipleRoutesFromText,
  parseSmartInput,
} from "@/services/route.smart.service";
import { parseWaypointsToCoordinates } from "@/services/route.waypoints.service";
import type { ChatService } from "@/services/chat.service";
import { mapWithConcurrency } from "@/lib/worker/concurrency";

/**
 * Info: (20260914 - Luphia) 運算節點邊界的守門（PR #6650 review 阻-1／阻-3／
 * 需修-6／需修-8，三輪阻-2／阻-3／需修-4／需修-7／建議-9）。
 *
 * 判斷全部收斂成純函式直接測（`node_env`、`mission_board_verdict`、
 * `selectPriorityEnvPath`），進入點只剩「把結果變成 exit(1)」——那一段以掃描
 * 釘接線（checklist §1.11 的做法欄）。`lib/prisma` 的角色旗標守門是**執行期行為**：
 * 在隔離的模組空間裡真的載一次，斷言它在建池前拋錯。
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("運算節點抹掉繼承的信任根（需修-8）", () => {
  it("明列鍵與 SUPER_ADMIN_ 前綴都抹掉，其餘保留", () => {
    const env: Record<string, string | undefined> = {
      PATH: "/usr/bin",
      DATABASE_URL: "postgres://x",
      SECRET_VAULT_MASTER_KEY: "k",
      DEWT_PRIVATE_KEY_PEM: "pem",
      SUPER_ADMIN_PUB_X: "1",
      SUPER_ADMIN_PUB_Y: "2",
      // Info: (20260915 - Luphia) 四輪建議-10：.env.example 出貨的其他祕密也要抹
      POSTGRES_PASSWORD: "pw",
      SMTP_PASSWORD: "smtp",
      OEN_ACCESS_TOKEN: "oen",
      GOOGLE_OAUTH_CLIENT_SECRET: "oauth",
      HR_PII_KEY_V1: "hr1",
      HR_PII_KEY_V2: "hr2",
      GEMINI_API_KEY: "g",
    };
    const removed = scrubForbiddenComputeEnv(env);
    expect(removed).toEqual([
      "DATABASE_URL",
      "DEWT_PRIVATE_KEY_PEM",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "HR_PII_KEY_V1",
      "HR_PII_KEY_V2",
      "OEN_ACCESS_TOKEN",
      "POSTGRES_PASSWORD",
      "SECRET_VAULT_MASTER_KEY",
      "SMTP_PASSWORD",
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

describe("必要鍵判值不判鍵（三輪需修-4）", () => {
  const filled = Object.fromEntries(
    COMPUTE_NODE_REQUIRED_ENV_KEYS.map((key) => [key, `value-of-${key}`]),
  );

  it("全部有值 → 沒有缺席", () => {
    expect(missingRequiredComputeEnv(filled)).toEqual([]);
  });

  it("鍵在、值空或只有空白 → 算缺席（cp .env.worker.example 的形狀）", () => {
    expect(
      missingRequiredComputeEnv({
        ...filled,
        NEXT_PUBLIC_RPC_URL: "   ",
        STORAGE_DOMAIN: "",
      }),
    ).toEqual(["NEXT_PUBLIC_RPC_URL", "STORAGE_DOMAIN"]);
  });

  it("鍵不在 → 缺席", () => {
    expect(missingRequiredComputeEnv({})).toEqual([
      ...COMPUTE_NODE_REQUIRED_ENV_KEYS,
    ]);
  });

  it("有預設值的鍵不在必要清單裡", () => {
    expect(COMPUTE_NODE_REQUIRED_ENV_KEYS).not.toContain("MISSION_DIR");
    expect(COMPUTE_NODE_REQUIRED_ENV_KEYS).not.toContain("MODEL");
  });

  /**
   * Info: (20260915 - Luphia) ADR 026 決策：`GEMINI_API_KEY` 選填（PRECOMPUTED 任務
   * 不用 LLM）；`STORAGE_DOMAIN` 必要（四輪建議-8：唯一跨界通道，缺了第一個任務
   * 就卡死全站）。精確比對——多一個少一個都要有人知道。
   */
  it("必要鍵是兩個鏈上座標加 IPFS 網域，不含 LLM 金鑰", () => {
    expect([...COMPUTE_NODE_REQUIRED_ENV_KEYS]).toEqual([
      "NEXT_PUBLIC_RPC_URL",
      "NEXT_PUBLIC_MISSION_BOARD_ADDRESS",
      "STORAGE_DOMAIN",
    ]);
  });
});

describe("mapWithConcurrency（四輪建議-6）", () => {
  it("結果依輸入順序、單筆失敗不影響其他筆", async () => {
    const results = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => {
      if (n === 3) throw new Error("boom");
      return n * 10;
    });
    expect(results).toEqual([
      { status: "fulfilled", value: 10 },
      { status: "fulfilled", value: 20 },
      { status: "rejected", reason: new Error("boom") },
      { status: "fulfilled", value: 40 },
    ]);
  });

  it("同時在飛的數量不超過上限", async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(
      Array.from({ length: 9 }, (_, i) => i),
      3,
      async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
      },
    );
    expect(peak).toBe(3);
  });

  it("上限 ≤ 0 視為 1（序列），空輸入回空陣列", async () => {
    let peak = 0;
    let inFlight = 0;
    await mapWithConcurrency([1, 2, 3], 0, async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
    });
    expect(peak).toBe(1);
    expect(await mapWithConcurrency([], 5, async () => 1)).toEqual([]);
  });
});

describe("getPriorityEnvConfig 依節點角色解析（三輪阻-3）", () => {
  const all = () => true;
  const only =
    (...paths: string[]) =>
    (p: string) =>
      paths.includes(p);

  it("compute 角色：系統 .env 與 .env.setup 都在，仍只看 .env.worker", () => {
    expect(selectPriorityEnvPath(WORKER_NODE_ROLE.COMPUTE, all)).toBe(
      ENV_WORKER_PATH,
    );
  });

  it("compute 角色：沒有 .env.worker 就是 null，不落回系統 .env", () => {
    expect(
      selectPriorityEnvPath(
        WORKER_NODE_ROLE.COMPUTE,
        only(ENV_PATH, ENV_SETUP_PATH),
      ),
    ).toBeNull();
  });

  it("非 compute（web／ops／精靈）：.env.setup → .env，永不讀 .env.worker", () => {
    expect(selectPriorityEnvPath(undefined, all)).toBe(ENV_SETUP_PATH);
    expect(
      selectPriorityEnvPath(undefined, only(ENV_PATH, ENV_WORKER_PATH)),
    ).toBe(ENV_PATH);
    expect(
      selectPriorityEnvPath(WORKER_NODE_ROLE.OPS, only(ENV_WORKER_PATH)),
    ).toBeNull();
    expect(selectPriorityEnvPath(undefined, only(ENV_WORKER_PATH))).toBeNull();
  });
});

/**
 * Info: (20260915 - Luphia) 注入的**行為**證據（checklist §1.7，自我 review 抓到的缺口）：
 * 下方接線測試只用字串掃描證明「參數有傳」，而函式內若再 `new ChatService()` 蓋掉
 * 參數，掃描照綠。這裡真的傳一個替身進去，斷言 LLM 呼叫落在**它**身上、回傳是
 * 它給的內容解析出來的——替身沒被呼叫就代表函式用了別的實例。
 * 三支各一條；替身只實作 `generateRaw`（三支只用這一支）。
 */
describe("三支解析函式真的使用注入的 chatService（三輪阻-2，行為）", () => {
  const fakeChat = (reply: string) => {
    const calls: string[] = [];
    const chatService = {
      generateRaw: async (prompt: string) => {
        calls.push(prompt);
        return reply;
      },
    } as unknown as ChatService;
    return { chatService, calls };
  };

  it("parseSmartInput：origin／dest 來自替身的回覆", async () => {
    const { chatService, calls } = fakeChat(
      '{"origin":{"lat":25.03,"lng":121.56},"dest":{"lat":35.68,"lng":139.69},"weightKg":500}',
    );
    const parsed = await parseSmartInput(
      "Taipei to Tokyo, 500 kg",
      chatService,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("Taipei to Tokyo, 500 kg");
    expect(parsed).toEqual({
      origin: { lat: 25.03, lng: 121.56 },
      dest: { lat: 35.68, lng: 139.69 },
      weightKg: 500,
    });
  });

  it("parseMultipleRoutesFromText：路線陣列來自替身、含 ```json 圍欄也剝得掉", async () => {
    const { chatService, calls } = fakeChat(
      '```json\n[{"origin":"Taipei","dest":"Kaohsiung","weightKg":12}]\n```',
    );
    const routes = await parseMultipleRoutesFromText("two cities", chatService);
    expect(calls).toHaveLength(1);
    expect(routes).toEqual([
      { origin: "Taipei", dest: "Kaohsiung", weightKg: 12 },
    ]);
  });

  it("parseWaypointsToCoordinates：航點來自替身；空字串不問 LLM", async () => {
    const { chatService, calls } = fakeChat(
      '[{"name":"Singapore","lat":1.29,"lng":103.85}]',
    );
    expect(await parseWaypointsToCoordinates("   ", chatService)).toEqual([]);
    expect(calls).toHaveLength(0);
    const waypoints = await parseWaypointsToCoordinates(
      "Singapore",
      chatService,
    );
    expect(calls).toHaveLength(1);
    expect(waypoints).toEqual([{ name: "Singapore", lat: 1.29, lng: 103.85 }]);
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

  /**
   * Info: (20260914 - Luphia) 未達門檻就不讀第二次（三輪建議-9）：count 0～2 的
   * 在途任務佔絕大多數，每個都省一次 round trip。
   */
  it.each([0n, 1n, 2n])(
    "submissionCount=%s 未達門檻：只讀一次、恆為未放棄",
    async (count) => {
      let reads = 0;
      const read: MissionBoardReader = async () => {
        reads += 1;
        return ["0xc", "cid", 1n, 0n, 0n, 0, count];
      };
      expect(await readGiveUpVerdict(read, 1n)).toBe(false);
      expect(reads).toBe(1);
    },
  );

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
  /**
   * Info: (20260914 - Luphia) 啟動邊界收斂在一個副作用模組（三輪需修-7）。
   * 這裡釘它**做的事與順序**：旗標 → 抹 shell 信任根 → 缺檔退出 → 解析檔案 →
   * 抹檔內信任根 → 缺值退出 → 檔案值寫進 process.env。「它是入口的第一個 import」由
   * `worker_node_isolation.test.ts` 用同一支依賴解析釘住。
   *
   * Info: (20260915 - Luphia) 四輪阻-1：抹除與缺值檢查的對象是**解析結果**
   *（`workerFile`），不是 `process.env`——消費端讀檔，查合併後的環境會被 shell 掩護。
   * 所以這裡釘 `scrubForbiddenComputeEnv(workerFile)`／`missingRequiredComputeEnv(workerFile)`，
   * 並釘「沒有任何一處對 `process.env` 做缺值檢查」。
   */
  it("compute_node_bootstrap：旗標、抹 shell、缺檔退出、解析檔案、抹檔內、缺值退出、寫入，依序", () => {
    const boot = read("src/lib/worker/compute_node_bootstrap.ts");
    const flagAt = boot.indexOf(
      "process.env[WORKER_NODE_ROLE_ENV] = WORKER_NODE_ROLE.COMPUTE;",
    );
    const scrubAt = boot.indexOf("scrubForbiddenComputeEnv(process.env)");
    const existsAt = boot.indexOf("if (!fs.existsSync(ENV_WORKER_PATH))");
    const parseAt = boot.indexOf(
      'dotenv.parse(fs.readFileSync(ENV_WORKER_PATH, "utf8"))',
    );
    const rescrubAt = boot.indexOf("scrubForbiddenComputeEnv(workerFile)");
    const missingAt = boot.indexOf("missingRequiredComputeEnv(workerFile)");
    const writeAt = boot.indexOf("process.env[key] = value;");
    expect(flagAt).toBeGreaterThan(-1);
    expect(scrubAt).toBeGreaterThan(flagAt);
    expect(existsAt).toBeGreaterThan(scrubAt);
    expect(parseAt).toBeGreaterThan(existsAt);
    expect(rescrubAt).toBeGreaterThan(parseAt);
    expect(missingAt).toBeGreaterThan(rescrubAt);
    expect(writeAt).toBeGreaterThan(missingAt);
    // Info: (20260915 - Luphia) 檔案是唯一真值：缺值檢查不得看 process.env；展開只看檔內鍵
    expect(boot).not.toContain("missingRequiredComputeEnv(process.env)");
    expect(boot).toContain("processEnv: {},");
    // Info: (20260914 - Luphia) 缺檔與缺值各自 exit(1)
    expect(boot.match(/process\.exit\(1\)/g)?.length).toBe(2);
    // Info: (20260914 - Luphia) 不走 env.service 的解析器、不走 dotenv.config（不覆寫既有鍵＝shell 贏）——註解剝掉再比，註解裡有提到它們
    const bootCode = boot.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    expect(bootCode).not.toContain("loadWorkerEnvConfig");
    expect(bootCode).not.toContain("dotenv.config(");
  });

  it("兩個入口不再自己設旗標／載檔——那些只在 bootstrap 裡", () => {
    ["scripts/run_compute_node.ts", "scripts/executor_worker.ts"].forEach(
      (entry) => {
        const source = read(entry);
        expect(source).toContain(
          'import "@/lib/worker/compute_node_bootstrap";',
        );
        expect(source).not.toContain("WORKER_NODE_ROLE.COMPUTE;");
        expect(source).not.toContain("dotenv.config(");
        expect(source).not.toContain("scrubForbiddenComputeEnv(");
        expect(source).not.toContain("resolveMissionDirMismatch");
      },
    );
  });

  it("run_executor 以完整 env spawn（抹除因此必須在子行程內做）", () => {
    const runner = read("scripts/run_executor.ts");
    expect(runner).toContain("env: { ...process.env }");
  });

  it("getPriorityEnvConfig 走 selectPriorityEnvPath，沒有第二條解析路徑", () => {
    const env = read("src/services/env.service.ts");
    const fn = env.slice(
      env.indexOf("export async function getPriorityEnvConfig"),
    );
    expect(fn).toContain(
      "selectPriorityEnvPath(\n    process.env[WORKER_NODE_ROLE_ENV],\n    fs.existsSync,\n  )",
    );
    // Info: (20260914 - Luphia) 第一版的第三順位 fallback（會讓安裝精靈讀到 worker 檔）已移除
    expect(fn).not.toMatch(/fs\.existsSync\(ENV_WORKER_PATH\)\s*\?/);
  });

  it(".env.worker.example 帶齊必要鍵與有預設值的鍵", () => {
    const example = read(".env.worker.example");
    [
      ...COMPUTE_NODE_REQUIRED_ENV_KEYS,
      "GEMINI_API_KEY",
      "MISSION_DIR",
      "MODEL",
    ].forEach((key) => expect(example).toMatch(new RegExp(`^${key}=`, "m")));
  });

  /**
   * Info: (20260914 - Luphia) 運輸 skill 的**三條** LLM 路徑都帶 executor 的
   * ChatService（阻-3／三輪阻-2）：第一版只帶了 `parseMultipleRoutesFromText`。
   * 三支解析函式都以「可注入、預設自建」的形狀存在；`route.service` 兩個入口
   * 把它往下穿。
   */
  it("route.smart／route.waypoints 三支解析函式都可注入 chatService", () => {
    const smart = read("src/services/route.smart.service.ts");
    expect(
      smart.match(/chatService: ChatService = new ChatService\(\),/g),
    ).toHaveLength(2);
    expect(smart).not.toMatch(/^\s*const chatService = new ChatService\(\);/m);
    const waypoints = read("src/services/route.waypoints.service.ts");
    expect(waypoints).toContain(
      "chatService: ChatService = new ChatService(),",
    );
    expect(waypoints).not.toMatch(
      /^\s*const chatService = new ChatService\(\);/m,
    );
  });

  /**
   * Info: (20260914 - Luphia) 只釘 skill 走得到的兩個入口（`calculateLogisticsPlan`、
   * `calculateLogisticsPlanFromText`）。`calculateMileageFromStrings` 等 web 專用
   * 函式仍自建 ChatService——它們不在運算節點的呼叫路徑上，web 有 DB。
   */
  it("route.service 兩個入口把 chatService 穿到 parseSmartInput 與 parseWaypointsToCoordinates", () => {
    const route = read("src/services/route.service.ts");
    const fromTextAt = route.indexOf(
      "export async function calculateLogisticsPlanFromText(",
    );
    const nextFnAt = route.indexOf("export async function", fromTextAt + 1);
    const fromText = route.slice(fromTextAt, nextFnAt);
    expect(fromText).toContain("parseSmartInput(text, chatService)");
    expect(fromText).not.toMatch(/parseSmartInput\(text\)/);
    // Info: (20260914 - Luphia) FromText 再把它交給 calculateLogisticsPlan（waypoints 那條）
    expect(fromText).toContain("waypointsDesc,\n    chatService,\n  );");
    expect(route).toContain(
      "parseWaypointsToCoordinates(waypointsDesc, chatService)",
    );
    expect(route).not.toMatch(/parseWaypointsToCoordinates\(waypointsDesc\)/);
  });

  it("skill 對三條路徑都傳 chatService", () => {
    const skill = read(
      "src/skills/document/transportation_carbon_footprint_evaluation.ts",
    );
    expect(skill).toContain("parseMultipleRoutesFromText(text, chatService)");
    // Info: (20260914 - Luphia) 兩個 calculateLogistics* 呼叫的最後一個參數都是 chatService
    expect(
      skill.match(/item\.waypoints,\n\s+chatService,\n\s+\);/g),
    ).toHaveLength(2);
  });

  it("recorder 先查 recorded.flag 再讀鏈，reader 一輪共用（需修-6／三輪建議-9）", () => {
    const recorder = read("src/services/issue.recorder.service.ts");
    /**
     * Info: (20260915 - Luphia) 三段各守一件事（四輪建議-6 之後的形狀）：
     * - 掃描迴圈只做本地便宜檢查（`isGiveUpCandidate` 內查 `recorded.flag`），
     *   鏈讀集中在迴圈之後的 `resolveFirstGivenUp`——所以 `isGiveUpCandidate({`
     *   的呼叫在 `resolveFirstGivenUp({` 之前；
     * - `resolveFirstGivenUp` 以 `mapWithConcurrency` 讀鏈，不用 viem batch
     *  （序列 await 合不了批、拒批 provider 每次都拋）；
     * - `recordGiveUp` 本身不再讀鏈、不建 client。
     */
    const scanAt = recorder.indexOf("async processNext()");
    const candidateCallAt = recorder.indexOf("isGiveUpCandidate({", scanAt);
    const resolveCallAt = recorder.indexOf("resolveFirstGivenUp({", scanAt);
    expect(candidateCallAt).toBeGreaterThan(scanAt);
    expect(resolveCallAt).toBeGreaterThan(candidateCallAt);

    const candidateFn = recorder.slice(
      recorder.indexOf("private async isGiveUpCandidate("),
      recorder.indexOf("private async resolveFirstGivenUp("),
    );
    expect(candidateFn).toContain('"recorded.flag"');
    expect(candidateFn).not.toContain("readGiveUpVerdict(");

    const resolveFn = recorder.slice(
      recorder.indexOf("private async resolveFirstGivenUp("),
      recorder.indexOf("private async recordGiveUp("),
    );
    expect(resolveFn).toContain(
      "mapWithConcurrency(\n      params.candidates,\n      MISSION_VERDICT_READ_CONCURRENCY,",
    );
    expect(resolveFn).toContain("readGiveUpVerdict(");

    const recordFn = recorder.slice(
      recorder.indexOf("private async recordGiveUp("),
    );
    expect(recordFn).not.toContain("readGiveUpVerdict(");
    expect(recordFn).not.toContain("createPublicClient(");
    // Info: (20260915 - Luphia) 註解裡會提到它——剝掉註解再比
    expect(recorder.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")).not.toContain(
      "batch: true",
    );
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
