import { describe, it, expect } from "@jest/globals";
import {
  hostnameOf,
  isSameEffectiveOrigin,
  normalizeHostname,
} from "@/lib/utils/host";

/**
 * Info: (20260810 - Luphia) 這組測試守的是兩次真實事故。
 *
 * 20260810 之一：middleware 的 canonical 導向以字面比對主機名，
 * NEXT_PUBLIC_APP_URL 設成 127.0.0.1 而使用者開 localhost，於是無限導向。
 * 20260810 之二：修好上面那個之後，OAuth 的 redirect_uri 白名單以字面比對 origin，
 * 於同一個理由拒絕登入。
 *
 * 同時要守住「不能放寬過頭」：protocol 與 port 是信任邊界，
 * 放寬它們會讓 open redirect 的防線失效。
 */

describe("normalizeHostname", () => {
  it("各種迴環寫法收斂成同一個值", () => {
    const forms = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"];
    const normalized = forms.map(normalizeHostname);

    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe("localhost");
  });

  it("大小寫不影響結果", () => {
    expect(normalizeHostname("LocalHost")).toBe("localhost");
    expect(normalizeHostname("ISunFA.LocalHost")).toBe("isunfa.localhost");
  });

  it("真實網域不受影響，不會被誤認為本機", () => {
    expect(normalizeHostname("isunfa.cafeca.io")).toBe("isunfa.cafeca.io");
    // Info: (20260810 - Luphia) 名稱含 localhost 但不是迴環位址，必須維持原樣
    expect(normalizeHostname("evil-localhost.com")).toBe("evil-localhost.com");
    expect(normalizeHostname("localhost.evil.com")).toBe("localhost.evil.com");
  });
});

describe("hostnameOf", () => {
  it("取出主機名並去掉埠號", () => {
    expect(hostnameOf("localhost:3000")).toBe("localhost");
    expect(hostnameOf("isunfa.cafeca.io")).toBe("isunfa.cafeca.io");
  });

  it("IPv6 的方括號形式不會被切錯", () => {
    // Info: (20260810 - Luphia) 原本的 split(":")[0] 會回傳空字串
    expect(hostnameOf("[::1]:3000")).toBe("::1");
    expect(hostnameOf("[::1]")).toBe("::1");
  });
});

describe("isSameEffectiveOrigin", () => {
  const origin = (url: string) => new URL(url);

  it("localhost 與 127.0.0.1 同埠同協定視為同一來源", () => {
    expect(
      isSameEffectiveOrigin(
        origin("http://localhost:3000/auth/callback/google"),
        origin("http://127.0.0.1:3000"),
      ),
    ).toBe(true);
  });

  it("協定不同即不同來源（http 與 https 是不同信任邊界）", () => {
    expect(
      isSameEffectiveOrigin(
        origin("https://localhost:3000"),
        origin("http://localhost:3000"),
      ),
    ).toBe(false);
  });

  it("埠號不同即不同來源", () => {
    expect(
      isSameEffectiveOrigin(
        origin("http://localhost:3001"),
        origin("http://127.0.0.1:3000"),
      ),
    ).toBe(false);
  });

  it("外部網域絕不被視為本站來源（open redirect 防線）", () => {
    for (const attacker of [
      "http://evil.com:3000",
      "http://localhost.evil.com:3000",
      "http://127.0.0.1.evil.com:3000",
    ]) {
      expect(
        isSameEffectiveOrigin(
          origin(attacker),
          origin("http://127.0.0.1:3000"),
        ),
      ).toBe(false);
    }
  });

  it("正式環境的真實網域仍以字面主機名比對", () => {
    expect(
      isSameEffectiveOrigin(
        origin("https://isunfa.cafeca.io/auth/callback/google"),
        origin("https://isunfa.cafeca.io"),
      ),
    ).toBe(true);
    expect(
      isSameEffectiveOrigin(
        origin("https://isunfa.cafeca.io"),
        origin("https://other.cafeca.io"),
      ),
    ).toBe(false);
  });
});
