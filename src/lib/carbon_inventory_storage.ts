"use client";

// Info: (20260716 - Tzuhan) 盤查狀態帳本儲存模組(#6518): 比照 carbon_report_draft_storage 的 E2EE 三態協定
// Info: (20260716 - Tzuhan) 前端 xpub 加密 PUT、PRF 主私鑰解密 GET;server 全程不見明文

import { ICarbonInventoryState } from "@/types/carbon_chatbot.types";
import {
  eciesEncrypt,
  eciesDecrypt,
  type IEciesEnvelope,
  type IChatroomMasterKey,
} from "@/lib/chatroom_ecies";
import { request } from "@/lib/utils/request";
import { CarbonInventoryStateSchema } from "@/validators";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

export interface ILoadedInventoryState {
  // Info: (20260716 - Tzuhan) null = 存在但無法解密/驗證(版本仍有效，禁止以版本 0 覆蓋)
  state: ICarbonInventoryState | null;
  version: number;
  // Info: (20260716 - Tzuhan) #52 存取中繼資料(語意同報告草稿)
  canEdit: boolean;
  accountBookId: string | null;
  /**
   * Info: (20260907 - Emily) `state` 為 null 時**為什麼**是 null(#6779)。
   *
   * 三種失敗原本回同一個 null,呼叫端分不出「金鑰沒解鎖」「解不開」「格式被拒」,
   * 只能一律當成「這間房沒有資料」—— 而 persona 對「沒有資料」的反應是重新 onboarding,
   * 使用者一回答,下一次存檔就把那筆讀不出來但真實存在的紀錄蓋掉。
   * 原因說得出來,呼叫端才擋得住那一步。
   */
  reason: InventoryLoadReasonEnum;
}

export enum InventoryLoadReasonEnum {
  /** 讀到了 */
  OK = "OK",
  /** 記錄是加密的,而呼叫端沒有金鑰(尚未解鎖)—— 解鎖後再讀就會好 */
  LOCKED = "LOCKED",
  /** 有金鑰但解不開(金鑰不對、或密文損毀)—— 再讀一百次也一樣 */
  DECRYPT_FAILED = "DECRYPT_FAILED",
  /** 解開了但不符合儲存格式(寫路徑守門上線前留下的、或未來欄位)—— 資料在,只是這一版讀不懂 */
  SCHEMA_REJECTED = "SCHEMA_REJECTED",
}

/**
 * Info: (20260907 - Emily) 三種失敗都不是「沒有資料」。這一句給 persona 與 UI 共用,
 * 讓「讀不出來」與「真的空」在字面上就分得開。
 */
export const describeInventoryLoadReason = (
  reason: InventoryLoadReasonEnum,
): string => {
  switch (reason) {
    case InventoryLoadReasonEnum.LOCKED:
      return "盤查狀態已加密,尚未解鎖金鑰";
    case InventoryLoadReasonEnum.DECRYPT_FAILED:
      return "盤查狀態已加密,目前的金鑰解不開";
    case InventoryLoadReasonEnum.SCHEMA_REJECTED:
      return "盤查狀態存在,但不符合目前版本的儲存格式";
    default:
      return "";
  }
};

/**
 * Info: (20260907 - Emily) 讀不出來時給對話的那一筆「事實」(#6779)。
 *
 * 抽成純函式而不寫在 hook 裡:這是判斷(說什麼、不說什麼),hook 只該接線。
 * 不帶 `emissionsKg` —— 它不是排放數字,出口守門不該把它當合法來源。
 * `source` 明說「不是帳本內容」:persona 會逐字轉述來源,讀者要分得出這一筆與帳本事實的差別。
 */
export const buildInventoryUnreadableFact = (
  reason: InventoryLoadReasonEnum,
): IContextFact => ({
  label: "盤查狀態:存在但目前讀不出來",
  value: describeInventoryLoadReason(reason),
  source: "盤查狀態載入結果(不是帳本內容)",
});

/**
 * Info: (20260907 - Emily) 讀不出來時送給 persona 的 currentStep(#6779)。
 *
 * persona 照 currentStep 決定要不要引導 onboarding。送空狀態的描述過去,它就會問
 * 公司名與年度 —— 那正是資料被覆蓋的第一步。這一句要同時做到三件事:
 * 說明資料在、禁止宣稱沒有資料、禁止引導重設。缺一都會退回舊行為。
 */
export const describeUnreadableInventoryStep = (
  reason: InventoryLoadReasonEnum,
): string =>
  `盤查狀態存在但目前讀不出來(${describeInventoryLoadReason(reason)});請向使用者說明這件事,不要宣稱帳本沒有資料,也不要引導重新設定公司名稱、年度或邊界 —— 那會覆蓋原本的資料`;

/**
 * Info: (20260904 - Emily) 這一版的盤查狀態**存不進去** —— 有欄位不符合儲存格式。
 *
 * 形狀沿用 `CarbonDraftTooLargeError`(具名錯誤 + 型別守衛),理由相同:
 * 呼叫端要能把這種失敗與版本衝突分開處置,而自由字串做不到。
 *
 * `paths` 只帶**欄位路徑與 zod 的錯誤碼,不帶值** —— 載荷是使用者的盤查資料,
 * 與 report_pdf route 的 schema 拒絕分支同一個立場(「只記路徑與代碼,不記值」)。
 */
export class InventoryStateUnsavableError extends Error {
  readonly paths: ReadonlyArray<string>;

  constructor(paths: ReadonlyArray<string>) {
    super(`carbon inventory state failed its own schema: ${paths.join(", ")}`);
    this.name = "InventoryStateUnsavableError";
    this.paths = paths;
  }
}

export const isInventoryStateUnsavableError = (
  error: unknown,
): error is InventoryStateUnsavableError =>
  error instanceof InventoryStateUnsavableError;

const INVENTORY_STATE_API = "/api/v1/chat/carbon/inventory";

// Info: (20260716 - Tzuhan) 三態: null = 無記錄(版本 0 可首存);state null = 有記錄但不可讀(版本仍真實)
// Info: (20260716 - Tzuhan) #52 雙模式讀取(語意同 loadReportDraft)
export const loadInventoryState = async (
  channel: string,
  masterKey: IChatroomMasterKey | null,
): Promise<ILoadedInventoryState | null> => {
  const res = await request<{
    payload: {
      state: {
        envelope: IEciesEnvelope | null;
        plainContent: string | null;
        version: number;
      } | null;
      access: { canEdit: boolean; accountBookId: string | null } | null;
    } | null;
  }>(INVENTORY_STATE_API, { query: { channel } });

  const record = res.payload?.state;
  const access = res.payload?.access ?? { canEdit: true, accountBookId: null };
  if (!record) return null;

  const unreadable = (reason: InventoryLoadReasonEnum) => ({
    state: null,
    version: record.version,
    reason,
    ...access,
  });

  let plaintext: string;
  if (record.plainContent !== null) {
    plaintext = record.plainContent;
  } else if (record.envelope && masterKey) {
    try {
      plaintext = await eciesDecrypt(
        masterKey.extendedPrivateKey,
        record.envelope,
      );
    } catch {
      return unreadable(InventoryLoadReasonEnum.DECRYPT_FAILED);
    }
  } else {
    return unreadable(InventoryLoadReasonEnum.LOCKED);
  }

  let json: unknown;
  try {
    json = JSON.parse(plaintext);
  } catch {
    /*
     * Info: (20260907 - Emily) 解開了卻不是 JSON:與 schema 不符同一類 ——
     * 資料在、這一版讀不懂;不是金鑰問題。
     */
    return unreadable(InventoryLoadReasonEnum.SCHEMA_REJECTED);
  }
  const parsed = CarbonInventoryStateSchema.safeParse(json);
  if (!parsed.success) {
    /*
     * Info: (20260907 - Emily) 只記欄位路徑與錯誤碼,不記值(載荷是使用者的盤查資料)。
     * 原本這裡什麼都不記 —— 格式被拒是最需要人看一眼的那種失敗,
     * 因為它代表某一版寫進去的東西這一版讀不回來。
     */
    console.error("[carbon-inventory] stored state rejected by schema:", {
      channel,
      version: record.version,
      paths: parsed.error.issues
        .slice(0, 10)
        .map((issue) => `${issue.path.join(".") || "(root)"}:${issue.code}`),
    });
    return unreadable(InventoryLoadReasonEnum.SCHEMA_REJECTED);
  }
  return {
    state: parsed.data,
    version: record.version,
    reason: InventoryLoadReasonEnum.OK,
    ...access,
  };
};

// Info: (20260716 - Tzuhan) 保存: 明文序列化 → xpub 加密 → PUT(樂觀鎖)；回傳新版本
// Info: (20260716 - Tzuhan) #52 雙模式保存(語意同 saveReportDraft)
export const saveInventoryState = async (
  channel: string,
  /**
   * Info: (20260803 - Tzuhan) 明文模式(帳本會話)可為 null —— 沒有加密就不需要收件公鑰。
   * 原本一律必填,造成「帳本會話免金鑰」只實現一半:讀免金鑰、寫仍要 master,
   * 未解鎖時讀得到卻存不了(見 issue_drafts/inventory_table_import/04)。
   * 明文模式的擁有者標記改由 API 層以已驗證的使用者位址補上。
   */
  masterKey: IChatroomMasterKey | null,
  state: ICarbonInventoryState,
  version: number,
  accountBookId: string | null = null,
): Promise<number> => {
  // Info: (20260803 - Tzuhan) 加密模式沒有金鑰就無從加密,必須在這裡失敗而不是送出空密文
  if (!accountBookId && !masterKey) {
    throw new Error("masterKey is required for encrypted mode");
  }
  /**
   * Info: (20260904 - Emily) **寫路徑也過 schema**(`issue_drafts/open/73`)。
   *
   * ## 為什麼:兩端原本不對稱,而不對稱的代價是整份消失
   *
   *     save: JSON.stringify(state)                     ← 原本完全不驗
   *     load: parsed.success ? parsed.data : null       ← 驗,失敗就整份丟
   *
   * 於是一個超界的欄位值(例如手滑打成 `1024` 的盤查年度、或一則超過上限的
   * 阻擋原因)**存得進去**,而下一次載入 `safeParse` 失敗 → `loadInventoryState`
   * 回 `state: null` → **整份盤查狀態(帳本、活動數據、待補項、年度快照)一起被丟棄**。
   *
   * 而盤查狀態**沒有本機備份**(本檔零個 localStorage;報告草稿那邊有
   * `saveLocalDraftBackup`,這邊沒有)—— 也就是沒有任何副本可以救回來。
   *
   * 驗在這裡,那件事就變成**存檔當下的一句錯誤**:狀態還在記憶體裡、畫面上看得到,
   * 而使用者知道這一版沒有進去。實際案例:PR #6725 review 阻-2(年度 `1024`)。
   *
   * ## 它抓得到的只有一半,說清楚
   *
   * `safeParse` 抓的是**已宣告欄位的超界值**。**未宣告的鍵** zod 預設剝掉、
   * `safeParse` 會**成功** —— 那一半(「型別加了、schema 沒加」)仍然只有
   * `carbon_inventory_state_persistence.test.ts` 的 round-trip 守得到。
   * 兩個守衛管的是不同的洞,不要以為有了這個就不需要那個。
   *
   * ## 為什麼存原件而不是存 `parsed.data`
   *
   * 存 `parsed.data` 會把「未宣告鍵的遺失」從「下次載入」提前到「這次存檔」——
   * 那不是修好,是加速。驗完存原件:通過的內容與原本送出的**位元完全相同**,
   * 這一段因此不改變任何既有行為,只是多一道會說話的閘。
   */
  const validated = CarbonInventoryStateSchema.safeParse(state);
  if (!validated.success) {
    throw new InventoryStateUnsavableError(
      validated.error.issues
        .slice(0, 10)
        .map((issue) => `${issue.path.join(".") || "(root)"}:${issue.code}`),
    );
  }
  const serialized = JSON.stringify(state);
  const body = accountBookId
    ? {
        channel,
        version,
        // Info: (20260803 - Tzuhan) 明文模式不帶公鑰;有金鑰時仍附上(保留既有紀錄語意)
        ...(masterKey
          ? { recipientPublicKey: masterKey.extendedPublicKey }
          : {}),
        plainContent: serialized,
      }
    : {
        channel,
        version,
        recipientPublicKey: (masterKey as IChatroomMasterKey).extendedPublicKey,
        envelope: await eciesEncrypt(
          (masterKey as IChatroomMasterKey).extendedPublicKey,
          serialized,
        ),
      };

  const res = await request<{ payload: { version: number } | null }>(
    INVENTORY_STATE_API,
    { method: "PUT", body: JSON.stringify(body) },
  );

  if (!res.payload) throw new Error("Empty save inventory payload");
  return res.payload.version;
};
