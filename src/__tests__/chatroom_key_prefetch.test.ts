import { describe, it, expect, jest, beforeEach } from "@jest/globals";

/**
 * Info: (20260812 - Luphia) `prefetchOwnKeyRecord()` 不得快取失敗。
 *
 * 這支快取存在的理由是對的:先把金鑰紀錄抓回來，手勢當下呼叫 WebAuthn PRF 之前
 * 就不用再等網路 —— 否則「fetch → PRF」的順序會耗掉 transient user activation。
 *
 * 但原本只判斷 `if (!ownKeyRecordPromise)`，被記住的包含**已 reject 的 promise**。
 * `/api/v1/user/encryption_key` 只要失敗過一次（網路抖動、後端重啟、一次 500），
 * 之後每一次 `ensureMasterKey()` 都 await 到同一個 rejected promise，
 * 在碰到 WebAuthn 之前就拋出 —— 使用者看到「點了解鎖完全沒反應，連對話框都不跳」，
 * 而且**重按沒有用**，只有重新整理頁面才會好（模組層級的變數不會自己清掉）。
 */
const requestMock = jest.fn<(url: string) => Promise<unknown>>();

jest.mock("@/lib/utils/request", () => ({
  request: (url: string) => requestMock(url),
}));

// Info: (20260812 - Luphia) 每一支測試都要一份乾淨的模組快取，否則前一支的狀態會滲進來
const loadManager = async () => {
  jest.resetModules();
  return import("@/lib/chatroom_key_manager");
};

describe("prefetchOwnKeyRecord", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it("should cache a successful fetch instead of asking twice", async () => {
    requestMock.mockResolvedValue({ payload: null });
    const { prefetchOwnKeyRecord } = await loadManager();

    await prefetchOwnKeyRecord();
    await prefetchOwnKeyRecord();

    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  /**
   * Info: (20260812 - Luphia) 這條就是「按了沒反應、重按也沒用」的成因。
   * 第二次呼叫必須是一次真正的重試，而不是回放同一個失敗。
   */
  it("should retry after a failure instead of replaying it forever", async () => {
    requestMock.mockRejectedValueOnce(new Error("network blip"));
    const { prefetchOwnKeyRecord } = await loadManager();

    await expect(prefetchOwnKeyRecord()).rejects.toThrow("network blip");

    requestMock.mockResolvedValueOnce({
      payload: {
        encryptionPublicKey: "xpub",
        wrappedPrivateKey: "wrapped",
        prfSalt: "c2FsdA==",
      },
    });

    await expect(prefetchOwnKeyRecord()).resolves.toEqual({
      encryptionPublicKey: "xpub",
      wrappedPrivateKey: "wrapped",
      prfSalt: "c2FsdA==",
    });
    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  // Info: (20260812 - Luphia) 連續失敗也要每次都重試，不能第二次之後又黏住
  it("should keep retrying while it keeps failing", async () => {
    requestMock.mockRejectedValue(new Error("still down"));
    const { prefetchOwnKeyRecord } = await loadManager();

    await expect(prefetchOwnKeyRecord()).rejects.toThrow("still down");
    await expect(prefetchOwnKeyRecord()).rejects.toThrow("still down");

    expect(requestMock).toHaveBeenCalledTimes(2);
  });
});

/**
 * Info: (20260812 - Luphia) 包裝來源必須被記錄並在解包前比對（PR review P-1 / P-2）。
 *
 * 沒有這道比對，custody 一翻轉就是**靜默的資料損失**：託管使用者補綁 passkey、
 * 託管金鑰列被廢除之後 `resolveCustodyType` 回 PASSKEY，前端改走 passkey 派生 ——
 * 同一個 salt、不同的秘密，`unwrapMasterKey` 必然失敗，而使用者看到的是
 * 一句通用的「解鎖失敗」，真相是「這份對話已經解不開了」。
 */
describe("ensureMasterKey guards the key source", () => {
  const CUSTODIAL_RECORD = {
    encryptionPublicKey: "xpub",
    wrappedPrivateKey: "wrapped",
    prfSalt: "c2FsdA==",
    algorithm: "CustodialPRF-v1-HMAC-SHA256-AES-256-GCM",
  };

  it("should refuse to unwrap a custodial record as a passkey one", async () => {
    requestMock.mockResolvedValue({ payload: CUSTODIAL_RECORD });
    const { ensureMasterKey, ChatroomKeySourceMismatchError } =
      await loadManager();

    await expect(ensureMasterKey("PASSKEY")).rejects.toBeInstanceOf(
      ChatroomKeySourceMismatchError,
    );
  });

  /**
   * Info: (20260812 - Luphia) 反向也要擋:passkey 包裝的列不得用託管秘密去解。
   * 舊列沒有 `algorithm` 欄位，視為 passkey（schema 的預設值就是那個）。
   */
  it("should refuse to unwrap a legacy passkey record as a custodial one", async () => {
    requestMock.mockResolvedValue({
      payload: { ...CUSTODIAL_RECORD, algorithm: undefined },
    });
    const { ensureMasterKey, ChatroomKeySourceMismatchError } =
      await loadManager();

    await expect(ensureMasterKey("CUSTODIAL")).rejects.toBeInstanceOf(
      ChatroomKeySourceMismatchError,
    );
  });

  /**
   * Info: (20260812 - Luphia) custody 未知時不猜（P-2）。
   * 猜錯的方向不對稱:把託管帳號當 passkey 會開出一個永遠不會成功的系統對話框。
   */
  it("should refuse to guess when custody is not loaded", async () => {
    requestMock.mockResolvedValue({ payload: CUSTODIAL_RECORD });
    const { ensureMasterKey, ChatroomCustodyUnknownError } =
      await loadManager();

    await expect(ensureMasterKey(undefined)).rejects.toBeInstanceOf(
      ChatroomCustodyUnknownError,
    );
  });
});
