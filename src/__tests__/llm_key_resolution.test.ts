import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import fs from "fs";
import path from "path";
import { SearchService } from "@/services/search.service";
import { SearchChatService } from "@/services/search.chat.service";
import { CrawlerService } from "@/services/crawler.service";
import {
  isLlmKeyMissingError,
  isLlmTimeoutError,
} from "@/services/chat.service";
import {
  LLM_KEY_MISSING_ERROR_MARKER,
  LLM_TIMEOUT_ERROR_MARKER,
} from "@/constants/llm";
import {
  SystemSettingKey,
  SYSTEM_SETTING_DEFINITIONS,
  SYSTEM_SETTING_KEYS,
} from "@/constants/system_setting";
/**
 * Info: (20260812 - Luphia) 只匯入型別。
 * `import type` 不會綁到執行期模組，所以不會像值匯入那樣在 `jest.mock` 註冊前
 * 就把真實的 system_setting 綁進 chat.service（見檔頭 loadChatService 的理由）。
 */
import type { ChatService } from "@/services/chat.service";

/**
 * Info: (20260812 - Luphia) 只 mock 系統設定,不 mock ChatService 自己 ——
 * 要驗的正是它實際解析出哪一把金鑰。
 *
 * 取用時必須走 `loadChatService()` 的動態載入:靜態 `import` 會在 `jest.mock`
 * 註冊之前就把真實的 system_setting 模組綁進 chat.service,那個 mock 就形同不存在。
 * (實測過:靜態載入時「資料庫優先」那條測試拿到的是 env 的值 ——
 *  因為跑的是真的 `get()`,它在 EMPTY 狀態下本來就會去讀 env。)
 */
const settingValues = new Map<string, string>();

const settingGetCalls: string[] = [];

jest.mock("@/services/system_setting.service", () => ({
  systemSettingService: {
    get: async (key: string) => {
      settingGetCalls.push(key);
      return settingValues.get(key);
    },
  },
}));

const loadChatService = async () => {
  jest.resetModules();
  const loaded = await import("@/services/chat.service");
  return loaded.ChatService;
};

/**
 * Info: (20260812 - Luphia) 檔案層清乾淨，拿掉隱性的順序相依。
 * `settingValues` 是模組級 Map，原本只有其中一個 describe 會 clear()，
 * 另一個是靠「此前沒人 set 過」才成立 —— 那種相依在有人插入新測試時才會爆。
 */
beforeEach(() => {
  settingValues.clear();
  settingGetCalls.length = 0;
});

/**
 * Info: (20260812 - Luphia) 守住 LLM 金鑰的解析責任歸屬。
 *
 * `ChatService` 的優先序是「建構子明確傳入 > 資料庫設定 > 環境變數」。
 * 這個順序本身是對的 —— 呼叫端明確指定就該最高。壞掉的地方在於包裝它的人:
 * 六個服務都寫成 `new ChatService(apiKey || process.env.GEMINI_API_KEY || "")`,
 * 把**從 env 讀到的預設值**當成「呼叫端明確指定」送進去,於是資料庫那一層
 * 永遠輪不到。
 *
 * 後果不是效能而是正確性,而且是雙向的:
 * - 已把金鑰搬進 /admin/settings 的部署:輪替與**撤銷**對這些路徑無效,
 *   設定進入 UNTRUSTED 時 `get()` 會拒絕服務,這些路徑卻靜默照跑。
 * - env 不再保留金鑰的部署:提前擋下讓功能直接不可用,而金鑰明明設好了。
 *
 * 這個約定看不出來、CI 不會紅、只有在管理員輪替金鑰之後才發現「換了沒用」。
 * 所以把它變成測試,形式沿用 `env_example_contract.test.ts`。
 */

/**
 * Info: (20260812 - Luphia) 由設定定義推導，不寫死字串（`env_example_contract.test.ts` 同樣做法）。
 * `GOOGLE_API_KEY` 不在 `SystemSettingKey` 裡 —— 它是刻意移除的那個後門，
 * 留在掃描清單裡是為了確保沒有人把它加回來。
 */
const ENV_KEYS = [
  SYSTEM_SETTING_DEFINITIONS[SystemSettingKey.GEMINI_API_KEY].envKey,
  "GOOGLE_API_KEY",
] as const;

/**
 * Info: (20260812 - Luphia) 唯一允許直接讀環境變數的檔案。
 *
 * `ChatService.ensureClient()` 是**指定的解析點**:它先問資料庫,
 * 讀不到才落回環境變數,而且還多接一個不屬於系統設定的 `GOOGLE_API_KEY`。
 * 白名單只有一個成員是刻意的 —— 要新增就得先說明為什麼那個位置需要
 * 繞過三態語意(資料庫可信 / 驗簽失敗拒絕服務 / 從未用資料庫保管)。
 */
/**
 * Info: (20260812 - Luphia) 以**相對路徑**比對而不是 basename。
 * basename 比對會讓未來任何同名檔案（含 `src/lib/**`）自動獲得豁免，
 * 而「白名單只有一個成員是刻意的」這句話就不再成立。
 */
const RESOLVER_FILES = ["src/services/chat.service.ts"];

/**
 * Info: (20260812 - Luphia) 掃描面放寬。
 *
 * 原本只掃 `src/services/**`,而一支 route 或 lib helper 直接讀環境變數不會被抓到;
 * 而且只認 `process.env.X` 這一種字面形式 —— 中括號、解構、單引號全都繞得過。
 * 契約測試的價值在於擋住「下一個人不知道這個約定」,所以形式覆蓋要寬一點。
 *
 * `mission.executor.service.ts` 是刻意的例外:那個節點沒有主資料庫權限
 * (見該檔註解與 async_workers/00_async_worker_overview.md),它只能讀環境。
 */
const SCAN_ROOTS = [
  ["src", "services"],
  ["src", "app", "api"],
  ["src", "lib"],
];

const ENV_ONLY_FILES = ["src/services/mission.executor.service.ts"];

const readsKeyFromEnv = (source: string): boolean =>
  ENV_KEYS.some(
    (key) =>
      source.includes(`process.env.${key}`) ||
      source.includes(`process.env["${key}"]`) ||
      source.includes(`process.env['${key}']`) ||
      new RegExp(`\\{[^}]*\\b${key}\\b[^}]*\\}\\s*=\\s*process\\.env`).test(
        source,
      ),
  );

const scanForKeyReads = (): string[] =>
  SCAN_ROOTS.flatMap((segments) => {
    const root = path.join(process.cwd(), ...segments);
    return fs
      .readdirSync(root, { recursive: true })
      .filter((entry): entry is string => typeof entry === "string")
      .filter((entry) => entry.endsWith(".ts") || entry.endsWith(".tsx"))
      .filter((entry) => {
        const relative = path.join(...segments, entry);
        return (
          !RESOLVER_FILES.includes(relative) &&
          !ENV_ONLY_FILES.includes(relative)
        );
      })
      .filter((entry) =>
        readsKeyFromEnv(fs.readFileSync(path.join(root, entry), "utf8")),
      )
      .map((entry) => path.join(...segments, entry));
  });

/**
 * Info: (20260812 - Luphia) 取出 wrapper 內部 ChatService 的 `explicitApiKey`。
 * 以 `unknown` 過渡而不是 `any`:這裡要斷言的正是這個私有欄位的值。
 */
interface IWrapperWithChatService {
  chatService: { explicitApiKey?: string };
}

const explicitKeyOf = (wrapper: object): string | undefined =>
  (wrapper as unknown as IWrapperWithChatService).chatService.explicitApiKey;

describe("LLM key resolution stays in ChatService", () => {
  const saved = new Map<string, string | undefined>();

  beforeEach(() => {
    // Info: (20260812 - Luphia) 刻意把 env 設好 —— 這正是舊寫法會勝出的情境
    ENV_KEYS.forEach((key) => {
      saved.set(key, process.env[key]);
      process.env[key] = `env-${key}`;
    });
  });

  afterEach(() => {
    ENV_KEYS.forEach((key) => {
      const original = saved.get(key);
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    });
  });

  it("should not turn an env value into an explicit constructor key", () => {
    expect(explicitKeyOf(new SearchService())).toBeUndefined();
    expect(explicitKeyOf(new SearchChatService())).toBeUndefined();
    expect(explicitKeyOf(new CrawlerService())).toBeUndefined();
  });

  /**
   * Info: (20260812 - Luphia) 呼叫端真的明確給金鑰時仍必須最高優先 ——
   * 這條沒壞,但把它一起釘住,才不會有人「修」成一律忽略參數。
   */
  it("should still honour a key the caller passes on purpose", () => {
    expect(explicitKeyOf(new SearchService("caller-key"))).toBe("caller-key");
    expect(explicitKeyOf(new SearchChatService("caller-key"))).toBe(
      "caller-key",
    );
    expect(explicitKeyOf(new CrawlerService("caller-key"))).toBe("caller-key");
  });

  /**
   * Info: (20260812 - Luphia) 其餘三處(pdf_editor、route.waypoints、mission.executor)
   * 在函式內建構 ChatService,拿不到實例可斷言,因此改以原始碼契約守住:
   * `src/services/**` 不得自行從環境變數取 LLM 金鑰。
   *
   * 唯一允許問金鑰的方式是 `systemSettingService.get()` ——
   * 它才處理「資料庫可信 / 驗簽失敗拒絕服務 / 從未用資料庫保管才讀 env」三種狀態。
   * (`scripts/**` 與 `src/scripts/**` 不在此列:那些在應用程式外執行,讀 env 是對的。)
   */
  it("should keep every service out of the business of reading the key from env", () => {
    expect(scanForKeyReads()).toEqual([]);
  });
});

/**
 * Info: (20260812 - Luphia) 「完全沒有金鑰」必須是一個可分類的成因，不是一段字串。
 *
 * 三條 `admin/pdf_editor` 路由原本寫 `error.message.includes("GEMINI_API_KEY")`，
 * 而 `IS_GEMINI_API_KEY_UNDEFINED` 這個錯誤碼早就定義好、**全庫零使用** ——
 * 缺金鑰因此被歸進通用的伺服器設定錯誤，而它的解法（去 /admin/settings 設金鑰）
 * 和其他設定問題完全不同。
 */
describe("missing LLM key is a classified cause", () => {
  it("should recognise the marker and nothing else", () => {
    expect(
      isLlmKeyMissingError(new Error(`${LLM_KEY_MISSING_ERROR_MARKER}: none`)),
    ).toBe(true);
    expect(
      isLlmKeyMissingError(new Error(`${LLM_TIMEOUT_ERROR_MARKER}: slow`)),
    ).toBe(false);
    expect(isLlmKeyMissingError(new Error("429 resource_exhausted"))).toBe(
      false,
    );
    expect(isLlmKeyMissingError("not an error")).toBe(false);
  });

  /**
   * Info: (20260812 - Luphia) 釘住「ChatService 真的會帶上標記」。
   *
   * 前一支測試自己組出帶標記的錯誤，證明的只是 type guard 認得標記；
   * 它證明不了拋錯的那一端有沒有帶。實測:把 ChatService 的標記拿掉，
   * 前一支照樣全綠 —— 於是整條分類會靜默失效。
   */
  it("should be what ChatService actually throws when no key resolves", async () => {
    const saved = ENV_KEYS.map((key) => [key, process.env[key]] as const);
    ENV_KEYS.forEach((key) => delete process.env[key]);

    /**
     * Info: (20260812 - Luphia) 走動態載入，理由同檔頭。
     *
     * 原本用靜態 import 的 `ChatService`，於是這條走的是**真實**的
     * `systemSettingService`:CI 有 postgres 而表為空 → EMPTY → 讀 env（已刪）→ 綠;
     * 本機沒有 DATABASE_URL → UNAVAILABLE → 也綠。兩種環境都綠但原因不同，
     * 且都不是它要驗的那件事 —— 哪天 seed 塞進一組已簽章的金鑰，它會莫名轉紅。
     */
    const Service = await loadChatService();

    try {
      await new Service().generateRaw("ping");
      throw new Error("expected ChatService to refuse without a key");
    } catch (error) {
      expect(isLlmKeyMissingError(error)).toBe(true);
    } finally {
      saved.forEach(([key, value]) => {
        if (value !== undefined) process.env[key] = value;
      });
    }
  });

  // Info: (20260812 - Luphia) 反向也釘住:別把逾時誤認成缺金鑰，兩者的處置相反（前者值得重試）
  it("should not collide with the timeout classification", () => {
    const missing = new Error(`${LLM_KEY_MISSING_ERROR_MARKER}: none`);
    expect(isLlmTimeoutError(missing)).toBe(false);
  });

  /**
   * Info: (20260812 - Luphia) 原始碼契約:路由層不得再以訊息字串辨識這個成因。
   *
   * 那句訊息住在 ChatService，任何人改動它就會讓路由的分支靜默失效 ——
   * 而失效的表現是使用者拿到一句與成因無關的錯誤，沒有人會發現。
   */
  it("should keep routes from classifying by message text", () => {
    const apiDir = path.join(process.cwd(), "src", "app", "api");
    const offenders = fs
      .readdirSync(apiDir, { recursive: true })
      .filter((entry): entry is string => typeof entry === "string")
      .filter((entry) => entry.endsWith(".ts"))
      .filter((entry) => {
        const source = fs.readFileSync(path.join(apiDir, entry), "utf8");
        return ENV_KEYS.some((key) => source.includes(`includes("${key}")`));
      });

    expect(offenders).toEqual([]);
  });
});

/**
 * Info: (20260812 - Luphia) 這支 branch 要修的那件事本身。
 *
 * 前面幾支驗的是**結構**（wrapper 不把 env 值當明確傳入）與**邊界**（什麼都拿不到時拋標記）。
 * 結構是好的代理，但不是那件事本身 —— 真正要成立的是
 * 「資料庫有值、環境變數有另一個不同的值 → 實際用的是資料庫那個」。
 * 少了這條，把 `ensureClient()` 的優先序寫反也不會有任何測試變紅。
 *
 * 斷言方式:讀 `ensureClient()` 建出來的 `genAI` 實際帶的金鑰。
 * SDK 只在建構子存下它，不發網路請求，所以這個斷言不會打到真的 API。
 */
describe("resolution order in ensureClient", () => {
  interface IWithClient {
    genAI?: { apiKey?: string };
    modelName?: string;
  }

  const keyOf = (service: ChatService): string | undefined =>
    (service as unknown as IWithClient).genAI?.apiKey;

  // Info: (20260812 - Luphia) ensureClient 是私有的，由任何一支需要用戶端的方法觸發
  const resolve = async (service: ChatService): Promise<void> => {
    await service.generateRaw("ping").catch(() => undefined);
  };

  const ENV_KEY = "env-key";
  const DB_KEY = "db-key";

  beforeEach(() => {
    settingValues.clear();
    process.env.GEMINI_API_KEY = ENV_KEY;
  });

  afterEach(() => {
    settingValues.clear();
    delete process.env.GEMINI_API_KEY;
  });

  it("should prefer the database value over the environment variable", async () => {
    settingValues.set("GEMINI_API_KEY", DB_KEY);
    const Service = await loadChatService();
    const service = new Service();

    await resolve(service);

    expect(keyOf(service)).toBe(DB_KEY);
  });

  /**
   * Info: (20260812 - Luphia) 撤銷語意:管理員清空並簽名之後，資料庫回 undefined，
   * 這時**不得**把環境變數裡的舊金鑰救回來 —— 否則簽下的撤銷等於沒發生。
   * （`get()` 在 EMPTY/UNAVAILABLE 狀態才會自己去讀 env，那是它的職責。）
   */
  it("should not resurrect the env key when the database has none", async () => {
    const Service = await loadChatService();
    const service = new Service();

    await resolve(service);

    expect(keyOf(service)).toBeUndefined();
  });

  // Info: (20260812 - Luphia) 呼叫端明確給的仍然最高，且此路徑不查資料庫（見 F1）
  it("should let an explicit key win without consulting the database", async () => {
    settingValues.set("GEMINI_API_KEY", DB_KEY);
    const Service = await loadChatService();
    const service = new Service("caller-key");

    await resolve(service);

    expect(keyOf(service)).toBe("caller-key");
  });
});

/**
 * Info: (20260812 - Luphia) 沒有主資料庫權限的節點不得查系統設定。
 *
 * `MissionExecutor` 依 `async_workers/00_async_worker_overview.md` 就是這種節點，
 * 而那道隔離是**防提示詞注入的基礎**：Executor 處理使用者上傳的憑證內容，
 * 即使注入成功也必須穿不過實體網路邊界。
 *
 * 這條原本只靠「有沒有傳 apiKey」的 truthy 判斷撐著 —— 而照精靈流程設定的部署
 * 金鑰已從 `.env.setup` 移進資料庫（`setup.system_setting` 的 STAGED_KEYS 涵蓋
 * 全部 `SYSTEM_SETTING_KEYS`），節點環境裡本來就沒有，於是隔離在**最常見的
 * 部署形態下剛好失效**。斷言「呼叫次數為 0」讓它成為結構而不是巧合。
 */
describe("nodes without database access", () => {
  it("should never consult system settings, even with no key in the environment", async () => {
    settingValues.set(
      SYSTEM_SETTING_DEFINITIONS[SystemSettingKey.GEMINI_API_KEY].envKey,
      "db-key",
    );
    const Service = await loadChatService();

    // Info: (20260812 - Luphia) 刻意不傳金鑰 —— 正是精靈跑完之後 Executor 的處境
    const error = await new Service(undefined, { allowSystemSettings: false })
      .generateRaw("ping")
      .catch((caught: unknown) => caught);

    expect(isLlmKeyMissingError(error)).toBe(true);
    expect(settingGetCalls).toEqual([]);
  });

  /**
   * Info: (20260812 - Luphia) worker 有自己的設定檔，不吃系統的 `.env`。
   *
   * 共用會讓一個處理使用者上傳內容的節點看得到 `DATABASE_URL`、
   * `SECRET_VAULT_MASTER_KEY`、`SUPER_ADMIN_*` —— 那些它完全不該擁有，
   * 而持有信任根等於把隔離的意義抵銷掉。
   *
   * 斷言原始碼:這個節點只能經 `loadWorkerEnvConfig()` 取設定，
   * 不得出現讀系統 `.env` / `.env.setup` 的取法（`ENV_PATH`、`ENV_SETUP_PATH`、
   * `getPriorityEnvConfig`）。
   */
  it("should read its own env file and never the system one", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), ENV_ONLY_FILES[0]),
      "utf8",
    );
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

    expect(code).toContain("loadWorkerEnvConfig(");
    expect(code).not.toMatch(/\bENV_PATH\b/);
    expect(code).not.toMatch(/\bENV_SETUP_PATH\b/);
    expect(code).not.toMatch(/getPriorityEnvConfig/);
  });

  /**
   * Info: (20260812 - Luphia) 上面兩支驗的是 ChatService **遵守**旗標，
   * 而不是 Executor **有傳**旗標 —— 實測把那個參數拿掉，上面兩支照樣全綠。
   *
   * 這是同一種缺口：守衛存在，但沒有東西保證它被接上。以原始碼契約補起來，
   * 形式沿用本檔其他兩支掃描測試。
   */
  it("should be requested by every node that has no database access", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), ENV_ONLY_FILES[0]),
      "utf8",
    );
    /**
     * Info: (20260812 - Luphia) 比對**建構子呼叫**而不是整份原始碼。
     * 實測:只用 `toContain("allowSystemSettings: false")` 的話，把參數從呼叫裡拿掉
     * 仍然全綠 —— 因為同一個檔案的註解裡就有那串字。掃描測試最常見的假綠就是這個。
     */
    expect(source).toMatch(
      /new ChatService\([^)]*allowSystemSettings:\s*false/,
    );
  });

  // Info: (20260812 - Luphia) 有金鑰時同樣不查（短路），且用的是傳進來的那把
  it("should use the injected key without consulting settings", async () => {
    settingValues.set(
      SYSTEM_SETTING_DEFINITIONS[SystemSettingKey.GEMINI_API_KEY].envKey,
      "db-key",
    );
    const Service = await loadChatService();

    const service = new Service("node-env-key", {
      allowSystemSettings: false,
    });
    await service.generateRaw("ping").catch(() => undefined);

    expect(
      (service as unknown as { genAI?: { apiKey?: string } }).genAI?.apiKey,
    ).toBe("node-env-key");
    expect(settingGetCalls).toEqual([]);
  });
});

/**
 * Info: (20260812 - Luphia) 專案規則:一個設定只有一個來源（ADR 017 §7 的規則章節）。
 *
 * 禁止 `dbValue || process.env.X || …` 這種串接 —— 它讓「現在生效的是哪一個」
 * 變成要試才知道，而輪替與撤銷正是在那個模糊處失效的。
 *
 * 允許 `來源值 || 程式碼保底值`（保底值是編譯期常數，沒有部署差異），
 * 也允許用狀態機先解析出唯一來源再讀。禁止的只有「同一個運算式並列多個來源」。
 */
describe("one setting, one source", () => {
  /**
   * Info: (20260812 - Luphia) 抓「兩個**來源**被 || 串在一起」，兩個方向都抓。
   *
   * 來源的形狀有兩種:`process.env.X`，或某個物件上的設定鍵
   * （`nodeEnv.GEMINI_API_KEY`、`setupConfig.MISSION_DIR`…）。
   * **刻意不列舉變數名** —— 第一版只列了 `setupConfig.`，於是把變數改名成
   * `nodeEnv` 之後那個違規就繞過去了（實測突變不會紅）。改以「點號後接
   * 兩個字以上的大寫底線鍵名」認形狀。
   *
   * 允許的形狀不會被誤抓:`process.env.X || "字面值"`、
   * `process.env.X || DEFAULT_CONST`（裸識別字，沒有點號）都不符合。
   */
  /**
   * Info: (20260812 - Luphia) 只針對**有資料庫歸屬的設定**（`SYSTEM_SETTING_KEYS`）。
   *
   * 規則要防的傷害是「輪替與撤銷靜默失效」，而那只發生在同一個鍵同時有資料庫與
   * env 兩個可能來源時。`.env` 專屬的鍵（`DATABASE_URL`、`POSTGRES_*`、
   * `NEXT_PUBLIC_*`）沒有資料庫歸屬，不會有那個模糊。
   *
   * 這也讓**部署精靈**自然落在範圍外:它在資料庫還不存在時讀 `.env.setup` 與
   * `process.env`（`setup.db.service`、`setup.blockchain.service`…）——
   * 那是它在**建立**單一來源，不是在多處查找一個已經有家的設定。
   * 用白名單放行那幾支也可以，但收斂範圍比列舉檔名更貼近規則本身。
   *
   * 形狀刻意不列舉變數名:第一版只列了 `setupConfig.`，把變數改名成 `nodeEnv`
   * 之後違規就繞過去了（實測突變不會紅）。改以「點號後接設定鍵名」認形狀。
   */
  const DB_OWNED_KEYS = SYSTEM_SETTING_KEYS.map(
    (key) => SYSTEM_SETTING_DEFINITIONS[key].envKey,
  );
  const sourceOf = (key: string) =>
    String.raw`(?:process\.env\.${key}|[A-Za-z_$][\w$]*\.${key})`;
  const CHAINED_SOURCES = new RegExp(
    DB_OWNED_KEYS.map(
      (key) => `${sourceOf(key)}\\s*\\|\\|\\s*(?:await\\s+)?${sourceOf(key)}`,
    ).join("|"),
  );

  it("should not chain two configuration sources in one expression", () => {
    const offenders = SCAN_ROOTS.flatMap((segments) => {
      const root = path.join(process.cwd(), ...segments);
      return fs
        .readdirSync(root, { recursive: true })
        .filter((entry): entry is string => typeof entry === "string")
        .filter((entry) => entry.endsWith(".ts") || entry.endsWith(".tsx"))
        .filter((entry) =>
          CHAINED_SOURCES.test(fs.readFileSync(path.join(root, entry), "utf8")),
        )
        .map((entry) => path.join(...segments, entry));
    });

    expect(offenders).toEqual([]);
  });
});
