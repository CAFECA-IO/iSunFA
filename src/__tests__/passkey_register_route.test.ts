import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { generateKeyPairSync } from "crypto";
import { NextRequest } from "next/server";
import { POST as registerRoute } from "@/app/api/v1/auth/register/route";
import { GET as optionsRoute } from "@/app/api/v1/auth/options/route";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { verifyRegistration } from "@/lib/auth/fido2_server";
import {
  generateChallengeToken,
  verifyChallengeToken,
} from "@/lib/auth/challenge_token";
import { extractXYFromSPKI } from "@/lib/auth/crypto_utils";
import { deriveAccountAddress } from "@/lib/auth/account_address";
import { ChallengePurpose } from "@/constants/challenge_purpose";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20261015 - Luphia) POST /api/v1/auth/register（區塊鏈退役後的 passkey 註冊）。
 *
 * 邊界落在外部世界：WebAuthn 驗證函式庫（verifyRegistration）與 DB（webauthn.repo）。
 * challenge token、SPKI 解析、位址推導、route 與 service 都用真的——要證明的是
 * 「一個請求走進來，會不會以伺服器發的 challenge 驗證、推導出正確位址、只寫一次 DB」。
 */

jest.mock("@/lib/auth/fido2_server", () => ({
  verifyRegistration: jest.fn(),
  verifyAuthentication: jest.fn(),
}));

jest.mock("@/repositories/webauthn.repo", () => ({
  webAuthnRepo: {
    findUserByCredentialId: jest.fn(async () => null),
    findUserByAddress: jest.fn(async () => null),
    upsertUser: jest.fn(),
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const CREDENTIAL_ID = "credential-abc";

// Info: (20261015 - Luphia) 真實的 P-256 公鑰（SPKI、base64url），與 passkey 回傳的形狀一致
const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const SPKI = publicKey
  .export({ type: "spki", format: "der" })
  .toString("base64url");
const { x: PUB_X, y: PUB_Y } = extractXYFromSPKI(SPKI);

function registration() {
  return {
    id: CREDENTIAL_ID,
    rawId: CREDENTIAL_ID,
    type: "public-key",
    response: {
      attestationObject: "attestation",
      authenticatorData: "auth-data",
      clientDataJSON: "client-data",
      publicKey: SPKI,
      publicKeyAlgorithm: -7,
      transports: ["internal"],
    },
    clientExtensionResults: {},
    user: { name: "Alice" },
  };
}

async function post(body: unknown): Promise<{
  status: number;
  json: {
    success: boolean;
    errorCode?: string;
    payload: { address: string; name: string | null } | null;
  };
}> {
  const response = await registerRoute(
    new NextRequest("https://isunfa.com/api/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { status: response.status, json: await response.json() };
}

beforeAll(() => {
  process.env.DEWT_PRIVATE_KEY_PEM = "test-only-token-secret";
});

beforeEach(() => {
  jest.clearAllMocks();
  asMock(verifyRegistration).mockResolvedValue({
    credential: { id: CREDENTIAL_ID, publicKey: SPKI, algorithm: "ES256" },
  });
  asMock(webAuthnRepo.findUserByCredentialId).mockResolvedValue(null);
  asMock(webAuthnRepo.findUserByAddress).mockResolvedValue(null);
  asMock(webAuthnRepo.upsertUser).mockImplementation(async (data: unknown) => {
    const input = data as { address: string; name: string };
    return { id: "user-1", address: input.address, name: input.name };
  });
});

describe("GET /api/v1/auth/options?action=register", () => {
  it("回傳 challenge 與綁 REGISTER 用途的 token", async () => {
    const response = await optionsRoute(
      new NextRequest("https://isunfa.com/api/v1/auth/options?action=register"),
    );
    const json = (await response.json()) as {
      payload: { challenge: string; token: string };
    };

    await expect(
      verifyChallengeToken(json.payload.token, ChallengePurpose.REGISTER),
    ).resolves.toBe(json.payload.challenge);
    // Info: (20261015 - Luphia) 註冊 token 不能拿去登入
    await expect(
      verifyChallengeToken(json.payload.token, ChallengePurpose.LOGIN),
    ).rejects.toThrow();
  });
});

describe("POST /api/v1/auth/register", () => {
  it("驗證後以推導位址建立帳號", async () => {
    const { challenge, token } = await generateChallengeToken(
      ChallengePurpose.REGISTER,
    );

    const { status, json } = await post({
      registration: registration(),
      challengeToken: token,
      name: "  Alice  ",
    });

    const expectedAddress = deriveAccountAddress({
      credentialId: CREDENTIAL_ID,
      pubKeyX: PUB_X,
      pubKeyY: PUB_Y,
    });

    expect(status).toBe(200);
    expect(json.payload).toEqual({ address: expectedAddress, name: "Alice" });

    // Info: (20261015 - Luphia) 以伺服器簽發的 challenge 驗證，而不是前端說了算
    expect(asMock(verifyRegistration).mock.calls[0][1]).toBe(challenge);

    expect(webAuthnRepo.upsertUser).toHaveBeenCalledTimes(1);
    expect(webAuthnRepo.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        address: expectedAddress,
        credentialId: CREDENTIAL_ID,
        pubKeyX: PUB_X.toString(),
        pubKeyY: PUB_Y.toString(),
        name: "Alice",
      }),
    );
  });

  it("同一個 credentialId 已註冊時拒絕，且不寫 DB", async () => {
    asMock(webAuthnRepo.findUserByCredentialId).mockResolvedValue({
      id: "existing",
    });
    const { token } = await generateChallengeToken(ChallengePurpose.REGISTER);

    const { status, json } = await post({
      registration: registration(),
      challengeToken: token,
      name: "Alice",
    });

    expect(status).toBe(409);
    expect(json.errorCode).toBe(
      API_ERRORS.AUTH_PASSKEY_ALREADY_REGISTERED.code,
    );
    expect(webAuthnRepo.upsertUser).not.toHaveBeenCalled();
  });

  it("推導出的位址已被佔用時拒絕，不覆寫既有帳號", async () => {
    asMock(webAuthnRepo.findUserByAddress).mockResolvedValue({
      id: "someone-else",
    });
    const { token } = await generateChallengeToken(ChallengePurpose.REGISTER);

    const { json } = await post({
      registration: registration(),
      challengeToken: token,
      name: "Alice",
    });

    expect(json.errorCode).toBe(
      API_ERRORS.AUTH_PASSKEY_ALREADY_REGISTERED.code,
    );
    expect(webAuthnRepo.upsertUser).not.toHaveBeenCalled();
  });

  it("其他用途的 token（LOGIN）不能拿來註冊", async () => {
    const { token } = await generateChallengeToken(ChallengePurpose.LOGIN);

    const { status, json } = await post({
      registration: registration(),
      challengeToken: token,
      name: "Alice",
    });

    expect(status).toBe(401);
    expect(json.errorCode).toBe(API_ERRORS.AUTH_INVALID_TOKEN.code);
    expect(verifyRegistration).not.toHaveBeenCalled();
    expect(webAuthnRepo.upsertUser).not.toHaveBeenCalled();
  });

  it("WebAuthn 驗證失敗時不寫 DB", async () => {
    asMock(verifyRegistration).mockRejectedValue(
      new (jest.requireActual<typeof import("@/lib/utils/error")>(
        "@/lib/utils/error",
      ).AppError)(API_ERRORS.VL_MISSING_FIDO2),
    );
    const { token } = await generateChallengeToken(ChallengePurpose.REGISTER);

    const { json } = await post({
      registration: registration(),
      challengeToken: token,
      name: "Alice",
    });

    expect(json.success).toBe(false);
    expect(json.errorCode).toBe(API_ERRORS.VL_MISSING_FIDO2.code);
    expect(webAuthnRepo.upsertUser).not.toHaveBeenCalled();
  });

  it("缺欄位時直接拒絕，不進驗證", async () => {
    const { token } = await generateChallengeToken(ChallengePurpose.REGISTER);

    const { json } = await post({
      registration: registration(),
      challengeToken: token,
    });

    expect(json.errorCode).toBe(API_ERRORS.VL_MISSING_PARAMS.code);
    expect(verifyRegistration).not.toHaveBeenCalled();
  });

  it("多送的欄位一律拒絕（例如前端自報 address）", async () => {
    const { token } = await generateChallengeToken(ChallengePurpose.REGISTER);

    const { json } = await post({
      registration: registration(),
      challengeToken: token,
      name: "Alice",
      address: "0x0000000000000000000000000000000000000001",
    });

    expect(json.errorCode).toBe(API_ERRORS.VL_MISSING_PARAMS.code);
    expect(webAuthnRepo.upsertUser).not.toHaveBeenCalled();
  });
});
