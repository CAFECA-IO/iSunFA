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
import { ChatService } from "@/services/chat.service";

/**
 * Info: (20260812 - Luphia) 讓 ChatService 的解析走到「什麼都拿不到」那條路。
 * 只 mock 系統設定,不 mock ChatService 自己 —— 要驗的正是它實際拋出什麼。
 */
jest.mock("@/services/system_setting.service", () => ({
  systemSettingService: { get: async () => undefined },
}));

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

const ENV_KEYS = ["GEMINI_API_KEY", "GOOGLE_API_KEY"] as const;

/**
 * Info: (20260812 - Luphia) 唯一允許直接讀環境變數的檔案。
 *
 * `ChatService.ensureClient()` 是**指定的解析點**:它先問資料庫,
 * 讀不到才落回環境變數,而且還多接一個不屬於系統設定的 `GOOGLE_API_KEY`。
 * 白名單只有一個成員是刻意的 —— 要新增就得先說明為什麼那個位置需要
 * 繞過三態語意(資料庫可信 / 驗簽失敗拒絕服務 / 從未用資料庫保管)。
 */
const RESOLVER_FILES = ["chat.service.ts"];

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
    const serviceDir = path.join(process.cwd(), "src", "services");
    const offenders = fs
      .readdirSync(serviceDir, { recursive: true })
      .filter((entry): entry is string => typeof entry === "string")
      .filter((entry) => entry.endsWith(".ts"))
      .filter((entry) => !RESOLVER_FILES.includes(entry))
      .filter((entry) => {
        const source = fs.readFileSync(path.join(serviceDir, entry), "utf8");
        return ENV_KEYS.some((key) => source.includes(`process.env.${key}`));
      });

    expect(offenders).toEqual([]);
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

    try {
      await new ChatService().generateRaw("ping");
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
