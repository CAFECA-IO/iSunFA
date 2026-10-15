import { describe, it, expect } from "@jest/globals";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Info: (20261015 - Luphia) 區塊鏈退役：執行期不得再連任何鏈。
 *
 * 自建鏈已損毀，點數、任務看板、帳號建立、會員卡都改以 DB 為唯一真相。
 * 這組掃描取代原本的 `chain_receipt_status`（它守的是「鏈上交易要確認 status」，
 * 而現在根本不該有鏈上交易）。掃描根是整個 `src` 與 `scripts`：
 * 掃描型測試的價值等於它的掃描根。
 *
 * viem / ethers 仍允許作為**純函式庫**使用（雜湊、位址檢查、ABI 編碼），
 * 被禁止的是會發出網路請求或簽交易的 API。
 */

const FORBIDDEN_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "createPublicClient", pattern: /\bcreatePublicClient\s*\(/ },
  { name: "createWalletClient", pattern: /\bcreateWalletClient\s*\(/ },
  { name: "readContract", pattern: /\.readContract\s*\(/ },
  { name: "writeContract", pattern: /\.writeContract\s*\(/ },
  { name: "simulateContract", pattern: /\.simulateContract\s*\(/ },
  { name: "sendTransaction", pattern: /\.sendTransaction\s*\(/ },
  { name: "waitForTransactionReceipt", pattern: /waitForTransactionReceipt/ },
  { name: "getTransactionReceipt", pattern: /getTransactionReceipt/ },
  { name: "JsonRpcProvider", pattern: /\bJsonRpcProvider\b/ },
  { name: "NEXT_PUBLIC_RPC_URL", pattern: /NEXT_PUBLIC_RPC_URL/ },
  { name: "@/config/contracts", pattern: /@\/config\/contracts/ },
  { name: "@/lib/viem", pattern: /@\/lib\/viem/ },
];

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Info: (20261015 - Luphia) 產生的 Prisma client 與測試自身不算
      if (entry.name === "generated" || entry.name === "__tests__") return [];
      return listSourceFiles(full);
    }
    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")
      ? [full]
      : [];
  });
}

function codeOf(file: string): string {
  return readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !line.startsWith("*") && !line.startsWith("//"))
    .join("\n");
}

describe("執行期不再連鏈", () => {
  const files = ["src", "scripts"].flatMap((root) =>
    listSourceFiles(join(process.cwd(), root)),
  );

  it.each(FORBIDDEN_PATTERNS)("沒有任何來源使用 $name", ({ pattern }) => {
    const offenders = files
      .filter((file) => pattern.test(codeOf(file)))
      .map((file) => file.slice(process.cwd().length + 1));
    expect(offenders).toEqual([]);
  });

  it("鏈上的用戶端、合約設定與 bundler 已移除", () => {
    for (const file of [
      "src/lib/viem.ts",
      "src/lib/viem_public.ts",
      "src/config/contracts.ts",
      "src/services/bundler.service.ts",
      "src/services/token.service.ts",
      "src/services/member.service.ts",
      "src/app/api/v1/blockchain/route.ts",
      "src/app/api/v1/bundler/route.ts",
    ]) {
      expect(existsSync(join(process.cwd(), file))).toBe(false);
    }
  });
});

/**
 * Info: (20260818 - Luphia) 收回分配點數已停用，且要**明確地**停用（產品決定 20260818）。
 *
 * 讓它一路走到底失敗會回一個通用的「操作失敗」，而那個訊息會讓客服以為是
 * 餘額問題或暫時性故障而不斷重試——這件事重試一百次也一樣。
 */
describe("收回分配點數已停用", () => {
  const service = readFileSync(
    join(process.cwd(), "src", "services", "team_wallet.service.ts"),
    "utf8",
  );

  it("以專屬錯誤碼擋下", () => {
    expect(service).toMatch(/TW_ALLOCATION_REVOKE_DISABLED/);
  });

  // Info: (20260818 - Luphia) 必須擋在動任何餘額之前，守門之後沒有收回的寫入
  it("擋在 guarded() 之前", () => {
    const guard = service.indexOf("TW_ALLOCATION_REVOKE_DISABLED");
    const guardedBody = service.indexOf("return guarded(", guard);
    expect(guard).toBeGreaterThan(-1);
    expect(guardedBody).toBeGreaterThan(guard);
    expect(service).not.toMatch(/teamWalletRepo\.revoke\(/);
  });
});
