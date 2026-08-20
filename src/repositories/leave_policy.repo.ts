import { Prisma } from "@/generated";
import { prisma } from "@/lib/prisma";
import {
  LeaveAccrualMethod,
  LeaveCycleBasis,
  LeaveProofRequirement,
  LeaveQuotaMode,
  LeaveRoundingMode,
  LeaveUnitBasis,
} from "@/constants/leave_policy";
import {
  ILeaveAccrualTierView,
  ILeavePolicyDetail,
  ILeavePolicyOption,
  ILeavePolicyWritable,
} from "@/interfaces/leave_policy_option";
import {
  assertAccrualTierTable,
  IStorableAccrualTier,
} from "@/repositories/leave_accrual_tier_invariant";
import {
  assertLeavePolicyUnit,
  assertNoMergeCycle,
} from "@/repositories/leave_policy_invariant";

/**
 * Info: (20260817 - Julian) 假別設定的存取層（L1–L6）。
 *
 * Info: (20260818 - Julian) L2–L6 於甲-1（`EmployeeHrFunctionAssignment`）落地後補上。
 * 在那之前只有 L1 的唯讀清單 —— 設定端點做出來也不知道該給誰看。
 *
 * ## 兩條不變式都擋在這一層
 *
 * `assertLeavePolicyUnit`（欄位組合不得互相矛盾）與 `assertAccrualTierTable`
 * （級距表必須是一張讀得出答案的階梯）。理由相同：假別設定的高風險寫入路徑
 * 不是 API 而是 **seed** —— 內建假別由它產生，而它繞過所有 service。
 */
export interface ILeavePolicyRepository {
  listActive(accountBookId: string): Promise<ILeavePolicyOption[]>;
  findDetailById(params: {
    accountBookId: string;
    leavePolicyId: string;
  }): Promise<ILeavePolicyDetail | null>;
  /**
   * Info: (20260818 - Julian) 設定畫面的清單，**含已停用的假別**。
   *
   * ToDo: (20260818 - Julian) 目前沒有端點用它 —— 計畫書 §10 沒有為
   * 「列出含已停用的假別」編號，而 L1 只回啟用中的。後果是停用一個
   * 自訂假別之後，它在設定畫面上就消失了，也就沒有辦法重新啟用。
   * 端點編號定案後接上（連同「重新啟用」那個動作）。
   */
  listDetails(accountBookId: string): Promise<ILeavePolicyDetail[]>;
  /** Info: (20260818 - Julian) 併計關係圖，供成環偵測。key 是假別 id */
  listMergeEdges(accountBookId: string): Promise<Record<string, string | null>>;
  create(params: {
    accountBookId: string;
    input: ILeavePolicyWritable;
  }): Promise<ILeavePolicyDetail>;
  update(params: {
    accountBookId: string;
    leavePolicyId: string;
    input: ILeavePolicyWritable;
  }): Promise<ILeavePolicyDetail>;
  /** Info: (20260818 - Julian) 停用而非刪除。回 false 表示那一列不存在 */
  deactivate(params: {
    accountBookId: string;
    leavePolicyId: string;
  }): Promise<boolean>;
  /**
   * Info: (20260820 - Julian) 兩支都收 `accountBookId`（review 第 6 輪 M21）。
   *
   * 原本只收 `leavePolicyId`，而 `replaceTiers` 的第一步是
   * `deleteMany({ where: { leavePolicyId } })` —— 一個猜到（或從別處撿到）
   * 別的帳本的 policy id 的呼叫端，可以把那個租戶的整張級距表清空。
   * 本檔第 324 行對 `update` 已經寫下同一句話：
   * 「租戶隔離不能靠呼叫端記得先查一次」。
   *
   * `LeaveAccrualTier` 沒有自己的 `accountBookId`（它掛在 `LeavePolicy` 下），
   * 因此條件走關聯：`leavePolicy: { accountBookId }`。
   */
  listTiers(params: {
    accountBookId: string;
    leavePolicyId: string;
  }): Promise<ILeaveAccrualTierView[]>;
  /** Info: (20260818 - Julian) 全量取代，非差異更新（計畫書 §10 L6） */
  replaceTiers(params: {
    accountBookId: string;
    leavePolicyId: string;
    tiers: readonly IStorableAccrualTier[];
  }): Promise<ILeaveAccrualTierView[]>;
}

/**
 * Info: (20260818 - Julian) 假別代號已被使用。
 *
 * 丟具名型別而不是讓 P2002 冒出去：代號重複是使用者的輸入問題，
 * 而原始的 Prisma 錯誤讀起來像故障（coding_guidelines §5.2）。
 */
export class LeavePolicyCodeTakenError extends Error {
  constructor(public readonly code: string) {
    super(`LeavePolicy: code already used (code=${code})`);
    this.name = "LeavePolicyCodeTakenError";
  }
}

/**
 * Info: (20260818 - Julian) Decimal → number。**只給不參與金額運算的欄位**。
 *
 * Info: (20260820 - Julian) 原本的註解寫「日數與比例都不參與金額運算」
 * （review 第 6 輪 M20）—— 前半對，後半錯。`annualDays` 與
 * `proofThresholdDays` 是天數，不會變成錢；`paidRatio` 會：
 * ADR 022 §3.4 明列它「會直接乘上工資變成錢」，而 ADR 003 §2 的原文是
 * 「🚨 後端 API 絕對禁止輸出浮點數比率」。那一欄改走 `toDecimalText`。
 */
const toNumber = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : Number(value);

/**
 * Info: (20260820 - Julian) Decimal → **十進位字串**（review 第 6 輪 M20）。
 *
 * `Number(new Prisma.Decimal("0.7"))` 是 0.69999999999999996，而下游把它
 * 乘上月薪就是一筆算錯的工資。字串一路傳到薪資模組，由那一側用它自己的
 * Decimal 讀進去 —— 中間沒有任何一步經過 double
 * （同 `LeaveRequest.totalDays` 與 `LeaveGrant.grantedDays` 的既有處置）。
 */
const toDecimalText = (value: Prisma.Decimal | null): string | null =>
  value === null ? null : value.toString();

const DETAIL_SELECT = {
  id: true,
  code: true,
  name: true,
  accrualMethod: true,
  cycleBasis: true,
  quotaMode: true,
  annualDays: true,
  unitBasis: true,
  minimumUnitMinutes: true,
  roundingMode: true,
  proratedRoundingScale: true,
  carryForwardMonths: true,
  cashOutOnExpiry: true,
  paidRatio: true,
  proofRequirement: true,
  proofThresholdDays: true,
  employerMayReject: true,
  recallable: true,
  mergesIntoPolicyId: true,
  legalBasis: true,
  isSystemDefined: true,
  isActive: true,
} as const;

// Info: (20260818 - Julian) Prisma 回的是字面量聯集，顯式轉回鏡像 enum（同 `findSchedules` 的處置）
const toDetail = (row: {
  id: string;
  code: string;
  name: string;
  accrualMethod: string;
  cycleBasis: string;
  quotaMode: string;
  annualDays: Prisma.Decimal | null;
  unitBasis: string;
  minimumUnitMinutes: number | null;
  roundingMode: string;
  proratedRoundingScale: number;
  carryForwardMonths: number;
  cashOutOnExpiry: boolean;
  paidRatio: Prisma.Decimal | null;
  proofRequirement: string;
  proofThresholdDays: Prisma.Decimal | null;
  employerMayReject: boolean;
  recallable: boolean;
  mergesIntoPolicyId: string | null;
  legalBasis: string | null;
  isSystemDefined: boolean;
  isActive: boolean;
}): ILeavePolicyDetail => ({
  id: row.id,
  code: row.code,
  name: row.name,
  accrualMethod: row.accrualMethod as LeaveAccrualMethod,
  cycleBasis: row.cycleBasis as LeaveCycleBasis,
  quotaMode: row.quotaMode as LeaveQuotaMode,
  annualDays: toNumber(row.annualDays),
  unitBasis: row.unitBasis as LeaveUnitBasis,
  minimumUnitMinutes: row.minimumUnitMinutes,
  roundingMode: row.roundingMode as LeaveRoundingMode,
  proratedRoundingScale: row.proratedRoundingScale,
  carryForwardMonths: row.carryForwardMonths,
  cashOutOnExpiry: row.cashOutOnExpiry,
  paidRatio: toDecimalText(row.paidRatio),
  proofRequirement: row.proofRequirement as LeaveProofRequirement,
  proofThresholdDays: toNumber(row.proofThresholdDays),
  employerMayReject: row.employerMayReject,
  recallable: row.recallable,
  mergesIntoPolicyId: row.mergesIntoPolicyId,
  legalBasis: row.legalBasis,
  isSystemDefined: row.isSystemDefined,
  isActive: row.isActive,
});

/**
 * Info: (20260818 - Julian) 可寫欄位 → Prisma data。
 *
 * Decimal 一律以**字串**落地（邊界防護，CLAUDE.md §2）：把 JS number 交給
 * Prisma 由它自己轉，等於在系統邊界上多一次沒有人看得到的浮點轉換。
 */
const toWriteData = (input: ILeavePolicyWritable) => ({
  code: input.code,
  name: input.name,
  accrualMethod: input.accrualMethod,
  cycleBasis: input.cycleBasis,
  quotaMode: input.quotaMode,
  annualDays: input.annualDays === null ? null : String(input.annualDays),
  unitBasis: input.unitBasis,
  minimumUnitMinutes: input.minimumUnitMinutes,
  roundingMode: input.roundingMode,
  proratedRoundingScale: input.proratedRoundingScale,
  carryForwardMonths: input.carryForwardMonths,
  cashOutOnExpiry: input.cashOutOnExpiry,
  paidRatio: input.paidRatio === null ? null : String(input.paidRatio),
  proofRequirement: input.proofRequirement,
  proofThresholdDays:
    input.proofThresholdDays === null ? null : String(input.proofThresholdDays),
  employerMayReject: input.employerMayReject,
  recallable: input.recallable,
  mergesIntoPolicyId: input.mergesIntoPolicyId,
  legalBasis: input.legalBasis,
});

// Info: (20260818 - Julian) 寫入前把可寫欄位交給不變式。id 供自指偵測，新建時為 null
const assertWritable = (
  input: ILeavePolicyWritable,
  leavePolicyId: string | null,
): void => {
  assertLeavePolicyUnit({
    id: leavePolicyId,
    accrualMethod: input.accrualMethod,
    cycleBasis: input.cycleBasis,
    quotaMode: input.quotaMode,
    unitBasis: input.unitBasis,
    minimumUnitMinutes: input.minimumUnitMinutes,
    annualDays: input.annualDays,
    cashOutOnExpiry: input.cashOutOnExpiry,
    mergesIntoPolicyId: input.mergesIntoPolicyId,
    proofRequirement: input.proofRequirement,
    proofThresholdDays: input.proofThresholdDays,
  });
};

class LeavePolicyRepository implements ILeavePolicyRepository {
  public async listActive(
    accountBookId: string,
  ): Promise<ILeavePolicyOption[]> {
    const policies = await prisma.leavePolicy.findMany({
      where: { accountBookId, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        quotaMode: true,
        unitBasis: true,
        minimumUnitMinutes: true,
        proofRequirement: true,
        proofThresholdDays: true,
        employerMayReject: true,
        legalBasis: true,
      },
      orderBy: { code: "asc" },
    });

    return policies.map((policy) => ({
      id: policy.id,
      code: policy.code,
      name: policy.name,
      quotaMode: policy.quotaMode as LeaveQuotaMode,
      unitBasis: policy.unitBasis as LeaveUnitBasis,
      minimumUnitMinutes: policy.minimumUnitMinutes,
      proofRequirement: policy.proofRequirement as LeaveProofRequirement,
      // Info: (20260817 - Julian) Decimal → number：門檻是比較用的天數，不參與金額運算
      proofThresholdDays:
        policy.proofThresholdDays === null
          ? null
          : Number(policy.proofThresholdDays),
      employerMayReject: policy.employerMayReject,
      legalBasis: policy.legalBasis,
    }));
  }

  public async findDetailById(params: {
    accountBookId: string;
    leavePolicyId: string;
  }): Promise<ILeavePolicyDetail | null> {
    const row = await prisma.leavePolicy.findFirst({
      where: { id: params.leavePolicyId, accountBookId: params.accountBookId },
      select: DETAIL_SELECT,
    });
    return row === null ? null : toDetail(row);
  }

  // Info: (20260818 - Julian) 設定畫面要看得到停用的假別，否則沒有辦法把它重新啟用
  public async listDetails(
    accountBookId: string,
  ): Promise<ILeavePolicyDetail[]> {
    const rows = await prisma.leavePolicy.findMany({
      where: { accountBookId },
      select: DETAIL_SELECT,
      orderBy: [{ isSystemDefined: "desc" }, { code: "asc" }],
    });
    return rows.map(toDetail);
  }

  public async listMergeEdges(
    accountBookId: string,
  ): Promise<Record<string, string | null>> {
    const rows = await prisma.leavePolicy.findMany({
      where: { accountBookId },
      select: { id: true, mergesIntoPolicyId: true },
    });
    return Object.fromEntries(
      rows.map((row) => [row.id, row.mergesIntoPolicyId]),
    );
  }

  public async create(params: {
    accountBookId: string;
    input: ILeavePolicyWritable;
  }): Promise<ILeavePolicyDetail> {
    assertWritable(params.input, null);

    /**
     * Info: (20260818 - Julian) 先查再建會在併發下兩邊都通過，因此靠唯一鍵
     * （`@@unique([accountBookId, code])`），撞上再轉成具名錯誤。
     */
    try {
      const created = await prisma.leavePolicy.create({
        data: {
          accountBookId: params.accountBookId,
          ...toWriteData(params.input),
          // Info: (20260818 - Julian) 只有 seed 產生內建假別，API 建的一律是租戶自訂
          isSystemDefined: false,
        },
        select: DETAIL_SELECT,
      });
      return toDetail(created);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new LeavePolicyCodeTakenError(params.input.code);
      }
      throw error;
    }
  }

  public async update(params: {
    accountBookId: string;
    leavePolicyId: string;
    input: ILeavePolicyWritable;
  }): Promise<ILeavePolicyDetail> {
    assertWritable(params.input, params.leavePolicyId);

    try {
      /**
       * Info: (20260818 - Julian) `updateMany` 帶 `accountBookId` 條件，
       * 而不是 `update({ where: { id } })` —— 後者查得到別的帳本的那一列。
       * 租戶隔離不能靠呼叫端記得先查一次。
       *
       * Info: (20260820 - Julian) 成環偵測也搬進這道閘（review 第 6 輪 M22）。
       *
       * `assertNoMergeCycle` 原本只由 `LeavePolicyService.update` 呼叫，而
       * `leave_policy_invariant.ts` 的檔頭自己論證過：
       * 「高風險寫入路徑不是 API —— 是 **seed**，而 seed 繞過所有 service」。
       * 一條只掛在 service 上的守衛，對它自己指名的那條路徑完全不設防。
       *
       * 讀圖與檢查在同一筆交易裡：分開做的話，兩個人同時把 A→B 與 B→A
       * 寫進去，各自讀到的圖都還沒有對方那一筆，兩邊都通過。
       */
      await prisma.$transaction(async (tx) => {
        const rows = await tx.leavePolicy.findMany({
          where: { accountBookId: params.accountBookId },
          select: { id: true, mergesIntoPolicyId: true },
        });
        assertNoMergeCycle({
          edges: Object.fromEntries(
            rows.map((row) => [row.id, row.mergesIntoPolicyId]),
          ),
          from: params.leavePolicyId,
          to: params.input.mergesIntoPolicyId,
        });

        const moved = await tx.leavePolicy.updateMany({
          where: {
            id: params.leavePolicyId,
            accountBookId: params.accountBookId,
          },
          data: toWriteData(params.input),
        });
        if (moved.count === 0) {
          throw new LeavePolicyMissingError(params.leavePolicyId);
        }
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new LeavePolicyCodeTakenError(params.input.code);
      }
      throw error;
    }

    const updated = await this.findDetailById(params);
    if (updated === null)
      throw new LeavePolicyMissingError(params.leavePolicyId);
    return updated;
  }

  public async deactivate(params: {
    accountBookId: string;
    leavePolicyId: string;
  }): Promise<boolean> {
    /**
     * Info: (20260818 - Julian) 停用而不是刪除。
     *
     * 已核准的假單、已授予的額度批次都指著這一列（`onDelete: Restrict`）——
     * 刪掉它等於讓歷史假單失去它的規則來源，而那是事後查不回來的。
     * 停用只影響「還能不能請」，不動任何既有紀錄。
     */
    const moved = await prisma.leavePolicy.updateMany({
      where: {
        id: params.leavePolicyId,
        accountBookId: params.accountBookId,
        isActive: true,
      },
      data: { isActive: false },
    });
    return moved.count > 0;
  }

  public async listTiers(params: {
    accountBookId: string;
    leavePolicyId: string;
  }): Promise<ILeaveAccrualTierView[]> {
    const rows = await prisma.leaveAccrualTier.findMany({
      where: {
        leavePolicyId: params.leavePolicyId,
        // Info: (20260820 - Julian) 租戶條件走關聯（review 第 6 輪 M21）
        leavePolicy: { accountBookId: params.accountBookId },
      },
      select: {
        minSeniorityMonths: true,
        days: true,
        incrementDaysPerYear: true,
        maxDays: true,
      },
      orderBy: { minSeniorityMonths: "asc" },
    });

    return rows.map((row) => ({
      minSeniorityMonths: row.minSeniorityMonths,
      days: Number(row.days),
      incrementDaysPerYear: toNumber(row.incrementDaysPerYear),
      maxDays: toNumber(row.maxDays),
    }));
  }

  public async replaceTiers(params: {
    accountBookId: string;
    leavePolicyId: string;
    tiers: readonly IStorableAccrualTier[];
  }): Promise<ILeaveAccrualTierView[]> {
    assertAccrualTierTable(params.tiers);

    /**
     * Info: (20260818 - Julian) 全量取代在同一個交易內完成（計畫書 §10 L6）。
     *
     * 差異更新在這裡是錯的：級距表是一張**整體**才有意義的階梯，
     * 逐列增修會讓中間狀態出現「有洞」或「日數倒退」的表，
     * 而授予 Worker 可能剛好在那一刻讀到它。
     */
    await prisma.$transaction(async (tx) => {
      /**
       * Info: (20260820 - Julian) 刪除也帶租戶條件（review 第 6 輪 M21）。
       *
       * 這是本檔破壞力最大的一句話：全量刪除。只用 `leavePolicyId` 當條件時，
       * 一個拿到別的帳本 policy id 的呼叫端可以把那個租戶的級距表整張清空，
       * 而級距表沒有版本、刪掉就沒有了。
       */
      await tx.leaveAccrualTier.deleteMany({
        where: {
          leavePolicyId: params.leavePolicyId,
          leavePolicy: { accountBookId: params.accountBookId },
        },
      });
      /**
       * Info: (20260820 - Julian) 刪了 0 列不代表跨租戶 —— 也可能本來就沒有級距。
       * 因此另外確認那個假別**屬於這個帳本**再寫入；否則新的級距會掛到
       * 一個不屬於呼叫者的假別下（刪除擋住了、新增沒擋等於只擋了一半）。
       */
      const owned = await tx.leavePolicy.count({
        where: {
          id: params.leavePolicyId,
          accountBookId: params.accountBookId,
        },
      });
      if (owned === 0) {
        throw new LeavePolicyMissingError(params.leavePolicyId);
      }
      await tx.leaveAccrualTier.createMany({
        data: params.tiers.map((tier) => ({
          leavePolicyId: params.leavePolicyId,
          minSeniorityMonths: tier.minSeniorityMonths,
          // Info: (20260818 - Julian) Decimal 以字串落地（邊界防護，CLAUDE.md §2）
          days: String(tier.days),
          incrementDaysPerYear:
            tier.incrementDaysPerYear === null
              ? null
              : String(tier.incrementDaysPerYear),
          maxDays: tier.maxDays === null ? null : String(tier.maxDays),
        })),
      });
    });

    return this.listTiers({
      accountBookId: params.accountBookId,
      leavePolicyId: params.leavePolicyId,
    });
  }
}

/**
 * Info: (20260818 - Julian) 那一列不存在，或不屬於這個帳本。
 *
 * 兩者回同一個型別是刻意的：分開會讓呼叫端有辦法問出「這個 id 存不存在」，
 * 而那是一個跨租戶的資訊洩漏（同 `resolveEmployee` 一律回 404 的理由）。
 */
export class LeavePolicyMissingError extends Error {
  constructor(public readonly leavePolicyId: string) {
    super(`LeavePolicy: not found (leavePolicyId=${leavePolicyId})`);
    this.name = "LeavePolicyMissingError";
  }
}

// Info: (20260818 - Julian) P2002 是唯一鍵衝突。不用 instanceof：Prisma 的錯誤類別跨版本換過位置
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === "P2002";

export const leavePolicyRepo: ILeavePolicyRepository =
  new LeavePolicyRepository();
