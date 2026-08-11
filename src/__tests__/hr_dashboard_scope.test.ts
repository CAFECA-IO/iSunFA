import { describe, it, expect } from "@jest/globals";
import { collectDepartmentScope } from "@/lib/utils/hr_dashboard";
import { IDepartment } from "@/interfaces/hr_management";

/**
 * Info: (20260811 - Julian) `collectDepartmentScope` 決定「部門主管視角看得到誰」。
 *
 * 它的註解對演算法做了一個明確主張：改用反覆掃描而不是遞迴，是因為
 * 「部門資料若含環，遞迴會堆爆呼叫堆疊」。那是防護，不是最佳化 ——
 * 而防護沒有測試就只是註解。這與 `buildDepartmentTree` 的 `hasCycle` 同一類。
 *
 * 算錯的後果不是畫面難看：範圍多含一個部門，主管就看得到他無權查看的員工個資。
 */
const dept = (id: string, parentId: string | null = null): IDepartment => ({
  id,
  code: `DEP-${id}`,
  name: `部門 ${id}`,
  description: null,
  parentId,
  managerId: null,
});

describe("collectDepartmentScope", () => {
  it("should include the root itself even with no children", () => {
    expect([...collectDepartmentScope([dept("d1")], "d1")]).toEqual(["d1"]);
  });

  // Info: (20260811 - Julian) 多層子孫都要收進來，不是只收直接子部門
  it("should collect descendants at every depth", () => {
    const departments = [
      dept("d1"),
      dept("d2", "d1"),
      dept("d3", "d2"),
      dept("d4", "d3"),
    ];
    expect([...collectDepartmentScope(departments, "d1")].sort()).toEqual([
      "d1",
      "d2",
      "d3",
      "d4",
    ]);
  });

  /**
   * Info: (20260811 - Julian) 兄弟子樹不可外洩。
   * 這是權限邊界：技術部主管不該因為範圍算太寬而看到業務部的人。
   */
  it("should not leak into a sibling subtree", () => {
    const departments = [
      dept("root"),
      dept("tech", "root"),
      dept("tech-fe", "tech"),
      dept("sales", "root"),
      dept("sales-north", "sales"),
    ];
    const scope = collectDepartmentScope(departments, "tech");
    expect([...scope].sort()).toEqual(["tech", "tech-fe"]);
    expect(scope.has("sales")).toBe(false);
    expect(scope.has("root")).toBe(false);
  });

  /**
   * Info: (20260811 - Julian) 環的防護 —— 註解主張的核心。
   *
   * `d2 → d3 → d2` 互為父子。遞迴實作會無限展開直到堆疊爆掉；
   * 反覆掃描因為靠 Set 收斂，最多掃 N 輪就停。
   * 這裡若壞掉，症狀是整張儀表板 RangeError 白畫面，而不是數字錯。
   */
  it("should terminate when the department graph contains a cycle", () => {
    // Info: (20260811 - Julian) d2 ⇄ d3 互為父子，且 d3 底下還掛著一個正常的子部門
    const departments = [dept("d2", "d3"), dept("d3", "d2"), dept("d4", "d3")];
    expect([...collectDepartmentScope(departments, "d2")].sort()).toEqual([
      "d2",
      "d3",
      "d4",
    ]);
  });

  // Info: (20260811 - Julian) 自我指向的環是最短的一種，同樣必須停下來
  it("should terminate on a self-referencing department", () => {
    expect([...collectDepartmentScope([dept("d1", "d1")], "d1")]).toEqual([
      "d1",
    ]);
  });

  /**
   * Info: (20260811 - Julian) 環不在查詢起點的子樹上時，不該把環裡的部門吸進範圍。
   * 也就是「不會爆」與「不會多收」是兩件事，兩件都要成立。
   */
  it("should not pull an unrelated cycle into the scope", () => {
    const departments = [
      dept("root"),
      dept("child", "root"),
      dept("cycle-a", "cycle-b"),
      dept("cycle-b", "cycle-a"),
    ];
    expect([...collectDepartmentScope(departments, "root")].sort()).toEqual([
      "child",
      "root",
    ]);
  });

  // Info: (20260811 - Julian) 起點不存在時只回它自己，不該回全部部門（那會是最糟的失效方向）
  it("should return only the root id when the root does not exist", () => {
    expect([
      ...collectDepartmentScope([dept("d1"), dept("d2", "d1")], "missing"),
    ]).toEqual(["missing"]);
  });

  // Info: (20260811 - Julian) 孤兒 parentId 指向不存在的部門，不該把它拉進任何範圍
  it("should ignore a dangling parentId", () => {
    const departments = [dept("d1"), dept("orphan", "does-not-exist")];
    expect([...collectDepartmentScope(departments, "d1")]).toEqual(["d1"]);
  });

  it("should handle an empty department list", () => {
    expect([...collectDepartmentScope([], "d1")]).toEqual(["d1"]);
  });
});
