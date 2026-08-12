import { describe, it, expect } from "@jest/globals";
import {
  buildDepartmentTree,
  buildJobTitleList,
  findDepartmentNode,
  flattenDepartmentTree,
  isHeadcountEmployee,
} from "@/lib/utils/hr_organization";
import { EmployeeStatus, Gender } from "@/constants/hr_management";
import {
  IDepartment,
  IEmployeeListItem,
  IJobTitle,
} from "@/interfaces/hr_management";

const dept = (
  id: string,
  code: string,
  parentId: string | null = null,
  managerId: string | null = null,
): IDepartment => ({
  id,
  code,
  name: `部門 ${code}`,
  description: null,
  parentId,
  managerId,
});

const emp = (
  id: string,
  status: EmployeeStatus,
  departmentId: string | null = null,
  jobTitleId: string | null = null,
): IEmployeeListItem => ({
  id,
  employeeNo: id.toUpperCase(),
  name: `員工 ${id}`,
  englishName: null,
  gender: Gender.OTHER,
  email: `${id}@example.com`,
  maskedPhone: "*******678",
  birthMonthDay: null,
  age: null,
  status,
  hireDate: "2025-01-01",
  leaveDate: status === EmployeeStatus.RESIGNED ? "2026-01-01" : null,
  departmentId,
  departmentName: null,
  jobTitleId,
  jobTitle: null,
  managerName: null,
});

describe("isHeadcountEmployee", () => {
  /**
   * Info: (20260811 - Julian) 編制口徑：離職不算，留職停薪與試用期都算。
   * 這個定義在部門樹與職稱列表兩處共用，口徑一旦漂移，
   * 同一份資料在兩張畫面會顯示不同的編制人數 —— 而兩邊都「看起來很合理」。
   */
  it("should count everyone except resigned employees", () => {
    expect(isHeadcountEmployee(emp("a", EmployeeStatus.ACTIVE))).toBe(true);
    expect(isHeadcountEmployee(emp("b", EmployeeStatus.PROBATION))).toBe(true);
    expect(
      isHeadcountEmployee(emp("c", EmployeeStatus.LEAVE_WITHOUT_PAY)),
    ).toBe(true);
    expect(isHeadcountEmployee(emp("d", EmployeeStatus.RESIGNED))).toBe(false);
  });
});

describe("buildDepartmentTree", () => {
  it("should nest children under their parent and sort by code", () => {
    const tree = buildDepartmentTree(
      [
        dept("d2", "DEP-002", "d1"),
        dept("d1", "DEP-001"),
        dept("d3", "DEP-003", "d1"),
      ],
      [],
    );

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("d1");
    expect(tree[0].depth).toBe(0);
    expect(tree[0].children.map((child) => child.code)).toEqual([
      "DEP-002",
      "DEP-003",
    ]);
    expect(tree[0].children[0].depth).toBe(1);
  });

  /**
   * Info: (20260811 - Julian) 環的防護：A→B→A。
   *
   * 註解主張「兩者都退回當根節點處理，因為部門在畫面上消失，
   * 比它掛錯位置更難被發現」。所以這裡不只驗證「沒有無限迴圈」——
   * 更要驗證兩個部門都還在輸出裡。丟掉資料同樣是災難，只是比較安靜。
   */
  it("should fall back to roots when the parent chain forms a cycle", () => {
    const tree = buildDepartmentTree(
      [dept("d1", "DEP-001", "d2"), dept("d2", "DEP-002", "d1")],
      [],
    );

    expect(tree.map((node) => node.id).sort()).toEqual(["d1", "d2"]);
    expect(flattenDepartmentTree(tree)).toHaveLength(2);
  });

  // Info: (20260811 - Julian) 自己指向自己是最短的環，也是誤設父部門最容易產生的一種
  it("should handle a department that is its own parent", () => {
    const tree = buildDepartmentTree([dept("d1", "DEP-001", "d1")], []);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("d1");
  });

  // Info: (20260811 - Julian) 三節點長環 A→B→C→A，確認偵測不是只看直接父層
  it("should handle a longer cycle", () => {
    const tree = buildDepartmentTree(
      [
        dept("d1", "DEP-001", "d3"),
        dept("d2", "DEP-002", "d1"),
        dept("d3", "DEP-003", "d2"),
      ],
      [],
    );
    expect(flattenDepartmentTree(tree)).toHaveLength(3);
  });

  /**
   * Info: (20260811 - Julian) 孤兒 parentId（父部門被刪除）同樣退回根節點。
   * 這是實務上最常見的髒資料 —— 刪部門時沒有處理子部門。
   */
  it("should treat a dangling parentId as a root", () => {
    const tree = buildDepartmentTree(
      [dept("d1", "DEP-001", "does-not-exist")],
      [],
    );
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("d1");
    expect(tree[0].depth).toBe(0);
  });

  /**
   * Info: (20260811 - Julian) 兩種人數的差別：`directHeadcount` 只算掛在這一層的，
   * `totalHeadcount` 含所有子孫。技術部有分組時只看其中一個都會誤判編制大小。
   */
  it("should roll headcount up through the tree", () => {
    const tree = buildDepartmentTree(
      [
        dept("d1", "DEP-001"),
        dept("d2", "DEP-002", "d1"),
        dept("d3", "DEP-003", "d2"),
      ],
      [
        emp("e1", EmployeeStatus.ACTIVE, "d1"),
        emp("e2", EmployeeStatus.PROBATION, "d2"),
        emp("e3", EmployeeStatus.LEAVE_WITHOUT_PAY, "d3"),
        // Info: (20260811 - Julian) 離職者掛在 d3，但不該計入任何一層
        emp("e4", EmployeeStatus.RESIGNED, "d3"),
        // Info: (20260811 - Julian) 沒有部門的人不該讓任何節點的人數增加
        emp("e5", EmployeeStatus.ACTIVE, null),
      ],
    );

    const root = tree[0];
    expect(root.directHeadcount).toBe(1);
    expect(root.totalHeadcount).toBe(3);
    expect(root.children[0].directHeadcount).toBe(1);
    expect(root.children[0].totalHeadcount).toBe(2);
    expect(root.children[0].children[0].totalHeadcount).toBe(1);
  });

  it("should resolve the manager name and leave it null when unassigned", () => {
    const tree = buildDepartmentTree(
      [dept("d1", "DEP-001", null, "e1"), dept("d2", "DEP-002", null, null)],
      [emp("e1", EmployeeStatus.ACTIVE, "d1")],
    );
    expect(tree[0].managerName).toBe("員工 e1");
    expect(tree[1].managerName).toBeNull();
  });

  // Info: (20260811 - Julian) 主管已離職但仍掛在部門上：名字查得到就照顯示，不要變成 null
  it("should keep a manager name that points at a resigned employee", () => {
    const tree = buildDepartmentTree(
      [dept("d1", "DEP-001", null, "e1")],
      [emp("e1", EmployeeStatus.RESIGNED, "d1")],
    );
    expect(tree[0].managerName).toBe("員工 e1");
    expect(tree[0].directHeadcount).toBe(0);
  });

  // Info: (20260811 - Julian) managerId 指向不存在的員工時回 null，而不是崩潰或顯示 undefined
  it("should return a null manager name for a dangling managerId", () => {
    const tree = buildDepartmentTree([dept("d1", "DEP-001", null, "gone")], []);
    expect(tree[0].managerName).toBeNull();
  });

  it("should return an empty array for no departments", () => {
    expect(buildDepartmentTree([], [])).toEqual([]);
  });
});

describe("flattenDepartmentTree / findDepartmentNode", () => {
  const tree = buildDepartmentTree(
    [
      dept("d1", "DEP-001"),
      dept("d2", "DEP-002", "d1"),
      dept("d3", "DEP-003", "d2"),
      dept("d4", "DEP-004"),
    ],
    [],
  );

  // Info: (20260811 - Julian) 壓平順序即畫面由上而下的順序：父節點必在自己的子孫之前
  it("should flatten depth-first in display order", () => {
    expect(flattenDepartmentTree(tree).map((node) => node.id)).toEqual([
      "d1",
      "d2",
      "d3",
      "d4",
    ]);
  });

  it("should find a nested node and return null when missing", () => {
    expect(findDepartmentNode(tree, "d3")?.code).toBe("DEP-003");
    expect(findDepartmentNode(tree, "nope")).toBeNull();
  });
});

describe("buildJobTitleList", () => {
  const jobTitle = (id: string, level: number): IJobTitle => ({
    id,
    code: `JT-${id}`,
    title: `職稱 ${id}`,
    level,
    description: null,
  });

  it("should sort by level from high to low", () => {
    const list = buildJobTitleList(
      [jobTitle("a", 1), jobTitle("b", 5), jobTitle("c", 3)],
      [],
    );
    expect(list.map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  // Info: (20260811 - Julian) 與部門樹共用同一個編制口徑：離職不算，留職停薪算
  it("should count headcount with the same rule as the department tree", () => {
    const list = buildJobTitleList(
      [jobTitle("a", 1)],
      [
        emp("e1", EmployeeStatus.ACTIVE, null, "a"),
        emp("e2", EmployeeStatus.LEAVE_WITHOUT_PAY, null, "a"),
        emp("e3", EmployeeStatus.RESIGNED, null, "a"),
        emp("e4", EmployeeStatus.ACTIVE, null, null),
      ],
    );
    expect(list[0].headcount).toBe(2);
  });

  // Info: (20260811 - Julian) 不得就地改動輸入陣列 —— 呼叫端往往拿的是共用的常數清單
  it("should not mutate the input array", () => {
    const jobTitles = [jobTitle("a", 1), jobTitle("b", 5)];
    buildJobTitleList(jobTitles, []);
    expect(jobTitles.map((item) => item.id)).toEqual(["a", "b"]);
  });
});
