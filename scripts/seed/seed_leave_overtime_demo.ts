import { randomUUID } from "crypto";
import {
  DEMO_ACCOUNT_BOOK_ID,
  PunchType,
  PunchVerification,
} from "@/constants/attendance";
import { HrPiiTable } from "@/constants/hr_pii";
import {
  LEAVE_POLICY_CODE,
  LeaveCashOutReason,
  LeaveDaySegment,
  LeaveGrantSource,
  LeavePolicyCode,
} from "@/constants/leave_policy";
import {
  OvertimeCompensationMode,
  OvertimeFilingType,
} from "@/constants/overtime";
import { encryptPii } from "@/lib/hr_pii_crypto";
import { prisma } from "@/lib/prisma";
import { attendancePunchRepo } from "@/repositories/attendance_punch.repo";
import { dbRepo } from "@/repositories/db.repo";
import { overtimePolicyRepo } from "@/repositories/overtime_policy.repo";
import { leaveRequestService } from "@/services/leave_request.service";
import { overtimeRequestService } from "@/services/overtime_request.service";

/**
 * Info: (20260818 - Julian) 假勤系統（請假 ＋ 加班）的展示資料。
 *
 * ## 它是 `seed_attendance_demo.ts` 的**增補**，不是替代
 *
 * 必須先跑那一支再跑這一支。那一支種的是組織、班別、排班、打卡與假別本身；
 * 這一支只加三樣它沒有的東西：
 *
 * 1. **加班政策**（`OvertimePolicy`）—— 沒有它，`extendedLimitAgreed` 讀成 false、
 *    `compensatoryExpiryMonths` 讀成 null，於是**任何一張換補休的加班單都核不過**
 *    （`VA_OVERTIME_COMP_EXPIRY_UNSET`）。這是目前 demo 環境唯一一個
 *    「功能寫好了但按下去一定失敗」的缺口。
 * 2. **加班單**（已核准／待簽核／已駁回各若干）—— 走的是**正式版同一條路徑**
 *    （`overtimeRequestService.submit` / `.approve`），因此分段、補休批次、
 *    折現事件、餘額快取全部由產品程式自己算出來。seed 不自己寫一份，
 *    理由同 `seedLeaveGrants` 走 `leaveBalanceService`：第二份實作遲早會分歧，
 *    而分歧的症狀是「demo 的數字是對的、正式環境的不是」。
 * 3. **待簽核的假單** —— 既有的 seed 只建已核准的假單，於是
 *    `/hr_management/leave/approval`（待我簽核）進去是空的，
 *    而那一頁正是假勤模組最想被看見的一頁。
 *
 * ## 為什麼要自己補兩筆打卡
 *
 * 既有 seed 的打卡只到 `HISTORY_TO`（08-12）加上演示當日（08-13）。
 * **平日延長工時**是實務上最常見的加班型態，而它需要一個「下班後還在場」
 * 的打卡事實才演得出「認列 = min(核准, 事實)」。08-14 在既有 seed 裡
 * 完全沒有打卡，因此拿它來放這兩筆不會動到任何既有的判定結果。
 *
 * ## 執行
 *
 * ```
 * npx tsx scripts/seed/seed_attendance_demo.ts   # 先
 * npx tsx scripts/seed/seed_leave_overtime_demo.ts
 * ```
 *
 * 前提：`HR_PII_KEY_V1` 已設定（打卡座標要加密）。座標取既有工區的圓心，
 * 因此**不需要** `DEMO_SITE_A_LAT` / `_LNG` —— 那兩個是前一支的前提。
 *
 * ## 可重複執行
 *
 * 清空範圍限定在本帳本、且限定在本腳本自己種的那幾類資料
 * （加班單與其衍生物、本腳本指定日期的假單與打卡）。
 * **不動既有 seed 的任何一列** —— 一支會把前一支的成果清掉的增補腳本，
 * 遲早會有人以錯誤的順序跑它。
 */

const ACCOUNT_BOOK_ID = DEMO_ACCOUNT_BOOK_ID;

/**
 * Info: (20260818 - Julian) 台北固定 UTC+8。與既有 seed 同樣的簡化與同樣的理由：
 * 正式路徑一律走 `@/lib/utils/attendance_time` 的 `Intl` 換算，
 * 這裡寫死只是為了讓「這一筆是當地幾點」在讀腳本時一眼看得出來。
 */
const TAIPEI_OFFSET_HOURS = 8;

/** Info: (20260818 - Julian) 當地時分 → 絕對時點 */
const at = (isoDate: string, hour: number, minute: number): Date => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(
    Date.UTC(year, month - 1, day, hour - TAIPEI_OFFSET_HOURS, minute),
  );
};

/** Info: (20260818 - Julian) 當地 00:00 起算的分鐘數 → 絕對時點（>= 1440 表次日） */
const atMinute = (isoDate: string, minuteOfDay: number): Date =>
  at(isoDate, 0, minuteOfDay);

/**
 * Info: (20260818 - Julian) 演示用的日期。
 *
 * 全部落在既有 seed 的排班範圍（08-01 ~ 08-21）內 —— 沒有排班的日子
 * 送不出加班單（`VA_OVERTIME_DAY_NOT_SCHEDULED`），那是刻意的護欄。
 */
// Info: (20260818 - Julian) 週六．休息日．既有 seed 已有「颱風後搶修」的打卡（08:00–17:00）
const OT_REST_DAY = "2026-08-08";
// Info: (20260818 - Julian) 週五．上班日．既有 seed 無打卡，本腳本自己補「加班到晚上」的打卡
const OT_WEEKDAY = "2026-08-14";
// Info: (20260818 - Julian) 週六．休息日．全無打卡 → 走自陳（MANUAL_DECLARATION）
const OT_DECLARED_DAY = "2026-08-15";
// Info: (20260818 - Julian) 週一．待簽核的事後補單放這裡
const OT_PENDING_DAY = "2026-08-17";
// Info: (20260818 - Julian) 週二．待簽核的**事前**申請放這裡（送出時點在前一天傍晚）
const OT_ADVANCE_DAY = "2026-08-18";
/**
 * Info: (20260818 - Julian) 超時情境用的日子：週五、上班日、**該員當天無打卡**。
 *
 * 與 `OT_WEEKDAY` 同一天，但那天補打卡的是 EMP006 與 EMP008；EMP007 沒有，
 * 因此她那張單走自陳、認列等於核准，才踩得到上限。
 */
const OT_OVER_LIMIT_DAY = OT_WEEKDAY;

// Info: (20260818 - Julian) 本腳本負責的假單日期。與加班的待簽日刻意錯開，避免同一人同一天兩件事
const LEAVE_CASE_DATES = [
  "2026-08-18",
  "2026-08-19",
  "2026-08-20",
  "2026-08-21",
];

/**
 * Info: (20260818 - Julian) 補休期限六個月。
 *
 * §32-1 只說「由勞雇雙方協商」，法無明文上限（見 `OvertimePolicy` 的 ToDo）。
 * 六個月是實務上常見的協商結果，而它在這裡是**示範值不是預設值** ——
 * 正式帳本必須由 HR 在設定畫面自己填，填不出來就換不了補休，那正是規則要的。
 */
const COMPENSATORY_EXPIRY_MONTHS = 6;

const AGREEMENT_URL =
  "https://demo.isunfa.example/labor-management-meeting/2026-01-15.pdf";

interface IOvertimeCase {
  /** Info: (20260818 - Julian) 供人閱讀的編號，只出現在 console */
  label: string;
  employeeNo: string;
  workDate: string;
  filingType: OvertimeFilingType;
  compensationMode: OvertimeCompensationMode;
  requestedStartMinute: number;
  requestedEndMinute: number;
  reason: string;
  /** Info: (20260818 - Julian) 送出時刻（當地）。會回寫 `createdAt`，見 `submitOvertime` */
  submittedAt: Date;
  /** Info: (20260818 - Julian) null = 留在待簽核；否則由這位決行 */
  decidedBy: string | null;
  decision?: "approve" | "reject";
  /** Info: (20260818 - Julian) 未指定即照申請的整段核准 */
  approvedMinutes?: number;
  note: string;
}

/**
 * Info: (20260818 - Julian) 加班的九個案例。
 *
 * 排列的原則與既有 seed 的「刻意佈置的異常」相同：**一片乾淨的資料什麼也證明不了。**
 * 這九筆刻意覆蓋九條不同的路徑，每一條在畫面上長得不一樣：
 *
 * - 休息日加班費，跨前 2 小時與逾 2 小時兩個級距（OT-1）
 * - 申請 10 小時但打卡只到 9 小時 → 認列 9 小時（OT-1，ADR 024 §2）
 * - 平日延長工時 + 換補休 → 額度卡上真的多出 0.375 天補休（OT-2）
 * - 主管核准少於申請 → 未核准的分鐘被交出去而不是丟掉（OT-3，ADR 024 §2.1）
 * - 全日無打卡的自陳 → L28 的「自陳」欄不再是 0（OT-4）
 * - 被駁回的單 → 駁回後不得留著核准分鐘（OT-5）
 * - 待簽核的事後補單 ×2（OT-6／OT-7）與事前申請 ×1（OT-8）→ 加班簽核頁有東西可按
 * - 一張**核准時會被單日上限擋下**的單（OT-9）→ 超時的紅字與報告書入口有東西可演
 *
 * 刻意**沒有**放進來的一條：EMP005 在 08-08 也有假日打卡（既有 seed 的
 * 「颱風後搶修」），而他沒有任何一張加班單。那 540 分鐘會原封不動出現在
 * L29 的「未核准時段」—— 一個有打卡事實、沒有人核准過的加班，
 * 正是勞資爭議最常見的起點（ADR 024 §2.1）。它必須留白才看得見。
 */
const OVERTIME_CASES: IOvertimeCase[] = [
  {
    label: "OT-1",
    employeeNo: "EMP006",
    workDate: OT_REST_DAY,
    filingType: OvertimeFilingType.POST_HOC,
    compensationMode: OvertimeCompensationMode.PAYMENT,
    // Info: (20260818 - Julian) 申請 08:00–18:00，但打卡只到 17:00
    requestedStartMinute: 480,
    requestedEndMinute: 1080,
    reason: "颱風後橋面搶修，配合機具進場時間延長至傍晚",
    submittedAt: at("2026-08-10", 9, 30),
    decidedBy: "EMP005",
    decision: "approve",
    note: "休息日加班費：核准 600 分，打卡事實 540 分 → 認列 540（min(核准, 事實)）",
  },
  {
    label: "OT-2",
    employeeNo: "EMP006",
    workDate: OT_WEEKDAY,
    filingType: OvertimeFilingType.POST_HOC,
    compensationMode: OvertimeCompensationMode.COMPENSATORY_LEAVE,
    // Info: (20260818 - Julian) 17:00–20:00，班別窗（07:30–17:00）之後
    requestedStartMinute: 1020,
    requestedEndMinute: 1200,
    reason: "預力樑吊裝作業延續，需留場監看至完成",
    submittedAt: at(OT_WEEKDAY, 20, 15),
    decidedBy: "EMP005",
    decision: "approve",
    /**
     * Info: (20260818 - Julian) 與 OT-1 同一個人、不同的補償方式 —— 刻意的。
     * §32-1 的選擇權在**勞工**手上，同一個人這個月選加班費、下個月選補休
     * 是常態；把兩種都放在同一位身上，才看得出那是一個欄位而不是兩種制度。
     */
    note: "平日延長工時 180 分 → 前 2 小時與逾 2 小時兩個級距，各一批補休（0.25 + 0.125 天）",
  },
  {
    label: "OT-3",
    employeeNo: "EMP008",
    workDate: OT_WEEKDAY,
    filingType: OvertimeFilingType.POST_HOC,
    compensationMode: OvertimeCompensationMode.COMPENSATORY_LEAVE,
    // Info: (20260818 - Julian) 17:00–19:00，剛好落在前 2 小時級距內
    requestedStartMinute: 1020,
    requestedEndMinute: 1140,
    reason: "混凝土試體養護紀錄補作",
    submittedAt: at(OT_WEEKDAY, 19, 10),
    decidedBy: "EMP005",
    decision: "approve",
    /**
     * Info: (20260818 - Julian) **主管核准的比申請的少** —— 這是唯一一張這樣的單。
     *
     * 申請 120 分、打卡事實也是 120 分，但主管只核 60 分。於是
     * 認列 60、未核准 60 —— 而那 60 分鐘不會被靜默丟棄，
     * `approve` 的回傳把它交出去（ADR 024 §2.1）。這條路徑沒有別的案例走得到。
     */
    approvedMinutes: 60,
    note: "核准少於申請：申請 120 分、核准 60 分 → 認列 60、未核准 60；換補休 0.125 天",
  },
  {
    label: "OT-4",
    employeeNo: "EMP007",
    workDate: OT_DECLARED_DAY,
    filingType: OvertimeFilingType.POST_HOC,
    compensationMode: OvertimeCompensationMode.COMPENSATORY_LEAVE,
    // Info: (20260818 - Julian) 09:00–13:00
    requestedStartMinute: 540,
    requestedEndMinute: 780,
    reason: "假日外業補測，工區無打卡機具",
    submittedAt: at(OT_PENDING_DAY, 9, 20),
    decidedBy: "EMP005",
    decision: "approve",
    note: "全日無打卡 → 自陳（MANUAL_DECLARATION）；仍認列，但在 L28／L29 單獨列出",
  },
  {
    label: "OT-5",
    employeeNo: "EMP008",
    workDate: OT_DECLARED_DAY,
    filingType: OvertimeFilingType.POST_HOC,
    compensationMode: OvertimeCompensationMode.PAYMENT,
    requestedStartMinute: 480,
    requestedEndMinute: 1020,
    reason: "假日整理材料倉庫",
    submittedAt: at(OT_PENDING_DAY, 9, 40),
    decidedBy: "EMP005",
    decision: "reject",
    note: "已駁回：駁回後不得留下核准分鐘（不變式擋），清單上要看得出來",
  },
  {
    label: "OT-6",
    employeeNo: "EMP006",
    workDate: OT_PENDING_DAY,
    filingType: OvertimeFilingType.POST_HOC,
    compensationMode: OvertimeCompensationMode.PAYMENT,
    // Info: (20260818 - Julian) 17:00–19:30
    requestedStartMinute: 1020,
    requestedEndMinute: 1170,
    reason: "監造抽查前置準備",
    submittedAt: at(OT_PENDING_DAY, 20, 30),
    decidedBy: null,
    note: "待簽核（事後補單）",
  },
  {
    label: "OT-7",
    employeeNo: "EMP007",
    workDate: OT_PENDING_DAY,
    filingType: OvertimeFilingType.POST_HOC,
    compensationMode: OvertimeCompensationMode.COMPENSATORY_LEAVE,
    requestedStartMinute: 1020,
    requestedEndMinute: 1140,
    reason: "樁位放樣資料整理",
    submittedAt: at(OT_PENDING_DAY, 19, 50),
    decidedBy: null,
    note: "待簽核（事後補單，選擇換補休）",
  },
  {
    label: "OT-9",
    employeeNo: "EMP007",
    workDate: OT_OVER_LIMIT_DAY,
    filingType: OvertimeFilingType.POST_HOC,
    compensationMode: OvertimeCompensationMode.PAYMENT,
    /**
     * Info: (20260818 - Julian) 17:00–22:00，五個小時。
     *
     * 工地日班的應工作分鐘是 480，480 + 300 = 780 > 720 —— **核准時必定撞上
     * §32 II 的「單日正常工時與延長工時合計不得超過 12 小時」**。
     *
     * 這一張是**刻意留著撞牆**的：上限是硬擋，而硬擋沒有東西可以演的話，
     * 看起來就像沒做。挑單日而不是單月，是因為單月要先累積到 54 小時才踩得到，
     * 而 480 + 300 觀眾可以自己心算。
     *
     * 選在 08-14 是因為那天 EMP007 **沒有任何打卡** —— 有打卡的話認列會被
     * `min(核准, 事實)` 壓到十幾分鐘，上限就踩不到了，這張單會安靜地核准成功。
     */
    requestedStartMinute: 1020,
    requestedEndMinute: 1320,
    reason: "邊坡擋土牆灌漿作業不可中斷，需連續施作至完成",
    submittedAt: at(OT_OVER_LIMIT_DAY, 22, 20),
    decidedBy: null,
    note: "待簽核，**核准時會被單日上限擋下**（480 + 300 = 780 > 720）—— 超時情境的演示素材",
  },
  {
    label: "OT-8",
    employeeNo: "EMP008",
    workDate: OT_ADVANCE_DAY,
    filingType: OvertimeFilingType.ADVANCE,
    compensationMode: OvertimeCompensationMode.PAYMENT,
    requestedStartMinute: 1020,
    requestedEndMinute: 1200,
    reason: "隔日鋼筋綁紮趕工，事前報備延長工時",
    /**
     * Info: (20260818 - Julian) 送出時刻在**前一天傍晚** —— 事前申請的定義是
     * 「在班別窗開始之前送出」，不是「在加班開始之前送出」（ADR 024 §3）。
     * 標成 ADVANCE 卻在窗開了之後才送，會被 `assertOvertimeFilingType` 擋下。
     */
    submittedAt: at(OT_PENDING_DAY, 21, 0),
    decidedBy: null,
    note: "待簽核（事前申請）",
  },
];

interface ILeaveCase {
  label: string;
  employeeNo: string;
  policyCode: LeavePolicyCode;
  workDates: string[];
  reason: string;
  /**
   * Info: (20260818 - Julian) 有值即為**自訂時段**（`CUSTOM`），否則整天（`FULL`）。
   *
   * 兩者都要有：請假表單現在一律填起訖，但**既有資料仍是整天**，
   * 而假單明細頁對兩種都要顯示得出來。只種其中一種，就會有一半的路徑
   * 從來沒有被人看過。當日 00:00 起算的分鐘數。
   */
  startMinute?: number;
  endMinute?: number;
  submittedAt: Date;
  /**
   * Info: (20260818 - Julian) 有值即由這位當場駁回；未給則留在待簽核。
   *
   * **只駁回，不核准。** 核准會扣帳、填 `activeKey`、把排班投影成 `LEAVE` ——
   * 三個副作用，而重跑時每一個都要精確地反轉回去。駁回什麼都不寫，
   * 只改狀態（`rejectStep`），因此重跑時一個 `deleteMany` 就乾淨了。
   * 而「核准」這個狀態本來就該在演示現場當場產生，不該預先種好
   * （同執行手冊對銷假徵詢的處置）。
   */
  rejectedBy?: string;
  rejectComment?: string;
  note: string;
}

/**
 * Info: (20260818 - Julian) 假單。四張待簽核、一張已駁回。
 *
 * 既有 seed 只建**已核准**的假單（演示當日那兩張），因此「待我簽核」是空的，
 * 而申請人自己的「我的假單」只有一種狀態。這四張補的正是這兩個空白：
 *
 * - 一天與三天各有 —— 通則規定未滿 3 天一關、3 天以上兩關，
 *   而那條規則若沒有一張三天的假單，畫面上永遠看不出來。
 * - 一張已駁回 —— 一份每一列都長一樣的清單，看不出它有狀態這件事。
 * - 一張**以小時請**的（LV-5）—— 其餘都是整天，而整天看不出最小單位與進位。
 *
 * **刻意沒有預先種「已核准」**：核准要扣帳、填 `activeKey`、把排班投影成
 * `LEAVE`，那三件事該在演示現場當場發生（EMP005 按下去、額度隨即少一天），
 * 而不是一進畫面就已經是既成事實。
 */
const LEAVE_CASES: ILeaveCase[] = [
  {
    label: "LV-1",
    employeeNo: "EMP006",
    policyCode: LEAVE_POLICY_CODE.ANNUAL,
    workDates: ["2026-08-20"],
    reason: "陪同家人就醫",
    submittedAt: at(OT_PENDING_DAY, 8, 40),
    note: "特休 1 天 → 單關（直屬主管 EMP005）",
  },
  {
    label: "LV-2",
    employeeNo: "EMP007",
    policyCode: LEAVE_POLICY_CODE.SICK,
    workDates: ["2026-08-18"],
    reason: "感冒發燒，已就診",
    submittedAt: at(OT_ADVANCE_DAY, 7, 55),
    note: "病假 1 天 → 單關",
  },
  {
    label: "LV-3",
    employeeNo: "EMP008",
    policyCode: LEAVE_POLICY_CODE.ANNUAL,
    workDates: ["2026-08-19", "2026-08-20", "2026-08-21"],
    reason: "返鄉參加婚宴",
    submittedAt: at(OT_PENDING_DAY, 13, 15),
    note: "特休 3 天 → 兩關（相鄰同一人時會併關，`mergedFromKinds` 記錄被併掉的那一關）",
  },
  {
    label: "LV-5",
    employeeNo: "EMP007",
    policyCode: LEAVE_POLICY_CODE.ANNUAL,
    workDates: ["2026-08-19"],
    /**
     * Info: (20260818 - Julian) 09:00–10:30，**一個半小時**。
     *
     * 刻意挑一個不整除的長度：特休的最小單位是 60 分鐘、捨入方向是 UP，
     * 於是 90 分鐘會被計成 **120 分鐘**（0.25 天）。那 30 分鐘的差額是
     * 「不足一單位以一單位計」這條對勞工不利的預設在畫面上唯一看得見的地方
     * （`LeaveRoundingMode` 的說明要求它必須載明於工作規則）。
     *
     * 選 90 而不是 120，就是為了讓那一行橘字有東西可說。
     */
    startMinute: 540,
    endMinute: 630,
    reason: "上午回診複檢",
    submittedAt: at(OT_ADVANCE_DAY, 15, 10),
    note: "小時制請假：實際 90 分鐘 → 依最小單位計為 120 分鐘（0.25 天）",
  },
  {
    label: "LV-4",
    employeeNo: "EMP006",
    policyCode: LEAVE_POLICY_CODE.PERSONAL,
    workDates: ["2026-08-21"],
    reason: "私人事務",
    submittedAt: at(OT_PENDING_DAY, 16, 20),
    rejectedBy: "EMP005",
    rejectComment: "當日有監造查驗，請改期",
    note: "已駁回 → 「我的假單」才看得出狀態不只有一種",
  },
];

/**
 * Info: (20260818 - Julian) 本腳本自己補的打卡：08-14 兩位現場人員加班到晚上。
 *
 * 只有這兩筆，而且只在這一天 —— 既有 seed 的打卡範圍是 08-03 ~ 08-13，
 * 動它等於動既有的判定結果，而那些結果是被 `verifyGeneratedData()` 驗算過的。
 */
const OVERTIME_PUNCHES: {
  employeeNo: string;
  workDate: string;
  inMinute: number;
  outMinute: number;
  note: string;
}[] = [
  {
    employeeNo: "EMP006",
    workDate: OT_WEEKDAY,
    inMinute: 445,
    outMinute: 1210,
    note: "07:25 進場、20:10 離場（OT-2 的打卡事實）",
  },
  {
    employeeNo: "EMP008",
    workDate: OT_WEEKDAY,
    inMinute: 448,
    outMinute: 1145,
    note: "07:28 進場、19:05 離場（OT-3 的打卡事實）",
  },
];

/**
 * Info: (20260818 - Julian) 清空**本腳本自己種的**那幾類資料。
 *
 * 順序由子而父，與既有 seed 的 `clearDemoData` 同一套判準：
 * `LeaveLedgerEntry.leaveGrant` 是 Restrict，`LeaveGrant.overtimeSegment` 也是
 * Restrict —— 補休批次沒清掉之前，產生它的加班分段刪不動。
 * `OvertimeSegment` 掛 `OvertimeRequest` 是 Cascade，因此不必單獨刪。
 */
async function clearOwnData(): Promise<void> {
  await prisma.leaveCashOutEvent.deleteMany({
    where: {
      accountBookId: ACCOUNT_BOOK_ID,
      reason: LeaveCashOutReason.OVERTIME_PAYMENT,
    },
  });

  await prisma.leaveLedgerEntry.deleteMany({
    where: {
      leaveGrant: {
        accountBookId: ACCOUNT_BOOK_ID,
        source: LeaveGrantSource.OVERTIME_CONVERSION,
      },
    },
  });
  await prisma.leaveGrant.deleteMany({
    where: {
      accountBookId: ACCOUNT_BOOK_ID,
      source: LeaveGrantSource.OVERTIME_CONVERSION,
    },
  });

  /**
   * Info: (20260818 - Julian) 補休的餘額快取一併刪掉。
   *
   * 批次沒了而快取還在，`LeaveBalance` 會停在上一次執行的數字 ——
   * 那是一個沒有任何分錄支撐得住的餘額，而它會直接顯示在額度卡上。
   * 核准補休時 `writeBalance` 會重新建立這一列（ADR 022 §4）。
   */
  const compensatory = await prisma.leavePolicy.findFirst({
    where: {
      accountBookId: ACCOUNT_BOOK_ID,
      code: LEAVE_POLICY_CODE.COMPENSATORY,
    },
    select: { id: true },
  });
  if (compensatory !== null) {
    await prisma.leaveBalance.deleteMany({
      where: {
        accountBookId: ACCOUNT_BOOK_ID,
        leavePolicyId: compensatory.id,
      },
    });
  }

  await prisma.overtimeRequest.deleteMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
  });

  /**
   * Info: (20260818 - Julian) 假單只刪**本腳本指定日期、且仍在待簽核**的那幾張。
   *
   * 兩個條件都必要，理由不同：
   *
   * - 限日期 —— 既有 seed 在演示當日建的那兩張不歸這支腳本管。
   * - 限 PENDING —— 一張**已核准**的假單背後有 `LeaveLedgerEntry` 的扣減分錄，
   *   而 `LeaveDay` 那一側是 SetNull：直接刪假單，分錄會留下來繼續扣著額度，
   *   而沒有任何一張假單解釋得了它。那是一個查不出來的餘額短少，
   *   所以這裡不刪，改為當場中止並說出該怎麼重置。
   */
  const ownDays = await prisma.leaveDay.findMany({
    where: {
      workDate: { in: LEAVE_CASE_DATES },
      leaveRequest: { accountBookId: ACCOUNT_BOOK_ID },
    },
    select: { id: true },
  });
  const consumed =
    ownDays.length === 0
      ? 0
      : await prisma.leaveLedgerEntry.count({
          where: { leaveDayId: { in: ownDays.map((day) => day.id) } },
        });
  if (consumed > 0) {
    throw new Error(
      `本腳本負責的日期（${LEAVE_CASE_DATES.join("、")}）上已有 ${consumed} 筆扣帳分錄。\n` +
        "   那代表有假單在這些日子被核准過（多半是彩排時當場按的）。直接刪假單會留下\n" +
        "   一筆沒有任何單據解釋得了的扣減，而那是查不出來的餘額短少。\n" +
        "   請先重跑 npx tsx scripts/seed/seed_attendance_demo.ts 取得乾淨的帳本，再跑本腳本。",
    );
  }

  await prisma.leaveRequest.deleteMany({
    where: {
      accountBookId: ACCOUNT_BOOK_ID,
      days: { some: { workDate: { in: LEAVE_CASE_DATES } } },
    },
  });

  await prisma.attendancePunch.deleteMany({
    where: { accountBookId: ACCOUNT_BOOK_ID, workDate: OT_WEEKDAY },
  });
}

async function mustFindEmployeeId(employeeNo: string): Promise<string> {
  const employee = await prisma.employee.findFirst({
    where: { accountBookId: ACCOUNT_BOOK_ID, employeeNo },
    select: { id: true },
  });
  if (employee === null) {
    throw new Error(
      `找不到員工 ${employeeNo} —— 請先執行 npx tsx scripts/seed/seed_attendance_demo.ts`,
    );
  }
  return employee.id;
}

/**
 * Info: (20260818 - Julian) 加班政策。**這是目前 demo 環境唯一的硬缺口。**
 *
 * 沒有這一列，`buildApprovalContext` 會把 `extendedLimitAgreed` 讀成 false
 * （安全的預設）、`compensatoryExpiryMonths` 讀成 null，於是每一張選了
 * 換補休的加班單都會在核准時死在 `VA_OVERTIME_COMP_EXPIRY_UNSET` ——
 * 而那個錯誤看起來像是功能沒做完，實際上是設定沒填。
 */
async function seedOvertimePolicy(): Promise<void> {
  await overtimePolicyRepo.upsert({
    accountBookId: ACCOUNT_BOOK_ID,
    // Info: (20260818 - Julian) 已經勞資會議同意放寬至單月 54 小時（§32 III）
    extendedLimitAgreed: true,
    agreementRecordUrl: AGREEMENT_URL,
    agreedAt: at("2026-01-15", 14, 0),
    compensatoryExpiryMonths: COMPENSATORY_EXPIRY_MONTHS,
  });
  console.log(
    `   加班政策：單月上限放寬 54 小時（已備查）、補休期限 ${COMPENSATORY_EXPIRY_MONTHS} 個月`,
  );
}

/**
 * Info: (20260818 - Julian) 補上 08-14 的加班打卡。
 *
 * 座標取該員最近一次打卡所命中的工區圓心，而不是另外給一組 ——
 * 給一組新的就要重跑圍欄重疊檢查，而那支斷言在前一支腳本裡。
 * 走 repository 而不是 `prisma.create`：`assertStorablePii` 點名要防的
 * 正是種子腳本這條路徑。
 */
async function seedOvertimePunches(): Promise<void> {
  for (const punch of OVERTIME_PUNCHES) {
    const employeeId = await mustFindEmployeeId(punch.employeeNo);

    const reference = await prisma.attendancePunch.findFirst({
      where: { accountBookId: ACCOUNT_BOOK_ID, employeeId },
      orderBy: { punchedAt: "desc" },
      select: { workLocationId: true },
    });
    if (reference === null) {
      throw new Error(
        `${punch.employeeNo} 沒有任何既有打卡，取不到工區 —— 請先執行 seed_attendance_demo.ts`,
      );
    }

    const location = await prisma.workLocation.findUnique({
      where: { id: reference.workLocationId },
      select: { latitude: true, longitude: true },
    });
    if (location === null) {
      throw new Error(`工區 ${reference.workLocationId} 不存在`);
    }

    const pairs: { punchType: PunchType; minuteOfDay: number }[] = [
      { punchType: PunchType.CLOCK_IN, minuteOfDay: punch.inMinute },
      { punchType: PunchType.CLOCK_OUT, minuteOfDay: punch.outMinute },
    ];

    for (const { punchType, minuteOfDay } of pairs) {
      const id = randomUUID();
      const context = {
        table: HrPiiTable.ATTENDANCE_PUNCH,
        recordId: id,
      } as const;
      const latitude = encryptPii(String(location.latitude), {
        ...context,
        field: "latitudeCipher",
      });
      const longitude = encryptPii(String(location.longitude), {
        ...context,
        field: "longitudeCipher",
      });

      await attendancePunchRepo.create({
        id,
        accountBookId: ACCOUNT_BOOK_ID,
        employeeId,
        punchType,
        verification: PunchVerification.GPS,
        punchedAt: atMinute(punch.workDate, minuteOfDay),
        workDate: punch.workDate,
        workLocationId: reference.workLocationId,
        latitudeCipher: latitude.cipher,
        longitudeCipher: longitude.cipher,
        accuracyMeters: 12,
        // Info: (20260818 - Julian) 取圓心，距離即 0。演示要的是「他在場」，不是定位誤差
        distanceMeters: 0,
        piiAlgorithm: latitude.algorithm,
        piiKeyVersion: latitude.keyVersion,
      });
    }

    console.log(
      `   打卡：${punch.employeeNo} ${punch.workDate} — ${punch.note}`,
    );
  }
}

/**
 * Info: (20260818 - Julian) 送出一張加班單，並把送出時刻回寫到 `createdAt`。
 *
 * ## 為什麼要回寫
 *
 * `createdAt` 是 `@default(now())`，也就是「跑 seed 的那一刻」。而核准時
 * `assertOvertimeFilingType` 會拿它去比對事前／事後 —— 一張標成 ADVANCE、
 * 卻在 08-18 當天跑 seed 產生的單子，`createdAt` 會落在班別窗開了之後，
 * 於是**演示現場按下核准就會被不變式擋掉**。
 *
 * 回寫之後兩件事同時成立：不變式比對的是我們宣稱的送出時刻，
 * 而畫面上顯示的送出時間也與敘事一致。這是 seed 才做得的事
 * （正式路徑沒有任何一支端點寫得到 `createdAt`）。
 */
async function submitOvertime(
  overtimeCase: IOvertimeCase,
  employeeId: string,
): Promise<string> {
  const summary = await overtimeRequestService.submit({
    accountBookId: ACCOUNT_BOOK_ID,
    employeeId,
    input: {
      workDate: overtimeCase.workDate,
      filingType: overtimeCase.filingType,
      compensationMode: overtimeCase.compensationMode,
      requestedStartMinute: overtimeCase.requestedStartMinute,
      requestedEndMinute: overtimeCase.requestedEndMinute,
      reason: overtimeCase.reason,
      isEmergency: false,
    },
    observedAt: overtimeCase.submittedAt,
  });

  await prisma.overtimeRequest.update({
    where: { id: summary.id },
    data: { createdAt: overtimeCase.submittedAt },
  });

  return summary.id;
}

async function seedOvertimeCases(): Promise<void> {
  for (const overtimeCase of OVERTIME_CASES) {
    const employeeId = await mustFindEmployeeId(overtimeCase.employeeNo);
    const requestId = await submitOvertime(overtimeCase, employeeId);

    if (overtimeCase.decidedBy === null) {
      console.log(
        `   ${overtimeCase.label} ${overtimeCase.employeeNo} ${overtimeCase.workDate}：待簽核 — ${overtimeCase.note}`,
      );
      continue;
    }

    const actorEmployeeId = await mustFindEmployeeId(overtimeCase.decidedBy);

    if (overtimeCase.decision === "reject") {
      await overtimeRequestService.reject({
        accountBookId: ACCOUNT_BOOK_ID,
        requestId,
        actorEmployeeId,
      });
      console.log(
        `   ${overtimeCase.label} ${overtimeCase.employeeNo} ${overtimeCase.workDate}：已駁回 — ${overtimeCase.note}`,
      );
      continue;
    }

    const result = await overtimeRequestService.approve({
      accountBookId: ACCOUNT_BOOK_ID,
      requestId,
      actorEmployeeId,
      approvedMinutes: overtimeCase.approvedMinutes,
      observedAt: overtimeCase.submittedAt,
    });

    console.log(
      `   ${overtimeCase.label} ${overtimeCase.employeeNo} ${overtimeCase.workDate}：` +
        `核准 ${result.request.approvedMinutes} 分、認列 ${result.recognizedMinutes} 分、` +
        `未核准 ${result.unapprovedMinutes} 分、補休 ${result.compensatoryGrantCount} 批、` +
        `折現事件 ${result.cashOutEventIds.length} 筆`,
    );
    console.log(`      ${overtimeCase.note}`);
  }
}

async function seedLeaveCases(): Promise<void> {
  for (const leaveCase of LEAVE_CASES) {
    const employeeId = await mustFindEmployeeId(leaveCase.employeeNo);

    const policy = await prisma.leavePolicy.findFirst({
      where: {
        accountBookId: ACCOUNT_BOOK_ID,
        code: leaveCase.policyCode,
        isActive: true,
      },
      select: { id: true },
    });
    if (policy === null) {
      throw new Error(
        `本帳本沒有假別 ${leaveCase.policyCode} —— 請先執行 seed_attendance_demo.ts`,
      );
    }

    const created = await leaveRequestService.submit({
      accountBookId: ACCOUNT_BOOK_ID,
      employeeId,
      input: {
        leavePolicyId: policy.id,
        reason: leaveCase.reason,
        days: leaveCase.workDates.map((workDate) =>
          leaveCase.startMinute === undefined ||
          leaveCase.endMinute === undefined
            ? { workDate, segment: LeaveDaySegment.FULL }
            : {
                workDate,
                segment: LeaveDaySegment.CUSTOM,
                startMinute: leaveCase.startMinute,
                endMinute: leaveCase.endMinute,
              },
        ),
      },
      observedAt: leaveCase.submittedAt,
    });

    // Info: (20260818 - Julian) 同 `submitOvertime`：送出時間要與敘事一致
    await prisma.leaveRequest.update({
      where: { id: created.id },
      data: { createdAt: leaveCase.submittedAt },
    });

    if (leaveCase.rejectedBy !== undefined) {
      await leaveRequestService.reject({
        accountBookId: ACCOUNT_BOOK_ID,
        requestId: created.id,
        actorEmployeeId: await mustFindEmployeeId(leaveCase.rejectedBy),
        comment: leaveCase.rejectComment,
        // Info: (20260818 - Julian) 主管隔天早上才處理
        observedAt: new Date(leaveCase.submittedAt.getTime() + 16 * 60 * 60000),
      });
    }

    const span =
      leaveCase.workDates.length > 1
        ? `${leaveCase.workDates[0]} ~ ${leaveCase.workDates[leaveCase.workDates.length - 1]}`
        : leaveCase.workDates[0];
    const state = leaveCase.rejectedBy === undefined ? "待簽核" : "已駁回";
    console.log(
      `   ${leaveCase.label} ${leaveCase.employeeNo} ${span}：${state} — ${leaveCase.note}`,
    );
  }
}

/**
 * Info: (20260818 - Julian) 演示的順序寫在腳本裡而不是只寫在執行手冊裡。
 *
 * 理由與既有 seed 把「員工檔已重建」印在最後一行相同：
 * 演示前十分鐘沒有人會再回頭開文件，而終端機的最後幾行一定會被看到。
 */
function printRunbook(): void {
  console.log("\n📋 演示順序建議");
  console.log("   1. 以 EMP006（李冠廷）登入 → /hr_management/overtime");
  console.log(
    "      本月加班 12 小時 / 上限 54 小時；OT-1 那張的「申請 600 分、認列 540 分」",
  );
  console.log("      就是 ADR 024 §2 的核心主張：系統不發明沒有發生過的加班。");
  console.log("   2. 同一位 → /hr_management/leave");
  console.log(
    "      額度卡上多出「補休」0.375 天 —— 它來自 OT-2，1:1 換算，不乘加成倍率（§32-1）。",
  );
  console.log(
    "   3. 以 EMP005（張文彬）登入 → /hr_management/overtime/approval",
  );
  console.log(
    "      四張待簽核（兩張事後補單、一張事前申請、一張會超時），當場核准一張。",
  );
  console.log(
    "      壓軸按 OT-9（EMP007 王雅琪 08-14 17:00–22:00）：480 + 300 = 780 分鐘，",
  );
  console.log(
    "      超過 §32 II 單日 12 小時上限 → 紅字擋下，旁邊是尚未開放的「填寫加班報告書」。",
  );
  console.log(
    "      同一頁的「未核准時段」會列出 08-08 他自己的假日出勤 540 分鐘 ——",
  );
  console.log("      有打卡事實、沒有任何一張單涵蓋它，系統只負責讓它浮出來。");
  console.log("   4. 同一位 → /hr_management/leave/approval");
  console.log("      四張待簽核假單，其中 LV-3 是三天 → 走兩關的那條規則；");
  console.log(
    "      LV-5 是 EMP007 王雅琪 08-19 上午 09:00–10:30 —— 實際 90 分鐘、計 120 分鐘，",
  );
  console.log("      那 30 分鐘的差額就是「不足一單位以一單位計」。");
  console.log(
    "      當場核准 LV-1，再切回 EMP006 的「我的請假」—— 特休額度會少一天，",
  );
  console.log(
    "      那一天的排班也同時被投影成「請假」。扣帳是核准的一部分，不是另一支批次。",
  );
}

async function main(): Promise<void> {
  console.log("🌱 假勤展示資料（加班 ＋ 待簽核假單）");
  console.log(`   帳本：${ACCOUNT_BOOK_ID}`);

  await clearOwnData();
  console.log("   已清空前一次執行的加班資料與本腳本指定日期的假單／打卡");

  await seedOvertimePolicy();
  await seedOvertimePunches();
  await seedOvertimeCases();
  await seedLeaveCases();

  printRunbook();
  console.log("\n✅ 完成");
}

main()
  .catch((error) => {
    console.error("❌ seed 失敗：", error);
    console.error(
      "\n   幾個最常見的成因：" +
        "\n     1. 尚未執行 npx tsx scripts/seed/seed_attendance_demo.ts（本腳本是它的增補）" +
        "\n     2. HR_PII_KEY_V1 未設定（打卡座標要加密）" +
        "\n     3. schema 未同步：npx prisma db push && npx prisma generate" +
        "\n        （OvertimePolicy.compensatoryExpiryMonths 是本分支新增的欄位）",
    );
    process.exitCode = 1;
  })
  .finally(() => dbRepo.disconnect());
