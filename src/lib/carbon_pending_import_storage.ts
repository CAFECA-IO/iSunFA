"use client";

/**
 * Info: (20260806 - Tzuhan) 待匯入解析結果的儲存模組:比照 carbon_report_draft_storage 的 E2EE 三態協定。
 *
 * 前端 xpub 加密 PUT、PRF 主私鑰解密 GET;server 全程不見明文。
 * 差別在多一個 `discardPendingImport` —— 這份資料有明確終點(套用或捨棄),
 * 不像草稿那樣一直存在。
 */

import {
  eciesEncrypt,
  eciesDecrypt,
  type IEciesEnvelope,
  type IChatroomMasterKey,
} from "@/lib/chatroom_ecies";
import { request } from "@/lib/utils/request";
import {
  CarbonPendingImportDataSchema,
  type CarbonPendingImportData,
} from "@/validators";

export interface ILoadedPendingImport {
  // Info: (20260806 - Tzuhan) null = 存在但無法解密/驗證(版本仍有效,禁止以版本 0 覆蓋)
  data: CarbonPendingImportData | null;
  version: number;
  canEdit: boolean;
  accountBookId: string | null;
}

const PENDING_IMPORT_API = "/api/v1/chat/carbon/pending-import";

/**
 * Info: (20260806 - Tzuhan) 三態:null = 無紀錄(版本 0 可首存);
 * data null = 有紀錄但不可讀(版本仍真實,不得以 0 覆蓋)。
 *
 * 「不可讀」與「不存在」必須分得開:兩者混為一談的後果是拿版本 0 去寫,
 * 樂觀鎖擋下來變成保存失敗,而畫面只會顯示一個無法解釋的錯誤。
 */
export const loadPendingImport = async (
  channel: string,
  masterKey: IChatroomMasterKey | null,
): Promise<ILoadedPendingImport | null> => {
  const res = await request<{
    payload: {
      pendingImport: {
        envelope: IEciesEnvelope | null;
        plainContent: string | null;
        version: number;
      } | null;
      access: { canEdit: boolean; accountBookId: string | null } | null;
    } | null;
  }>(PENDING_IMPORT_API, { query: { channel } });

  const record = res.payload?.pendingImport;
  const access = res.payload?.access ?? { canEdit: true, accountBookId: null };
  if (!record) return null;

  try {
    let plaintext: string;
    if (record.plainContent !== null) {
      plaintext = record.plainContent;
    } else if (record.envelope && masterKey) {
      plaintext = await eciesDecrypt(
        masterKey.extendedPrivateKey,
        record.envelope,
      );
    } else {
      return { data: null, version: record.version, ...access };
    }
    const parsed = CarbonPendingImportDataSchema.safeParse(
      JSON.parse(plaintext),
    );
    return {
      data: parsed.success ? parsed.data : null,
      version: record.version,
      ...access,
    };
  } catch {
    return { data: null, version: record.version, ...access };
  }
};

// Info: (20260806 - Tzuhan) 保存:明文序列化 → xpub 加密(或帳本模式明文)→ PUT(樂觀鎖);回傳新版本
export const savePendingImport = async (
  channel: string,
  masterKey: IChatroomMasterKey | null,
  data: CarbonPendingImportData,
  version: number,
  accountBookId: string | null = null,
): Promise<number> => {
  // Info: (20260806 - Tzuhan) 加密模式沒有金鑰就無從加密,必須在這裡失敗而不是送出空密文
  if (!accountBookId && !masterKey) {
    throw new Error("masterKey is required for encrypted mode");
  }
  const serialized = JSON.stringify(data);
  const body = accountBookId
    ? {
        channel,
        version,
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
    PENDING_IMPORT_API,
    { method: "PUT", body: JSON.stringify(body) },
  );

  if (!res.payload) throw new Error("Empty save pending import payload");
  return res.payload.version;
};

/**
 * Info: (20260806 - Tzuhan) 清除(套用或捨棄後)。
 * 不帶版本:刪除是幂等的終態,「另一端剛好也刪了」不需要當成衝突處理。
 */
export const discardPendingImport = async (channel: string): Promise<void> => {
  await request(PENDING_IMPORT_API, {
    method: "DELETE",
    body: JSON.stringify({ channel }),
  });
};
