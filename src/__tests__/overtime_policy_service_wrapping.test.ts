import { describe, it, expect, beforeEach } from "@jest/globals";
import { OvertimePolicyService } from "@/services/overtime_policy.service";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { IOvertimePolicyView } from "@/interfaces/overtime";
import { IEmployeeHrFunctionRepository } from "@/repositories/employee_hr_function.repo";
import { IOvertimePolicyRepository } from "@/repositories/overtime_policy.repo";
import { IOvertimeRequestContext } from "@/repositories/overtime_request_context.repo";
import {
  assertOvertimePolicy,
  IStorableOvertimePolicy,
} from "@/repositories/overtime_policy_invariant";

/**
 * Info: (20260820 - Julian) 不變式要收斂成 4xx（review 第 5 輪 M9）。
 *
 * `OvertimePolicyInvariantError` 不是 `AppError`，`update` 先前沒有包它，
 * 於是 route 走到最後的 catch-all 變成 **500**。會踩到的情境很平常：
 * HR 勾了「已取得工會同意」但忘了貼會議紀錄連結 —— 一個表單漏填，
 * 使用者看到的卻是伺服器故障。同 PR 的 `LeavePolicyService.write()` 已做對。
 */

/**
 * Info: (20260820 - Julian) 假 repository 跑的是**真的**那支不變式。
 *
 * 直接丟一個手捏的錯誤也能讓測試變綠，但那只證明「service 會包某個型別」，
 * 不證明「repository 真的會為這組輸入丟它」（checklist §1.7）。
 */
class FakePolicyRepo implements Partial<IOvertimePolicyRepository> {
  public written: IStorableOvertimePolicy | null = null;

  async upsert(params: IStorableOvertimePolicy & { accountBookId: string }) {
    assertOvertimePolicy(params);
    this.written = params;
  }
}

class FakeContext implements Partial<IOvertimeRequestContext> {
  async findPolicy() {
    return {
      extendedLimitAgreed: true,
      agreementRecordUrl: "https://union.example.tw/minutes/2026-07",
      agreedAt: new Date("2026-07-01T00:00:00Z"),
      compensatoryExpiryMonths: 6,
    };
  }
}

class FakeHrFunctions implements Partial<IEmployeeHrFunctionRepository> {
  async hasAnyFunction(): Promise<boolean> {
    return true;
  }
}

let repo: FakePolicyRepo;
let service: OvertimePolicyService;

const update = (input: {
  extendedLimitAgreed: boolean;
  agreementRecordUrl: string | null;
  agreedAt: string | null;
}): Promise<IOvertimePolicyView> =>
  service.update({
    accountBookId: "book-1",
    actorEmployeeId: "hr-1",
    input: { ...input, compensatoryExpiryMonths: 6 },
  });

const codeOf = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
  } catch (error) {
    if (error instanceof AppError) return error.apiCode;
    // Info: (20260820 - Julian) 非 AppError ＝ route 會把它收斂成 500，正是本檔要擋的
    throw new Error(`預期 AppError，實際收到 ${(error as Error).name}`);
  }
  throw new Error("預期會丟錯，但它成功了");
};

beforeEach(() => {
  repo = new FakePolicyRepo();
  service = new OvertimePolicyService(
    new FakeContext() as unknown as IOvertimeRequestContext,
    repo as unknown as IOvertimePolicyRepository,
    new FakeHrFunctions() as unknown as IEmployeeHrFunctionRepository,
  );
});

describe("加班政策：不變式落空時是 4xx，不是 500", () => {
  // Info: (20260820 - Julian) 對照組：記載齊全時照常寫入
  it("勾了同意且記載齊全時寫得進去", async () => {
    await update({
      extendedLimitAgreed: true,
      agreementRecordUrl: "https://union.example.tw/minutes/2026-07",
      agreedAt: "2026-07-01T00:00:00.000Z",
    });

    expect(repo.written?.extendedLimitAgreed).toBe(true);
  });

  /**
   * Info: (20260820 - Julian) 這一條是本檔的紅線：`codeOf` 對非 `AppError`
   * 會丟出一句指名的錯誤，因此包裝一旦被拿掉，紅的是這一條而不是某個 500 的日誌。
   */
  it("勾了同意卻沒貼連結：回專屬的 4xx", async () => {
    expect(
      await codeOf(() =>
        update({
          extendedLimitAgreed: true,
          agreementRecordUrl: null,
          agreedAt: "2026-07-01T00:00:00.000Z",
        }),
      ),
    ).toBe(API_ERRORS.VA_OVERTIME_AGREEMENT_RECORD_REQUIRED.code);
    expect(repo.written).toBeNull();
  });

  it("貼的不是 http(s) 連結：同樣是 4xx", async () => {
    expect(
      await codeOf(() =>
        update({
          extendedLimitAgreed: true,
          agreementRecordUrl: "javascript:alert(1)",
          agreedAt: "2026-07-01T00:00:00.000Z",
        }),
      ),
    ).toBe(API_ERRORS.VA_OVERTIME_AGREEMENT_RECORD_REQUIRED.code);
  });

  it("勾了同意卻沒填日期：同樣是 4xx", async () => {
    expect(
      await codeOf(() =>
        update({
          extendedLimitAgreed: true,
          agreementRecordUrl: "https://union.example.tw/minutes/2026-07",
          agreedAt: null,
        }),
      ),
    ).toBe(API_ERRORS.VA_OVERTIME_AGREEMENT_RECORD_REQUIRED.code);
  });
});
