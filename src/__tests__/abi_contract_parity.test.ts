import { describe, it, expect } from "@jest/globals";
import { existsSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import type { Abi } from "viem";
import { ABIS } from "@/config/contracts";

/**
 * Info: (20260818 - Luphia) ABI 宣告的函式，部署的合約必須真的有（第六輪之後補）。
 *
 * 這一條的由來是一條走了三輪的彎路。扣費第二層要扣成員的個人鏈上點數，實作用的是
 * 平台側 `burn(address, uint256)`——`ABIS.CREDIT_POINT` 宣告了它，而 `CreditPoint`
 * 只有 `burnAndUnlock(uint256)`（燒 `msg.sender` 自己的餘額）。viem 只會在**送出交易時**
 * 失敗（而在 `receipt.status` 的檢查補上之前，那筆 revert 還被回報成成功），所以
 * 型別檢查、lint、單元測試全都不會有意見。
 *
 * 更糟的是那份宣告讓「平台可以直接扣成員錢包」看起來成立，於是沒有人去問旁邊那條
 * 已經在跑的路徑（`ensurePersonalCreditCharge` 的持有人簽章訂單）。最後的診斷是
 * 「合約層面做不到，要改合約」——結論對、理由錯、補救方向也錯，而那句話抄進了
 * 六個檔案與五份文件。**起點就是這份 ABI。**
 *
 * 因此這一支把 ABI 與 `contracts/*.sol`（含繼承鏈）比對。已知的落差登記在
 * `KNOWN_GAPS`，而三條斷言讓那份清單**只能變短**：
 *
 * 1. 沒登記的落差 → 紅（新增一條合約沒有的宣告會被擋下）
 * 2. 登記了但其實存在 → 紅（合約補上之後，清單必須跟著清）
 * 3. 登記了但 ABI 裡沒有那個名字 → 紅（清單不會留著腐爛的條目）
 *
 * 只比**函式名稱**，不比參數型別與 overload：本專案的 ABI 是手寫的字串陣列，
 * 名稱對不上是已經發生過的缺陷，參數對不上還沒有。要擴充的話得先做 Solidity
 * 的參數解析，那是另一件事。
 */

const CONTRACTS_DIR = join(process.cwd(), "contracts");

/**
 * Info: (20260818 - Luphia) 每個 ABI 對應的本地合約原始碼。
 *
 * `ENTRY_POINT` 沒有對應檔案：那是 ERC-4337 的標準 EntryPoint（v0.6.0），
 * 由外部部署、不在本 repo 內，比對不了。列在 `NO_LOCAL_SOURCE` 而不是默默跳過——
 * 新增 ABI 時會被下面那條測試逼著做決定。
 */
const ABI_SOURCES: Record<string, string> = {
  CREDIT_POINT: "credit_point.sol",
  DYNAMIC_KYC_MEMBERSHIP: "dynamic_kyc_membership.sol",
  LEDGER_ANCHOR: "ledger_anchor.sol",
  SCW: "fido2_account.sol",
  SCW_FACTORY: "fido2_account_factory.sol",
};

const NO_LOCAL_SOURCE = ["ENTRY_POINT"];

/**
 * Info: (20260818 - Luphia) 已知落差：ABI 宣告了、合約沒有。每一條都要寫清楚
 * 「實際上有的是什麼」，否則下一個人會再一次以為那個能力存在。
 *
 * **目前是空的**——16 條落差已於同日從 ABI 刪除（`CREDIT_POINT` 13、`SCW` 的
 * `isValidSignature`、`SCW_FACTORY` 的公司帳戶 2 條，另加 `CompanyCreated` 事件）。
 * 刪掉哪些、為什麼，記在 `src/config/contracts.ts` 各該 ABI 的註解裡。
 *
 * 機制保留而不是拿掉：它是**登記**用的，不是「目前有落差」的證明。合約先寫好、ABI
 * 先進 repo 這種正當的暫時落差，做法是登記在這裡並寫清楚實際上有的是什麼，
 * 不是把斷言刪掉。
 */
const KNOWN_GAPS: Record<string, Record<string, string>> = {};

/**
 * Info: (20260818 - Luphia) 收集合約**與其繼承鏈**的函式（或 event）名稱。
 *
 * 一定要走繼承鏈：`CreditPoint is ERC20, AccessControl`，`balanceOf` / `transfer` /
 * `decimals` 都來自 vendored 的 OpenZeppelin（`contracts/lib/@openzeppelin/`），
 * 只讀 `credit_point.sol` 會把它們全部誤判成落差。
 *
 * 也收 `public` 狀態變數：Solidity 會為它們產生同名的 getter（例如
 * `kycRegistry`、`collateralRate`），那些在 ABI 裡看起來就是函式。
 */
function collectNames(
  solPath: string,
  kind: "function" | "event",
  seen = new Set<string>(),
  found = new Set<string>(),
): Set<string> {
  const absolute = resolve(solPath);
  if (seen.has(absolute) || !existsSync(absolute)) return found;
  seen.add(absolute);

  // Info: (20260818 - Luphia) 先去掉行註解，免得被註解掉的簽章算進來
  const source = readFileSync(absolute, "utf8").replace(/\/\/[^\n]*/g, "");

  for (const match of source.matchAll(
    new RegExp(`${kind}\\s+([A-Za-z_]\\w*)\\s*\\(`, "g"),
  )) {
    found.add(match[1]);
  }

  /**
   * Info: (20260818 - Luphia) `public` 狀態變數會產生同名 getter（`kycRegistry`、
   * `collateralRate`），在 ABI 裡看起來就是函式。event 沒有這回事。
   */
  if (kind === "function") {
    for (const match of source.matchAll(
      /^\s*[\w.[\]]+(?:\s+\w+)?\s+public\s+(?:constant\s+|immutable\s+)?([A-Za-z_]\w*)\s*[;=]/gm,
    )) {
      found.add(match[1]);
    }
  }

  for (const match of source.matchAll(
    /import\s*(?:\{[^}]*\}\s*from\s*)?["']([^"']+)["']/g,
  )) {
    const target = match[1];
    collectNames(
      target.startsWith(".")
        ? resolve(dirname(absolute), target)
        : join(CONTRACTS_DIR, target),
      kind,
      seen,
      found,
    );
  }

  return found;
}

const collectFunctionNames = (solPath: string): Set<string> =>
  collectNames(solPath, "function");

function declaredFunctionNames(abi: Abi): string[] {
  return abi
    .filter((item): item is Extract<Abi[number], { type: "function" }> => {
      return item.type === "function";
    })
    .map((item) => item.name);
}

function gapsFor(abiKey: string): string[] {
  const actual = collectFunctionNames(join(CONTRACTS_DIR, ABI_SOURCES[abiKey]));
  return declaredFunctionNames(ABIS[abiKey as keyof typeof ABIS] as Abi)
    .filter((name) => !actual.has(name))
    .sort();
}

const registeredGaps = (abiKey: string): string[] =>
  Object.keys(KNOWN_GAPS[abiKey] ?? {}).sort();

describe("ABI 宣告與部署合約的一致性", () => {
  /**
   * Info: (20260818 - Luphia) 先證明**繼承鏈真的解析到了**。
   *
   * 少了這一條，這支測試會有一個很難察覺的假綠反面：哪天 import 的路徑或寫法變了、
   * 繼承鏈解析不到東西，落差清單會暴增，而「修法」看起來就是把 `balanceOf`、
   * `transfer` 一起登記進 `KNOWN_GAPS`——於是這支測試變成一份謊言清單。
   */
  it("繼承來的函式解析得到（證明不是只讀了單一檔案）", () => {
    const actual = collectFunctionNames(
      join(CONTRACTS_DIR, "credit_point.sol"),
    );

    // Info: (20260818 - Luphia) 合約自己宣告的
    expect(actual.has("burnAndUnlock")).toBe(true);
    expect(actual.has("collateralizedMint")).toBe(true);
    // Info: (20260818 - Luphia) 來自 vendored 的 OpenZeppelin ERC20 / AccessControl
    expect(actual.has("balanceOf")).toBe(true);
    expect(actual.has("transfer")).toBe(true);
    expect(actual.has("hasRole")).toBe(true);
    // Info: (20260818 - Luphia) public 狀態變數的 getter
    expect(actual.has("kycRegistry")).toBe(true);
  });

  it("每個 ABI 都有指定的合約原始碼，或明確登記為沒有本地原始碼", () => {
    const covered = [...Object.keys(ABI_SOURCES), ...NO_LOCAL_SOURCE].sort();

    expect(Object.keys(ABIS).sort()).toEqual(covered);
  });

  it.each(Object.keys(ABI_SOURCES))(
    "%s：宣告的函式都存在於合約（含繼承），除了已登記的落差",
    (abiKey) => {
      expect(gapsFor(abiKey)).toEqual(registeredGaps(abiKey));
    },
  );

  it.each(Object.keys(ABI_SOURCES))(
    "%s：宣告的 event 都存在於合約（含繼承）",
    (abiKey) => {
      const actual = collectNames(
        join(CONTRACTS_DIR, ABI_SOURCES[abiKey]),
        "event",
      );
      const declared = ABIS[abiKey as keyof typeof ABIS]
        .filter((item) => item.type === "event")
        .map((item) => item.name);

      expect(declared.filter((name) => !actual.has(name))).toEqual([]);
    },
  );

  /**
   * Info: (20260818 - Luphia) 以下三條守 `KNOWN_GAPS` 的紀律。目前清單是空的，
   * 所以它們現在等於「清單維持空的」——用 `it` 迴圈而不是 `it.each`，
   * 因為 `it.each([])` 在 Jest 會直接丟錯。
   *
   * 清單只能變短：登記的落差若其實存在，就必須從清單移除。上面那條 `toEqual`
   * 已經涵蓋同一件事，但失敗訊息只顯示兩個陣列不同；這裡逐名比對，紅的時候
   * 直接指出是哪一支。
   */
  it("登記的落差仍然不存在於合約（存在了就該從清單移除）", () => {
    for (const [abiKey, gaps] of Object.entries(KNOWN_GAPS)) {
      const actual = collectFunctionNames(
        join(CONTRACTS_DIR, ABI_SOURCES[abiKey]),
      );

      for (const name of Object.keys(gaps)) {
        expect({ abiKey, name, existsInContract: actual.has(name) }).toEqual({
          abiKey,
          name,
          existsInContract: false,
        });
      }
    }
  });

  it("登記的落差都真的出現在 ABI 裡（不留腐爛條目）", () => {
    for (const abiKey of Object.keys(KNOWN_GAPS)) {
      const declared = declaredFunctionNames(
        ABIS[abiKey as keyof typeof ABIS] as Abi,
      );

      for (const name of registeredGaps(abiKey)) {
        expect(declared).toContain(name);
      }
    }
  });

  it("每條登記的落差都寫了「實際上有的是什麼」", () => {
    for (const [abiKey, gaps] of Object.entries(KNOWN_GAPS)) {
      for (const [name, reason] of Object.entries(gaps)) {
        expect(`${abiKey}.${name}: ${reason}`.length).toBeGreaterThan(
          `${abiKey}.${name}: `.length + 10,
        );
      }
    }
  });
});
