import { AttendancePunch } from "@/generated";
import { prisma } from "@/lib/prisma";
import { PunchType, PunchVerification } from "@/constants/attendance";
import { HrPiiTable } from "@/constants/hr_pii";
import { assertStorablePii } from "@/repositories/hr_pii_invariant";

/**
 * Info: (20260813 - Julian) 打卡紀錄資料存取層（唯一碰 Prisma），不含業務判斷。
 *
 * append-only：刻意沒有 `update`／`delete`／`upsert`。出勤紀錄是法定文件，
 * 打錯卡的處理方式是由核准後的補登單產生新紀錄並標記原紀錄被取代，
 * 原紀錄永久保留以供稽核重建。
 */
export interface IAttendancePunchInput {
  /**
   * Info: (20260813 - Julian) 由呼叫端以 `randomUUID()` 產生，不可省略——
   * 它是 PII 加密 AAD 的一部分，加密發生在 insert 之前，schema 因此沒有 `@default(uuid())`（ADR 018 §3）。
   */
  id: string;
  accountBookId: string;
  employeeId: string;
  punchType: PunchType;
  verification: PunchVerification;
  punchedAt: Date;
  workDate: string;
  workLocationId: string;
  latitudeCipher: string;
  longitudeCipher: string;
  accuracyMeters: number | null;
  distanceMeters: number;
  piiAlgorithm: string;
  piiKeyVersion: number;
}

export interface IAttendancePunchRepository {
  create(input: IAttendancePunchInput): Promise<AttendancePunch>;
  findByEmployeeAndWorkDate(
    accountBookId: string,
    employeeId: string,
    workDate: string,
  ): Promise<AttendancePunch[]>;
  findByWorkDateRange(params: {
    accountBookId: string;
    employeeIds: string[];
    from: string;
    to: string;
  }): Promise<AttendancePunch[]>;
}

class AttendancePunchRepository implements IAttendancePunchRepository {
  // Info: (20260813 - Julian) 寫入前呼叫 assertStorablePii；正常路徑上到不了，但 repository 是唯一 DB 閘口，種子腳本／金鑰輪替等也會經過這裡（ADR 018 §5）
  public async create(input: IAttendancePunchInput): Promise<AttendancePunch> {
    assertStorablePii(HrPiiTable.ATTENDANCE_PUNCH, {
      ciphers: {
        latitudeCipher: input.latitudeCipher,
        longitudeCipher: input.longitudeCipher,
      },
      keyVersion: input.piiKeyVersion,
      algorithm: input.piiAlgorithm,
    });

    return prisma.attendancePunch.create({ data: input });
  }

  // Info: (20260813 - Julian) 依時間排序：判定引擎不要求順序，但除錯時看得懂
  public async findByEmployeeAndWorkDate(
    accountBookId: string,
    employeeId: string,
    workDate: string,
  ): Promise<AttendancePunch[]> {
    return prisma.attendancePunch.findMany({
      where: { accountBookId, employeeId, workDate },
      orderBy: { punchedAt: "asc" },
    });
  }

  /**
   * Info: (20260813 - Julian) 判定矩陣用：一次取整段期間、整批員工。`workDate` 是
   * "YYYY-MM-DD" 字串，字典序即日期序，可直接 gte/lte，走 `@@index([accountBookId, employeeId, workDate])`。
   *
   * 回傳含經緯度密文的完整列，呼叫端必須在 service 層投影掉其餘欄位——
   * 讓密文流到 API 回應是這個模組最容易犯的錯。
   */
  public async findByWorkDateRange(params: {
    accountBookId: string;
    employeeIds: string[];
    from: string;
    to: string;
  }): Promise<AttendancePunch[]> {
    const { accountBookId, employeeIds, from, to } = params;
    if (employeeIds.length === 0) return [];

    return prisma.attendancePunch.findMany({
      where: {
        accountBookId,
        employeeId: { in: employeeIds },
        workDate: { gte: from, lte: to },
      },
      orderBy: { punchedAt: "asc" },
    });
  }
}

export const attendancePunchRepo = new AttendancePunchRepository();
