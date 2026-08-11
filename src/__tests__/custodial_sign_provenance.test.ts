import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { ChallengePurpose } from "@/constants/challenge_purpose";
import { WalletCustodyType } from "@/constants/auth_provider";

/**
 * Info: (20260811 - Luphia) 這組測試守的是託管代簽的出處驗證——整個功能的安全邊界。
 *
 * 20260811 的 review 指出：舊版只比對 UserOp 的 sender 就代簽，callData / nonce /
 * gas 全由呼叫端決定，等於一支任意動作簽章預言機（拿到一枚 DeWT 就能簽出把錢包
 * 掏空的交易，而且可以對多個 nonce 各簽一份，登出也無法讓它們失效）。
 * 修法是移除「接受呼叫端 UserOp」這個介面，只允許指名一張自己的未付款訂單。
 *
 * 這裡覆蓋的是「什麼情況必須拒絕」，因為出錯時系統仍會回傳一份看起來完全正常的
 * assertion——沒有測試的話，退化不會有任何症狀。
 */

const USER = {
  id: "user-1",
  address: "0xabc",
} as unknown as import("@/interfaces/user").IUser;

const OTHER_USER_ID = "user-2";

// Info: (20260811 - Luphia) 43 字元 base64url，與伺服器產生的訂單 challenge 同格式
const SERVER_CHALLENGE = Buffer.alloc(32, 3).toString("base64url");

const ORIGINAL_KEY = process.env.DEWT_PRIVATE_KEY_PEM;

interface IMocks {
  custody: WalletCustodyType;
  currentChallenge: string | null;
  order: { id: string } | null;
  orderQueries: { challenge: string; statuses: string[] }[];
}

const mocks: IMocks = {
  custody: WalletCustodyType.CUSTODIAL,
  currentChallenge: null,
  order: null,
  orderQueries: [],
};

jest.mock("@/lib/auth/user_approval", () => ({
  resolveCustodyType: jest.fn(async () => mocks.custody),
}));

jest.mock("@/repositories/webauthn.repo", () => ({
  webAuthnRepo: {
    findUserById: jest.fn(async () => ({
      currentChallenge: mocks.currentChallenge,
    })),
  },
}));

jest.mock("@/repositories/payment.repo", () => ({
  paymentRepo: {
    findOrderByUserAndChallenge: jest.fn(
      async (_userId: string, challenge: string, statuses: string[]) => {
        mocks.orderQueries.push({ challenge, statuses });
        return mocks.order;
      },
    ),
  },
}));

/**
 * Info: (20260811 - Luphia) 金鑰查詢一律回 null。
 *
 * 出處驗證發生在取金鑰之前，因此「拒絕」與「通過但無金鑰」會拋出不同的錯誤碼，
 * 剛好可以用來區分這兩種結果，而不需要在測試裡處理真實的加密金鑰。
 */
jest.mock("@/repositories/custodial_key.repo", () => ({
  custodialKeyRepo: { findByUserId: jest.fn(async () => null) },
}));

jest.mock("@/services/custodial_wallet.service", () => ({
  custodialWalletService: { buildOrderPaymentUserOp: jest.fn() },
}));

async function loadService() {
  jest.resetModules();
  const mod = await import("@/services/custodial_signing.service");
  return mod.custodialSigningService;
}

beforeEach(() => {
  process.env.DEWT_PRIVATE_KEY_PEM = "test-signing-key-material";
  mocks.custody = WalletCustodyType.CUSTODIAL;
  mocks.currentChallenge = null;
  mocks.order = null;
  mocks.orderQueries = [];
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.DEWT_PRIVATE_KEY_PEM;
  else process.env.DEWT_PRIVATE_KEY_PEM = ORIGINAL_KEY;
});

describe("custodial signing provenance", () => {
  it("非託管帳號一律拒絕代簽", async () => {
    mocks.custody = WalletCustodyType.PASSKEY;
    const service = await loadService();

    await expect(
      service.sign({ user: USER, challenge: SERVER_CHALLENGE }),
    ).rejects.toMatchObject({ apiCode: "AU000005" });
  });

  it("來源不明的 challenge 必須拒絕", async () => {
    const service = await loadService();

    await expect(
      service.sign({ user: USER, challenge: SERVER_CHALLENGE }),
    ).rejects.toMatchObject({ apiCode: "AU000021" });
  });

  /**
   * Info: (20260811 - Luphia) 常數字串 challenge 不得成為代簽的依據。
   *
   * 綁卡訂單的 challenge 是 "N/A"、註冊是 "registration"、管理員發點數是
   * "admin_distribute"，而且都以 PENDING 建立。少了格式門檻，任何託管使用者
   * 只要建一張綁卡訂單，就能無限次讓伺服器簽這個固定字串。
   */
  it("常數字串 challenge 連查詢訂單都不該發生", async () => {
    mocks.order = { id: "order-1" };
    const service = await loadService();

    await expect(
      service.sign({ user: USER, challenge: "N/A" }),
    ).rejects.toMatchObject({ apiCode: "AU000021" });

    expect(mocks.orderQueries).toEqual([]);
  });

  // Info: (20260811 - Luphia) 已進入付款中的訂單不得再被要求代簽
  it("訂單查詢只接受 PENDING 狀態", async () => {
    mocks.order = { id: "order-1" };
    const service = await loadService();

    // Info: (20260811 - Luphia) 通過出處驗證後才會去找金鑰，mock 回 null 故拋 key missing
    await expect(
      service.sign({ user: USER, challenge: SERVER_CHALLENGE }),
    ).rejects.toMatchObject({ apiCode: "AU000017" });

    expect(mocks.orderQueries).toHaveLength(1);
    expect(mocks.orderQueries[0].statuses).toEqual(["PENDING"]);
  });

  it("使用者自己的 currentChallenge 可以通過", async () => {
    mocks.currentChallenge = SERVER_CHALLENGE;
    const service = await loadService();

    await expect(
      service.sign({ user: USER, challenge: SERVER_CHALLENGE }),
    ).rejects.toMatchObject({ apiCode: "AU000017" });
  });

  it("本站簽發且用途為 USER_ACTION 的 challengeToken 可以通過", async () => {
    const { generateChallengeToken } =
      await import("@/lib/auth/challenge_token");
    const { challenge, token } = await generateChallengeToken(
      ChallengePurpose.USER_ACTION,
      USER.id,
    );
    const service = await loadService();

    await expect(
      service.sign({ user: USER, challenge, challengeToken: token }),
    ).rejects.toMatchObject({ apiCode: "AU000017" });
  });

  /**
   * Info: (20260811 - Luphia) 管理員操作絕不代簽。
   * 託管帳號的「同意」只是一張 session cookie；讓它授權改金流憑證或發點數，
   * 等於把最高權限的第二因素整個拿掉。
   */
  it("ADMIN_ACTION 用途的 challengeToken 必須拒絕", async () => {
    const { generateChallengeToken } =
      await import("@/lib/auth/challenge_token");
    const { challenge, token } = await generateChallengeToken(
      ChallengePurpose.ADMIN_ACTION,
      USER.id,
    );
    const service = await loadService();

    await expect(
      service.sign({ user: USER, challenge, challengeToken: token }),
    ).rejects.toMatchObject({ apiCode: "AU000005" });
  });

  // Info: (20260811 - Luphia) 別人的 token 不能拿來借簽
  it("challengeToken 綁給其他使用者時必須拒絕", async () => {
    const { generateChallengeToken } =
      await import("@/lib/auth/challenge_token");
    const { challenge, token } = await generateChallengeToken(
      ChallengePurpose.USER_ACTION,
      OTHER_USER_ID,
    );
    const service = await loadService();

    await expect(
      service.sign({ user: USER, challenge, challengeToken: token }),
    ).rejects.toMatchObject({ apiCode: "AU000005" });
  });

  /**
   * Info: (20260811 - Luphia) 這條釘住 A-1 的修法本身：介面上不再有「送 UserOp 進來代簽」。
   * 若哪天有人為了方便把它加回去，這個測試會失敗——它守的是一個「不該存在的東西」。
   */
  it("代簽請求的 schema 不接受呼叫端提供的 UserOp", async () => {
    const { custodialSignSchema } = await import("@/validators");

    const parsed = custodialSignSchema.safeParse({
      challenge: SERVER_CHALLENGE,
      userOp: { sender: "0xabc", callData: "0xdeadbeef" },
    });

    expect(parsed.success).toBe(false);
  });
});
