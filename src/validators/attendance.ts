import { z } from "zod";
import { PunchType } from "@/constants/attendance";

/**
 * Info: (20260813 - Julian) 簽到系統的 API 驗證。
 * Zod schema 集中於此，`route.ts` 只呼叫 `safeParse`（CLAUDE.md §2）。
 */

/**
 * Info: (20260813 - Julian) 打卡請求。
 *
 * **沒有時間欄位，而且不能有。** `punchedAt` 由伺服器產生（護欄 G1）——
 * 竄改打卡時間是本系統價值最高的攻擊，只要 client 傳得進來就永遠擋不住。
 * 若日後有人為了「補打卡」想在這裡加一個時間欄位，那條路徑應該走補登申請單
 * （有簽核軌跡），不是放寬這支 schema。
 *
 * `accuracyMeters` 選填：部分裝置不回報精度。缺值時視為未知，
 * 由 service 依政策決定要不要放行（demo 放行，見 §D6 護欄 G3）。
 */
export const attendancePunchSchema = z.object({
  punchType: z.nativeEnum(PunchType),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().nonnegative().max(100_000).optional(),
});

export type IAttendancePunchInput = z.infer<typeof attendancePunchSchema>;
