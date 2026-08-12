import {
  EmployeeStatus,
  Gender,
  PROBATION_MONTHS,
} from "@/constants/hr_management";
import { MOCK_HR_DEPARTMENTS } from "@/constants/mock_hr_organization";
import { IEmployeeListItem } from "@/interfaces/hr_management";
import { addDays, parseIsoDate, toIsoDate } from "@/lib/utils/hr_date";
import { maskPiiTail } from "@/lib/utils/hr_pii_mask";

/**
 * ToDo: (20260810 - Julian) 待 `/api/v1/hr/employee` 上線後移除，改由 API 取得。
 *
 * 日期一律寫死成字面值而非 `new Date()` 推算：mock 若隨當下時間漂移，
 * 畫面截圖與 UI 測試每天都會長得不一樣。
 *
 * `departmentId` 與 `MOCK_HR_DEPARTMENTS` 的 id 對得起來，
 * 組織架構頁的人數才算得出來；改動任一邊都要一起改。
 */
const MOCK_HR_CORE_EMPLOYEES: IEmployeeListItem[] = [
  {
    id: "emp-000",
    employeeNo: "EMP000",
    name: "陳世豪",
    englishName: "Shihhao Chen",
    gender: Gender.MALE,
    birthMonthDay: "03-18",
    age: 54,
    email: "shihhao.chen@isunfa.com",
    maskedPhone: maskPiiTail("0911-000-001"),
    status: EmployeeStatus.ACTIVE,
    hireDate: "2015-01-05",
    leaveDate: null,
    departmentId: "dep-000",
    departmentName: "總經理室",
    jobTitleId: "jt-001",
    jobTitle: "總經理",
    managerName: null,
  },
  {
    id: "emp-001",
    employeeNo: "EMP001",
    name: "王大明",
    englishName: "David Wang",
    gender: Gender.MALE,
    birthMonthDay: "08-22",
    age: 41,
    email: "david.wang@isunfa.com",
    maskedPhone: maskPiiTail("0912-345-678"),
    status: EmployeeStatus.ACTIVE,
    hireDate: "2019-03-01",
    leaveDate: null,
    departmentId: "dep-001",
    departmentName: "技術部",
    jobTitleId: "jt-002",
    jobTitle: "技術部經理",
    managerName: "陳世豪",
  },
  {
    id: "emp-002",
    employeeNo: "EMP002",
    name: "張小明",
    englishName: "Sam Chang",
    gender: Gender.MALE,
    birthMonthDay: "11-05",
    age: 33,
    email: "sam.chang@isunfa.com",
    maskedPhone: maskPiiTail("0922-113-456"),
    status: EmployeeStatus.ACTIVE,
    hireDate: "2021-07-12",
    leaveDate: null,
    departmentId: "dep-101",
    departmentName: "前端組",
    jobTitleId: "jt-004",
    jobTitle: "資深前端工程師",
    managerName: "王大明",
  },
  {
    id: "emp-003",
    employeeNo: "EMP003",
    name: "李佳蓉",
    englishName: "Jarong Li",
    gender: Gender.FEMALE,
    birthMonthDay: "02-14",
    age: 38,
    email: "jarong.li@isunfa.com",
    maskedPhone: maskPiiTail("0933-221-889"),
    status: EmployeeStatus.ACTIVE,
    hireDate: "2020-01-06",
    leaveDate: null,
    departmentId: "dep-002",
    departmentName: "財會部",
    jobTitleId: "jt-003",
    jobTitle: "會計主任",
    managerName: "陳世豪",
  },
  {
    id: "emp-004",
    employeeNo: "EMP004",
    name: "陳彥廷",
    englishName: "Ian Chen",
    gender: Gender.MALE,
    birthMonthDay: "06-30",
    age: 27,
    email: "ian.chen@isunfa.com",
    maskedPhone: maskPiiTail("0955-667-201"),
    status: EmployeeStatus.PROBATION,
    hireDate: "2026-06-15",
    leaveDate: null,
    departmentId: "dep-102",
    departmentName: "後端組",
    jobTitleId: "jt-005",
    jobTitle: "後端工程師",
    managerName: "王大明",
  },
  {
    id: "emp-005",
    employeeNo: "EMP005",
    name: "林巧芯",
    englishName: "Chiaohsin Lin",
    gender: Gender.FEMALE,
    birthMonthDay: "08-03",
    age: 43,
    email: "chiaohsin.lin@isunfa.com",
    maskedPhone: maskPiiTail("0966-889-334"),
    status: EmployeeStatus.ACTIVE,
    hireDate: "2018-09-03",
    leaveDate: null,
    departmentId: "dep-004",
    departmentName: "人資部",
    jobTitleId: "jt-002",
    jobTitle: "人資部經理",
    managerName: "陳世豪",
  },
  {
    id: "emp-006",
    employeeNo: "EMP006",
    name: "黃俊傑",
    englishName: "Jack Huang",
    gender: Gender.MALE,
    birthMonthDay: "12-11",
    age: 36,
    email: "jack.huang@isunfa.com",
    maskedPhone: maskPiiTail("0977-450-112"),
    status: EmployeeStatus.LEAVE_WITHOUT_PAY,
    hireDate: "2017-04-17",
    leaveDate: null,
    departmentId: "dep-003",
    departmentName: "營運部",
    jobTitleId: "jt-006",
    jobTitle: "營運專員",
    managerName: "謝欣怡",
  },
  {
    id: "emp-007",
    employeeNo: "EMP007",
    name: "吳雅婷",
    englishName: "Yating Wu",
    gender: Gender.FEMALE,
    birthMonthDay: "04-27",
    age: 31,
    email: "yating.wu@isunfa.com",
    maskedPhone: maskPiiTail("0988-332-556"),
    status: EmployeeStatus.ACTIVE,
    hireDate: "2022-11-01",
    leaveDate: null,
    departmentId: "dep-002",
    departmentName: "財會部",
    jobTitleId: "jt-006",
    jobTitle: "財務分析師",
    managerName: "李佳蓉",
  },
  {
    id: "emp-008",
    employeeNo: "EMP008",
    name: "鄭子軒",
    englishName: "Zixuan Zheng",
    gender: Gender.MALE,
    birthMonthDay: "09-09",
    age: 34,
    email: "zixuan.zheng@isunfa.com",
    maskedPhone: maskPiiTail("0910-778-224"),
    status: EmployeeStatus.RESIGNED,
    hireDate: "2019-08-19",
    leaveDate: "2026-03-31",
    departmentId: "dep-005",
    departmentName: "業務部",
    jobTitleId: "jt-006",
    jobTitle: "業務代表",
    managerName: "劉冠宇",
  },
  {
    id: "emp-009",
    employeeNo: "EMP009",
    name: "許庭瑋",
    englishName: "Tingwei Hsu",
    gender: Gender.MALE,
    birthMonthDay: "01-19",
    age: 30,
    email: "tingwei.hsu@isunfa.com",
    maskedPhone: maskPiiTail("0921-556-778"),
    status: EmployeeStatus.ACTIVE,
    hireDate: "2023-02-13",
    leaveDate: null,
    departmentId: "dep-102",
    departmentName: "後端組",
    jobTitleId: "jt-005",
    jobTitle: "資料工程師",
    managerName: "王大明",
  },
  {
    id: "emp-010",
    employeeNo: "EMP010",
    name: "蔡宜臻",
    englishName: "Yichen Tsai",
    gender: Gender.FEMALE,
    birthMonthDay: "05-08",
    age: 25,
    email: "yichen.tsai@isunfa.com",
    maskedPhone: maskPiiTail("0937-004-661"),
    status: EmployeeStatus.PROBATION,
    hireDate: "2026-07-01",
    leaveDate: null,
    departmentId: "dep-004",
    departmentName: "人資部",
    jobTitleId: "jt-006",
    jobTitle: "人資專員",
    managerName: "林巧芯",
  },
  {
    id: "emp-011",
    employeeNo: "EMP011",
    name: "劉冠宇",
    englishName: "Kuanyu Liu",
    gender: Gender.MALE,
    birthMonthDay: "10-02",
    age: 46,
    email: "kuanyu.liu@isunfa.com",
    maskedPhone: maskPiiTail("0918-223-907"),
    status: EmployeeStatus.ACTIVE,
    hireDate: "2024-05-06",
    leaveDate: null,
    departmentId: "dep-005",
    departmentName: "業務部",
    jobTitleId: "jt-002",
    jobTitle: "業務經理",
    managerName: "陳世豪",
  },
  {
    id: "emp-012",
    employeeNo: "EMP012",
    name: "謝欣怡",
    englishName: "Hsinyi Hsieh",
    gender: Gender.FEMALE,
    birthMonthDay: "08-15",
    age: 35,
    email: "hsinyi.hsieh@isunfa.com",
    maskedPhone: maskPiiTail("0963-118-042"),
    status: EmployeeStatus.ACTIVE,
    hireDate: "2021-10-25",
    leaveDate: null,
    departmentId: "dep-003",
    departmentName: "營運部",
    jobTitleId: "jt-003",
    jobTitle: "營運主任",
    managerName: "陳世豪",
  },
  {
    id: "emp-013",
    employeeNo: "EMP013",
    name: "洪世昌",
    englishName: "Shihchang Hung",
    gender: Gender.MALE,
    birthMonthDay: "07-21",
    age: 51,
    email: "shihchang.hung@isunfa.com",
    maskedPhone: maskPiiTail("0975-330-118"),
    status: EmployeeStatus.RESIGNED,
    hireDate: "2016-02-01",
    leaveDate: "2025-12-31",
    departmentId: "dep-002",
    departmentName: "財會部",
    jobTitleId: "jt-004",
    jobTitle: "資深會計",
    managerName: "李佳蓉",
  },
  {
    id: "emp-014",
    employeeNo: "EMP014",
    name: "簡妤庭",
    englishName: "Yuting Chien",
    gender: Gender.FEMALE,
    birthMonthDay: "03-06",
    age: 28,
    email: "yuting.chien@isunfa.com",
    maskedPhone: maskPiiTail("0912-908-773"),
    status: EmployeeStatus.ACTIVE,
    hireDate: "2025-03-17",
    leaveDate: null,
    departmentId: "dep-001",
    departmentName: "技術部",
    jobTitleId: "jt-005",
    jobTitle: "QA 工程師",
    managerName: "王大明",
  },
];

/**
 * ToDo: (20260810 - Julian) 以下為程式化產生的假編制，待 API 上線後整段移除。
 * 三個不可妥協的性質：
 * 1. **決定性**：用固定種子的 mulberry32，不用 `Math.random`。
 *    否則同一份程式在伺服器與瀏覽器會產生兩份不同的員工名冊，
 *    hydration 直接爆掉；截圖與 UI 測試也每次都不一樣。
 * 2. **自洽**：狀態由日期推導，不是各自亂數。三天前才報到的人不會是「離職」，
 *    離職日一定晚於到職日 —— 這些矛盾在畫面上看起來就只是「資料怪怪的」，
 *    但會讓人懷疑統計邏輯有錯。
 * 3. **以 `MOCK_HR_TODAY` 為基準**：所有相對日期都從這個常數算，
 *    不從執行當下的時間算，理由同第 1 點。
 */
export const MOCK_HR_TODAY = "2026-08-10";

const GENERATED_COUNT = 125;

/** Info: (20260810 - Julian) 這兩位的離職日固定落在基準月，見下方離職日的說明 */
const RECENT_RESIGNATION_INDEXES = [2, 7];

/**
 * Info: (20260810 - Julian) 已提出離職、但最後一天還沒到的人。
 *
 * 狀態維持在職 —— 到最後一天之前他們確實還在上班，也還佔編制。
 * 沒有這種人的話，到離職看板的「離職交接中」那一欄永遠是空的，
 * 而那一欄正是交接流程真正在跑的階段。
 */
const PENDING_RESIGNATION_INDEXES = [11, 33];

/**
 * Info: (20260810 - Julian) 試用期已過但還沒完成考核的人。
 *
 * 一般規則是「到職 3 個月內才可能是試用期」，因此逾期未考核這條路徑
 * 在推導出來的資料裡永遠不會發生。這裡刻意留一位，讓那個警示看得到。
 */
const OVERDUE_PROBATION_INDEX = 83;
const OVERDUE_PROBATION_DAYS_AGO = 110;
const RANDOM_SEED = 20260810;

const SURNAMES = [
  "陳",
  "林",
  "黃",
  "張",
  "李",
  "王",
  "吳",
  "劉",
  "蔡",
  "楊",
  "許",
  "鄭",
  "謝",
  "郭",
  "洪",
  "曾",
  "邱",
  "廖",
  "賴",
  "周",
  "徐",
  "蘇",
  "葉",
  "莊",
  "呂",
  "江",
  "何",
  "蕭",
  "羅",
  "高",
];

const GIVEN_NAMES = [
  "承恩",
  "宥辰",
  "冠廷",
  "柏翰",
  "詩涵",
  "彥霖",
  "怡君",
  "宗翰",
  "雅雯",
  "俊霖",
  "家豪",
  "淑芬",
  "建宏",
  "美玲",
  "志偉",
  "佩青",
  "威廷",
  "欣儀",
  "文傑",
  "曉薇",
  "祐寧",
  "品睿",
  "思妤",
  "亭妤",
  "宸瑋",
  "詠晴",
  "皓軒",
  "沛珊",
  "立群",
  "書瑜",
  "俊男",
  "巧慧",
  "偉倫",
  "郁婷",
  "泓宇",
  "筱涵",
  "銘德",
  "雅琪",
  "紹謙",
  "婉婷",
];

/** Info: (20260810 - Julian) 各部門要生幾個人，總和須等於 GENERATED_COUNT */
const DEPARTMENT_QUOTA: { id: string; name: string; count: number }[] = [
  { id: "dep-001", name: "技術部", count: 10 },
  { id: "dep-101", name: "前端組", count: 22 },
  { id: "dep-102", name: "後端組", count: 26 },
  { id: "dep-002", name: "財會部", count: 14 },
  { id: "dep-003", name: "營運部", count: 20 },
  { id: "dep-004", name: "人資部", count: 8 },
  { id: "dep-005", name: "業務部", count: 25 },
];

/** Info: (20260810 - Julian) 技術類部門的基層職稱是工程師，其餘是專員 */
const ENGINEERING_DEPARTMENT_IDS = ["dep-001", "dep-101", "dep-102"];

const JOB_TITLE_LEAD = { id: "jt-003", title: "主任 / 組長" };
const JOB_TITLE_SENIOR = { id: "jt-004", title: "資深專業人員" };
const JOB_TITLE_ENGINEER = { id: "jt-005", title: "工程師" };
const JOB_TITLE_SPECIALIST = { id: "jt-006", title: "專員" };

/**
 * Info: (20260810 - Julian) mulberry32。選它是因為只用 32 位元整數運算
 * （`Math.imul` 保證不溢位成浮點數），同一顆種子在任何 JS 引擎都給同一串數列。
 */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Info: (20260810 - Julian) Fisher-Yates，用同一顆種子的亂數源，結果固定
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const swap = result[i];
    result[i] = result[j];
    result[j] = swap;
  }
  return result;
}

/**
 * Info: (20260810 - Julian) 到職日的天數回推量。
 *
 * 前 85 位是老員工（1.1～9.3 年），後 40 位落在近 12 個月內，
 * 其中最前面 4 位刻意壓在 7 天內，讓「近期報到新人」一定有東西可看。
 */
function hireDaysAgo(index: number, random: () => number): number {
  if (index === OVERDUE_PROBATION_INDEX) return OVERDUE_PROBATION_DAYS_AGO;
  if (index < 85) return 400 + index * 35 + Math.floor(random() * 30);
  const recentIndex = index - 85;
  if (recentIndex < 4) return recentIndex * 2;
  return 12 + Math.round((recentIndex - 4) * 9.5);
}

/**
 * Info: (20260810 - Julian) 部門 id → 部門主管姓名。
 *
 * 產生的員工原本 `managerName` 一律是 null，於是看板卡片與員工列表的
 * 「直屬主管」有一半顯示「—」。主管其實是查得到的：部門的 managerId
 * 指向前 15 位具名核心人員，照著查即可，不必再編一組名字。
 */
const MANAGER_NAME_BY_DEPARTMENT = new Map<string, string>(
  MOCK_HR_DEPARTMENTS.flatMap((department) => {
    if (!department.managerId) return [];
    const manager = MOCK_HR_CORE_EMPLOYEES.find(
      (employee) => employee.id === department.managerId,
    );
    return manager ? [[department.id, manager.name] as const] : [];
  }),
);

function buildGeneratedEmployees(): IEmployeeListItem[] {
  const random = createRandom(RANDOM_SEED);
  const today = parseIsoDate(MOCK_HR_TODAY);

  const departmentPool = shuffle(
    DEPARTMENT_QUOTA.flatMap((department) =>
      Array.from({ length: department.count }, () => department),
    ),
    random,
  );

  return Array.from({ length: GENERATED_COUNT }, (unused, index) => {
    const serial = index + 15;
    const employeeNo = `EMP${String(serial).padStart(3, "0")}`;
    const department = departmentPool[index];

    const daysAgo = hireDaysAgo(index, random);
    const hireDate = addDays(today, -daysAgo);

    /**
     * Info: (20260810 - Julian) 狀態由日期推導，順序即優先序：
     * 先決定誰離職（只從老員工挑），再看還在試用期的，最後才是留職停薪。
     */
    const isResigned = index < 85 && (index % 5 === 2 || index === 84);
    const isProbation =
      !isResigned &&
      (daysAgo <= PROBATION_MONTHS * 31 || index === OVERDUE_PROBATION_INDEX);
    const isLeaveWithoutPay = !isResigned && !isProbation && index % 37 === 5;

    let status = EmployeeStatus.ACTIVE;
    if (isResigned) status = EmployeeStatus.RESIGNED;
    else if (isProbation) status = EmployeeStatus.PROBATION;
    else if (isLeaveWithoutPay) status = EmployeeStatus.LEAVE_WITHOUT_PAY;

    /**
     * Info: (20260810 - Julian) 離職日落在近 12 個月內，趨勢圖才有離職曲線；
     * 但至少要在到職滿 60 天之後，否則會出現離職日早於到職日的資料。
     */
    let leaveDate: string | null = null;

    // Info: (20260810 - Julian) 已預告離職者：狀態仍是在職，但已經有最後一天
    const pendingIndex = PENDING_RESIGNATION_INDEXES.indexOf(index);
    if (!isResigned && pendingIndex >= 0) {
      leaveDate = toIsoDate(addDays(today, 12 + pendingIndex * 13));
    }

    if (isResigned) {
      /**
       * Info: (20260810 - Julian) 前兩位離職者刻意排在本月。
       *
       * 離職日純用亂數鋪在近 350 天內時，落在「本月 1 日到基準日」這 10 天的
       * 期望值不到一人 —— 實際生出來就是 0，於是本月離職率恆為 0%、
       * 離職交接任務一筆都不會出現，等於整條路徑沒有被畫面驗證過。
       */
      const recentIndex = RECENT_RESIGNATION_INDEXES.indexOf(index);
      const candidate =
        recentIndex >= 0
          ? addDays(today, -(3 + recentIndex * 5))
          : addDays(today, -Math.floor(random() * 350));
      const earliest = addDays(hireDate, 60);
      leaveDate = toIsoDate(candidate < earliest ? earliest : candidate);
    }

    const isEngineering = ENGINEERING_DEPARTMENT_IDS.includes(department.id);
    const titleRoll = random();
    let jobTitle = isEngineering ? JOB_TITLE_ENGINEER : JOB_TITLE_SPECIALIST;
    if (titleRoll < 0.12) jobTitle = JOB_TITLE_LEAD;
    else if (titleRoll < 0.35) jobTitle = JOB_TITLE_SENIOR;

    /**
     * Info: (20260812 - Julian) 年齡 22～59 歲；生日的月日獨立取，本月壽星才會自然散落。
     * 只產月日與年齡，不組出完整生日 —— DTO 本來就不帶它（見 ADR 018 §7）。
     */
    const age = 22 + Math.floor(random() * 38);
    const birthMonth = 1 + Math.floor(random() * 12);
    const birthDay = 1 + Math.floor(random() * 28);
    const birthMonthDay = `${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;

    const surname = SURNAMES[(index * 7 + 3) % SURNAMES.length];
    const givenName = GIVEN_NAMES[(index * 11 + 5) % GIVEN_NAMES.length];

    return {
      id: `emp-${String(serial).padStart(3, "0")}`,
      employeeNo,
      name: `${surname}${givenName}`,
      englishName: null,
      gender: index % 2 === 0 ? Gender.MALE : Gender.FEMALE,
      email: `${employeeNo.toLowerCase()}@isunfa.com`,
      maskedPhone: maskPiiTail(
        `09${String(10000000 + index * 137).slice(0, 2)}-${String(100000 + index * 379).slice(0, 3)}-${String(100000 + index * 977).slice(0, 3)}`,
      ),
      birthMonthDay,
      age,
      status,
      hireDate: toIsoDate(hireDate),
      leaveDate,
      departmentId: department.id,
      departmentName: department.name,
      jobTitleId: jobTitle.id,
      jobTitle: jobTitle.title,
      /**
       * Info: (20260810 - Julian) 自己就是部門主管時不會是自己的主管；
       * 產生的員工都不是主管，因此直接查表即可。
       */
      managerName: MANAGER_NAME_BY_DEPARTMENT.get(department.id) ?? null,
    } satisfies IEmployeeListItem;
  });
}

/**
 * Info: (20260810 - Julian) 前 15 位是手寫的具名核心人員（組織架構頁的部門主管
 * 都指向他們），其後是程式化產生的編制。兩段合起來才是全公司名冊。
 */
export const MOCK_HR_EMPLOYEES: IEmployeeListItem[] = [
  ...MOCK_HR_CORE_EMPLOYEES,
  ...buildGeneratedEmployees(),
];
