import { prisma } from "@/lib/prisma";
import {
  LeaveProofRequirement,
  LeaveQuotaMode,
  LeaveUnitBasis,
} from "@/constants/leave_policy";
import { ILeavePolicyOption } from "@/interfaces/leave_policy_option";

/**
 * Info: (20260817 - Julian) 假別的唯讀清單（L1）。
 *
 * 只讀不寫：L2–L6（新增／修改／停用／級距表）屬 HR，而 HR 角色沒有來源
 * （甲-1），做出來也不知道該給誰看。內建假別由 seed 產生，
 * demo 需要的只是「請假時選得到它們」。
 * ToDo: (20260817 - Julian) 甲-1 完成後補 L2–L6 與假別設定頁。
 */
export interface ILeavePolicyRepository {
  listActive(accountBookId: string): Promise<ILeavePolicyOption[]>;
}

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
}

export const leavePolicyRepo: ILeavePolicyRepository =
  new LeavePolicyRepository();
