import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Info: (20260818 - Luphia) 鏈上交易必須確認沒有 revert（第三輪）。
 *
 * `waitForTransactionReceipt` 對 revert 的交易一樣正常回傳收據——只有逾時才拋。
 * 因此「送得出去」不等於「做成了」。
 *
 * 掃描根是**整個 src**。上一版只掃 `token.service.ts`——而那剛好就是被修的
 * 那一個檔案。reviewer 指出這已經是第三次同樣的形狀（`route_params_contract`
 * 只掃 `src/app/api`、`payment_fulfillment_visibility` 只覆蓋 webhook）：
 * **掃描型測試的價值等於它的掃描根。**
 *
 * 仍有十餘處未確認的等待分散在 setup、issue、mission、bundler 等流程。
 * 那些不在本 PR 的範圍、也沒有可驗證的測試環境，因此以**明列例外**處理：
 * 清單只能變短，不能變長——新增一處未確認的等待就會紅。
 */

const KNOWN_UNCONFIRMED = [
  "src/app/api/v1/admin/mission/[mission_id]/actions/route.ts",
  "src/services/admin.blockchain.service.ts",
  "src/services/bundler.service.ts",
  "src/services/setup.blockchain.service.ts",
  "src/services/issue.validator.service.ts",
  "src/services/mission.commitor.service.ts",
  "src/services/issue.service.ts",
  "src/services/cron/amortization.worker.service.ts",
];

const CONFIRM_HELPER = "src/lib/chain/confirm_transaction.ts";

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Info: (20260818 - Luphia) 產生的 Prisma client 與測試自身不算
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

describe("鏈上交易一律確認 status", () => {
  it("共用確認函式會檢查 receipt.status", () => {
    const source = readFileSync(join(process.cwd(), CONFIRM_HELPER), "utf8");
    expect(source).toMatch(/receipt\.status !== "success"/);
  });

  it("除了共用確認函式與已知例外，沒有未確認的收據等待", () => {
    const offenders = listSourceFiles(join(process.cwd(), "src"))
      .map((file) => file.slice(process.cwd().length + 1))
      .filter(
        (relative) =>
          relative !== CONFIRM_HELPER &&
          !KNOWN_UNCONFIRMED.includes(relative) &&
          codeOf(join(process.cwd(), relative)).includes(
            "waitForTransactionReceipt",
          ),
      );

    expect(offenders).toEqual([]);
  });

  /**
   * Info: (20260818 - Luphia) 鑄造路徑是三條金流的共用點（分配、個人點數退款、
   * 離鏈餘額遷移）。一筆 reverted 的鑄造會讓三者各自留下「已完成」的紀錄，
   * 而鏈上什麼都沒發生：池扣了、分錄寫了、`refundedAt` 蓋了，
   * 而補償永遠不會觸發——因為程式認為它成功了。
   */
  it("鑄造路徑經過確認函式", () => {
    const member = codeOf(
      join(process.cwd(), "src", "services", "member.service.ts"),
    );
    expect(member).toMatch(/issuePurchasedPoints/);
    expect(member).toMatch(/await confirmTransaction\(/);
    expect(member).not.toMatch(/waitForTransactionReceipt/);
  });

  it("銷毀與鑄造所在的服務都不再直接等待收據", () => {
    for (const file of ["token.service.ts", "member.service.ts"]) {
      const code = codeOf(join(process.cwd(), "src", "services", file));
      expect(code).not.toMatch(/waitForTransactionReceipt/);
    }
  });

  // Info: (20260818 - Luphia) 例外清單只能變短：新增一處未確認的等待就會紅
  it("已知例外的清單沒有變長", () => {
    expect(KNOWN_UNCONFIRMED).toHaveLength(8);
  });
});

/**
 * Info: (20260818 - Luphia) 收回分配點數已停用，且要**明確地**停用（產品決定 20260818）。
 *
 * 讓它一路走到鏈上失敗會回一個通用的「操作失敗」，而那個訊息會讓客服以為是
 * 餘額問題或暫時性故障而不斷重試——這件事重試一百次也一樣。
 */
describe("收回分配點數已停用", () => {
  const service = readFileSync(
    join(process.cwd(), "src", "services", "team_wallet.service.ts"),
    "utf8",
  );

  it("以專屬錯誤碼擋下，而不是走到鏈上才失敗", () => {
    expect(service).toMatch(/TW_ALLOCATION_REVOKE_DISABLED/);
  });

  /**
   * Info: (20260818 - Luphia) 必須擋在**動任何餘額之前**：
   * 走到底會先讀淨分配量、再讀鏈上餘額，中間任何一步的錯誤訊息
   * 都會蓋掉「這個功能已停用」這個真正的原因。
   */
  it("擋在讀取餘額之前", () => {
    const guard = service.indexOf("TW_ALLOCATION_REVOKE_DISABLED");
    const netAllocated = service.indexOf("sumNetAllocatedToMember");
    expect(guard).toBeGreaterThan(-1);
    expect(netAllocated).toBeGreaterThan(guard);
  });
});

/**
 * Info: (20260818 - Luphia) 平台無權單方面銷毀成員錢包裡的代幣（調查 20260818）。
 *
 * `CreditPoint` 只有 `burnAndUnlock(uint256)`，燒的是 `msg.sender` 自己的餘額；
 * 沒有 `burn(address, uint256)`，而 `ABIS.CREDIT_POINT` 卻宣告了那個函式——
 * ABI 與部署的合約不一致，那正是 `chargeChainCredits` 當初看起來合理的原因。
 *
 * 這一條釘住的是**平台權限的邊界**，不是「扣個人點數做不到」：扣款由持有人簽章
 * 就做得到，產品裡已經在用（`ensurePersonalCreditCharge` 的兩段式訂單 → 成員錢包
 * `transfer` 給 `MEMBERSHIP_SYSTEM`）。哪天有人往合約補了平台可呼叫的 burn，
 * 這裡會紅——而那應該引發一次討論（它與條款 §3.3 的簽章承諾相反），不是直接接上去。
 */
describe("CreditPoint 合約與 ABI 的落差", () => {
  const contract = readFileSync(
    join(process.cwd(), "contracts", "credit_point.sol"),
    "utf8",
  );

  it("合約沒有可由他人呼叫的 burn(address, uint256)", () => {
    expect(contract).not.toMatch(/function\s+burn\s*\(\s*address/);
  });

  it("合約的銷毀只作用於 msg.sender", () => {
    expect(contract).toMatch(/function\s+burnAndUnlock\s*\(\s*uint256/);
    expect(contract).toMatch(/_burn\(msg\.sender,/);
  });
});
