import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { AuthProvider } from "@/constants/auth_provider";

/**
 * Info: (20260811 - Luphia) 這組測試守的是 OAuth 的 CSRF 防線與 fail-closed 前提。
 *
 * 整個 OAuth 流程原本零測試。它有兩處只要被「為了 debug 方便」改一行就會失守，
 * 而兩處各自都是嚴重漏洞：
 * 1. state token 的簽章 / 用途 / provider 比對 —— 失守就是 CSRF（把攻擊者的
 *    Google 帳號綁到受害者的 session）。
 * 2. 簽發金鑰的來源 —— 舊版缺 DEWT_PRIVATE_KEY_PEM 時會退回原始碼裡的
 *    "temporary_secret"，任何人都能自簽合法 state token（內含任意 redirectUri）。
 *
 * 金鑰在模組載入後才讀，因此測試以 jest.resetModules() 重新匯入來切換環境。
 */

const VALID_PAYLOAD = {
  provider: AuthProvider.GOOGLE,
  state: "state-value",
  codeVerifier: "verifier-value",
  redirectUri: "https://isunfa.cafeca.io/auth/callback/google",
  returnTo: "/dashboard",
};

const ORIGINAL_KEY = process.env.DEWT_PRIVATE_KEY_PEM;

async function loadStateToken() {
  jest.resetModules();
  return import("@/lib/auth/oauth/state_token");
}

beforeEach(() => {
  process.env.DEWT_PRIVATE_KEY_PEM = "test-signing-key-material";
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.DEWT_PRIVATE_KEY_PEM;
  } else {
    process.env.DEWT_PRIVATE_KEY_PEM = ORIGINAL_KEY;
  }
});

describe("oauth state token", () => {
  it("簽發的 token 可原樣驗回", async () => {
    const { signStateToken, verifyStateToken } = await loadStateToken();

    const token = await signStateToken(VALID_PAYLOAD);
    await expect(verifyStateToken(token)).resolves.toMatchObject(VALID_PAYLOAD);
  });

  it("被竄改的 token 一律拒絕", async () => {
    const { signStateToken, verifyStateToken } = await loadStateToken();

    const token = await signStateToken(VALID_PAYLOAD);
    // Info: (20260811 - Luphia) 改動 payload 段，簽章即失效
    const [header, payload, signature] = token.split(".");
    const tampered = `${header}.${payload.slice(0, -2)}AA.${signature}`;

    await expect(verifyStateToken(tampered)).rejects.toThrow();
  });

  /**
   * Info: (20260811 - Luphia) 換一把金鑰就驗不過——這正是「缺 env 時退回公開字串」
   * 之所以致命的原因：攻擊者只要用原始碼裡那把就能簽出合法 token。
   */
  it("以不同金鑰簽出的 token 驗不過", async () => {
    const signer = await loadStateToken();
    const token = await signer.signStateToken(VALID_PAYLOAD);

    process.env.DEWT_PRIVATE_KEY_PEM = "a-completely-different-key";
    const verifier = await loadStateToken();

    await expect(verifier.verifyStateToken(token)).rejects.toThrow();
  });

  it("缺少 DEWT_PRIVATE_KEY_PEM 時拒絕簽發，不退回預設秘密", async () => {
    delete process.env.DEWT_PRIVATE_KEY_PEM;
    const { signStateToken } = await loadStateToken();

    await expect(signStateToken(VALID_PAYLOAD)).rejects.toThrow();
  });

  it("空字串金鑰同樣視為未設定", async () => {
    process.env.DEWT_PRIVATE_KEY_PEM = "   ";
    const { signStateToken } = await loadStateToken();

    await expect(signStateToken(VALID_PAYLOAD)).rejects.toThrow();
  });

  /**
   * Info: (20260811 - Luphia) challenge token 與 state token 必須用不同的派生子金鑰。
   * 兩者若共用同一把 HMAC 金鑰，一種 token 就能拿去冒充另一種。
   */
  it("challenge token 不能當成 state token 使用", async () => {
    jest.resetModules();
    const { generateChallengeToken } =
      await import("@/lib/auth/challenge_token");
    const { verifyStateToken } = await loadStateToken();

    const { token } = await generateChallengeToken();

    await expect(verifyStateToken(token)).rejects.toThrow();
  });
});
