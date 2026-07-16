"use client";

// Info: (20260716 - Emily) 盤查狀態帳本儲存模組(#6518): 比照 carbon_report_draft_storage 的 E2EE 三態協定
// Info: (20260716 - Emily) 前端 xpub 加密 PUT、PRF 主私鑰解密 GET;server 全程不見明文

import { ICarbonInventoryState } from "@/types/carbon_chatbot.types";
import {
  eciesEncrypt,
  eciesDecrypt,
  type IEciesEnvelope,
  type IChatroomMasterKey,
} from "@/lib/chatroom_ecies";
import { request } from "@/lib/utils/request";
import { CarbonInventoryStateSchema } from "@/validators";

export interface ILoadedInventoryState {
  // Info: (20260716 - Emily) null = 存在但無法解密/驗證(版本仍有效，禁止以版本 0 覆蓋)
  state: ICarbonInventoryState | null;
  version: number;
}

const INVENTORY_STATE_API = "/api/v1/chat/carbon/inventory";

// Info: (20260716 - Emily) 三態: null = 無記錄(版本 0 可首存);state null = 有記錄但不可讀(版本仍真實)
export const loadInventoryState = async (
  channel: string,
  masterKey: IChatroomMasterKey,
): Promise<ILoadedInventoryState | null> => {
  const res = await request<{
    payload: {
      state: { envelope: IEciesEnvelope; version: number } | null;
    } | null;
  }>(INVENTORY_STATE_API, { query: { channel } });

  const record = res.payload?.state;
  if (!record) return null;

  try {
    const plaintext = await eciesDecrypt(
      masterKey.extendedPrivateKey,
      record.envelope,
    );
    const parsed = CarbonInventoryStateSchema.safeParse(JSON.parse(plaintext));
    return {
      state: parsed.success ? parsed.data : null,
      version: record.version,
    };
  } catch {
    return { state: null, version: record.version };
  }
};

// Info: (20260716 - Emily) 保存: 明文序列化 → xpub 加密 → PUT(樂觀鎖)；回傳新版本
export const saveInventoryState = async (
  channel: string,
  masterKey: IChatroomMasterKey,
  state: ICarbonInventoryState,
  version: number,
): Promise<number> => {
  const envelope = await eciesEncrypt(
    masterKey.extendedPublicKey,
    JSON.stringify(state),
  );

  const res = await request<{ payload: { version: number } | null }>(
    INVENTORY_STATE_API,
    {
      method: "PUT",
      body: JSON.stringify({
        channel,
        version,
        recipientPublicKey: masterKey.extendedPublicKey,
        envelope,
      }),
    },
  );

  if (!res.payload) throw new Error("Empty save inventory payload");
  return res.payload.version;
};
