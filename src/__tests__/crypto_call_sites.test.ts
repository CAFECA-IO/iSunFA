import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Info: (20260905 - Luphia) 誰可以自己做加解密（#6753 第一步）。
 *
 * ## 這一支現在就做，而不是等收斂完成
 *
 * #6753 要把伺服器側的兩套加解密收斂成一支 service，而那需要先拍板一份規格
 *（cipher suite、IV 長度、AAD 的組成、keyVersion 的位置、金鑰來源與輪替流程）——
 * 兩套現行實作各自都有對的部分，那一步是**選擇**而不是折衷，不該由寫測試的人決定。
 *
 * 但有一件事不必等：**把數量凍結在今天**。
 *
 * ## 第一版漏了一套（20260906 - Luphia，review #6776 阻-A）
 *
 * 初版只認 Node 的 `createCipheriv` / `createDecipheriv`，於是回報「現況兩套」——
 * 而 `lib/chatroom_ecies.ts` 早就是第三套：一樣的 AES-GCM、自己的 IV 與
 * 驗證標籤長度、自己的金鑰派生，只是走瀏覽器的 `crypto.subtle`。
 *
 * 那個漏洞的方向最糟：**任何跑在瀏覽器的功能本來就只能用 `crypto.subtle`**
 *（Node 的 `crypto` 進不了瀏覽器）。也就是說，初版剛好擋不到最可能發生的那一種 ——
 * 而專案裡已經有一支寫得很好的範例可以照抄。
 *
 * 所以偵測範圍改成兩種原語都認，並把清單拆成兩類（見下方）。
 *
 * ## 為什麼連 `randomBytes` 都不管
 *
 * `randomBytes` 到處都可以用（產 token、產 id、產 IV），把它一起釘住只會逼人
 * 為了過測試而繞路。這支要防的是「又一套**加解密方案**」，不是「有人用了 crypto」。
 */

const SRC = join(process.cwd(), "src");

/**
 * Info: (20260905 - Luphia) 掃描根是整個 `src`（檢查清單 §1.1）。
 *
 * 排除 `generated`（Prisma client 自帶一堆 crypto）與 `__tests__`
 *（測試要造密文是正當的）。少了這個排除，清單會被雜訊灌滿而失去意義。
 *
 * `scripts/` 與 `prisma/` **不在掃描根內** —— 今天那兩處乾淨，但那是事實不是保證。
 * 要納入的話成本很低，只是它們不是 #6753 這一步要處理的東西。
 */
const collectFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "generated" || entry.name === "__tests__") return [];
      return collectFiles(full);
    }
    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")
      ? [full]
      : [];
  });

/**
 * Info: (20260906 - Luphia) **#6753 要收斂的那一類**：伺服器保管金鑰的加解密。
 *
 * 共同點是「伺服器解得開」—— 也正因如此，它們該只有一套做法、一份規格。
 * 每一項都要說得出「它為什麼是獨立的一套」，因為那正是 #6753 要消滅的東西。
 *
 * **這張表只能變短。** 收斂完成後會剩一個，那時把 `SERVER_SIDE_MAX` 調成 1。
 */
const SERVER_SIDE_ALLOWED: Record<string, string> = {
  "lib/hr_pii_crypto.ts":
    "HR PII（ADR 018）。AES-256-GCM，AAD 強制且結構化，金鑰逐版本一把 env。",
  "lib/auth/key_vault.ts":
    "託管秘密（私鑰、PRF、系統設定）。AAD 選填，單一 master key 以 scrypt 逐 purpose 衍生。",
};

const SERVER_SIDE_MAX = 2;

/**
 * Info: (20260906 - Luphia) **刻意不收斂的那一類**（產品決策 20260906）。
 *
 * 端對端加密：金鑰由使用者的 passkey PRF 產出、伺服器**沒有**解密能力。
 * 這與上面那一類的目標相反 —— 把它併進「伺服器統一保管」的 service，
 * 等於讓伺服器有能力讀聊天室內容，那是把一個安全屬性拿掉。
 *
 * 分成兩張表而不是一張加長：`SERVER_SIDE_ALLOWED` 的「只能變短」是 #6753 的
 * 進度指標，混進一個永遠不會消失的項目之後，那個數字就再也不代表任何事。
 */
const OUT_OF_SCOPE: Record<string, string> = {
  "lib/chatroom_ecies.ts":
    "聊天室端對端加密（ECIES over secp256k1 + AES-GCM）。金鑰來自 passkey PRF 與 HD 派生，伺服器不具備解密能力，因此刻意不併入伺服器側的統一 service。",
};

const OUT_OF_SCOPE_MAX = 1;

/**
 * Info: (20260906 - Luphia) 兩種建立加解密的途徑都要認。
 *
 * - `createCipheriv` / `createDecipheriv`：Node 的 `crypto`，只在伺服器跑得動
 * - `subtle.encrypt` / `subtle.decrypt`：WebCrypto，瀏覽器與 Node 都有
 *
 * 後者不能寫成 `\b(encrypt|decrypt)\b` —— 那會抓到 `["encrypt", "decrypt"]`
 *（`deriveKey` 的用途宣告）與各種叫做 encrypt 的自訂函式，清單會被雜訊灌爆。
 * 綁在 `subtle.` 上面才是「真的呼叫了 WebCrypto 的加解密」。
 */
const CRYPTO_PRIMITIVE =
  /\b(createCipheriv|createDecipheriv)\b|\bsubtle\s*\.\s*(encrypt|decrypt)\b/;

const offenders = (): string[] =>
  collectFiles(SRC)
    .filter((file) => CRYPTO_PRIMITIVE.test(readFileSync(file, "utf-8")))
    .map((file) =>
      file
        .slice(SRC.length + 1)
        .split("\\")
        .join("/"),
    )
    .sort();

const REGISTERED = [
  ...Object.keys(SERVER_SIDE_ALLOWED),
  ...Object.keys(OUT_OF_SCOPE),
].sort();

describe("自己做加解密的檔案（#6753 第一步：凍結在今天的三處）", () => {
  /**
   * Info: (20260905 - Luphia) 掃描根沒有掃到空氣 —— regex 或排除規則寫壞時這條先紅。
   */
  it("掃得到現有的實作", () => {
    expect(offenders().length).toBeGreaterThan(0);
  });

  /**
   * Info: (20260905 - Luphia) **新增一套會紅，而且訊息直接說出是哪一個檔案。**
   *
   * 作者只有兩條路：走既有的實作之一，或把它登記進上面兩張表之一並寫下理由 ——
   * 而後者會出現在 diff 上，需要在 review 裡被解釋。這正是檢查清單 §1.1
   * 說的「明列例外清單 + 一條清單長度不得增加的測試」。
   */
  it("沒有清單以外的檔案自己做加解密", () => {
    expect(offenders()).toEqual(REGISTERED);
  });

  /**
   * Info: (20260906 - Luphia) 偵測範圍**涵蓋 WebCrypto**，不是只有 Node 的 crypto。
   *
   * 這一條釘的是 review #6776 阻-A 的成因本身：初版的規則看不到
   * `crypto.subtle`，而那是瀏覽器端唯一的選擇。規則退回去只認 Node 的話，
   * 上面那條「沒有清單以外的檔案」會因為**掃不到**而照樣綠 ——
   * 一個以「什麼都沒發現」表現的失效。
   */
  it("WebCrypto 那條路真的在偵測範圍內", () => {
    expect(
      CRYPTO_PRIMITIVE.test("await crypto.subtle.encrypt(alg, key, buf)"),
    ).toBe(true);
    expect(
      CRYPTO_PRIMITIVE.test("await crypto.subtle.decrypt(alg, key, buf)"),
    ).toBe(true);
    expect(offenders()).toContain("lib/chatroom_ecies.ts");
  });

  /**
   * Info: (20260906 - Luphia) 反面：用途宣告的字串不算呼叫。
   *
   * `deriveKey(..., ["encrypt", "decrypt"])` 每一支用 WebCrypto 的檔案都會出現。
   * 把它算成違規的話，清單會被雜訊灌滿而沒有人再看它
   *（檢查清單 §1.10：會亂叫的驗收沒有人會再看它）。
   */
  it("字串形式的 encrypt / decrypt 不算", () => {
    expect(CRYPTO_PRIMITIVE.test('["encrypt", "decrypt"]')).toBe(false);
    expect(CRYPTO_PRIMITIVE.test("const encrypt = () => {};")).toBe(false);
  });

  /**
   * Info: (20260906 - Luphia) **待收斂的那一張只能變短。**
   *
   * #6753 收斂完成後這裡會是 1，那時把 `SERVER_SIDE_MAX` 調成 1 即可，
   * 測試本身不必改寫。方向是單向的：變長要動這個數字，而動它會被看見。
   */
  it("待收斂的清單沒有變長", () => {
    expect(Object.keys(SERVER_SIDE_ALLOWED).length).toBeLessThanOrEqual(
      SERVER_SIDE_MAX,
    );
  });

  /**
   * Info: (20260906 - Luphia) 「刻意不收斂」那一張同樣不得變長。
   *
   * 沒有這一條的話，它會變成一個什麼都塞得進去的抽屜 ——
   * 而每塞一項，#6753 想解決的問題就回來一點。
   */
  it("不收斂的清單沒有變長", () => {
    expect(Object.keys(OUT_OF_SCOPE).length).toBeLessThanOrEqual(
      OUT_OF_SCOPE_MAX,
    );
  });

  /**
   * Info: (20260906 - Luphia) 兩張表不得有同一個檔案。
   *
   * 同時出現在兩邊的話，「還剩幾套要收斂」這個數字就不再是答案 ——
   * 而那正是 `SERVER_SIDE_MAX` 唯一的用途。
   */
  it("同一個檔案不會同時在兩張表裡", () => {
    const both = Object.keys(SERVER_SIDE_ALLOWED).filter(
      (file) => file in OUT_OF_SCOPE,
    );
    expect(both).toEqual([]);
  });

  /**
   * Info: (20260905 - Luphia) 每一項都要有理由，不能只列路徑。
   *
   * 檢查清單 §1.1：「例外清單裡的每一項都要寫明『為什麼這次不修』，
   * 而不只是列路徑。」一個沒有理由的豁免，下一個人無從判斷它還成不成立。
   */
  it("每一個登記都寫得出理由", () => {
    for (const [file, reason] of Object.entries({
      ...SERVER_SIDE_ALLOWED,
      ...OUT_OF_SCOPE,
    })) {
      expect(reason.length).toBeGreaterThan(20);
      expect(file).toMatch(/\.tsx?$/);
    }
  });
});
