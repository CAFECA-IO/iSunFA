import { EmployeeStatus } from "@/constants/hr_management";
import {
  IDepartment,
  IDepartmentTreeNode,
  IEmployeeListItem,
  IJobTitle,
  IJobTitleListItem,
} from "@/interfaces/hr_management";

/**
 * Info: (20260810 - Julian) 是否計入編制人數。
 *
 * 離職者不算，留職停薪與試用期都算 —— 前者仍佔編制、後者已經在上班。
 * 這個定義在部門與職稱兩處都要一致，因此抽成同一個函式。
 */
export function isHeadcountEmployee(employee: IEmployeeListItem): boolean {
  return employee.status !== EmployeeStatus.RESIGNED;
}

/**
 * Info: (20260810 - Julian) 把扁平的部門清單組成樹，並算出兩種人數。
 *
 * 防禦兩種髒資料，兩種都選擇「照樣顯示」而不是丟掉：
 * 一是 `parentId` 指向不存在的部門（父部門被刪除後的孤兒），
 * 二是 A→B→A 這種環（誤設父部門造成）。兩者都退回當根節點處理，
 * 因為部門在畫面上消失，比它掛錯位置更難被發現。
 */
export function buildDepartmentTree(
  departments: IDepartment[],
  employees: IEmployeeListItem[],
): IDepartmentTreeNode[] {
  const managerNameById = new Map<string, string>();
  employees.forEach((employee) =>
    managerNameById.set(employee.id, employee.name),
  );

  const directHeadcountById = new Map<string, number>();
  employees.filter(isHeadcountEmployee).forEach((employee) => {
    if (!employee.departmentId) return;
    const current = directHeadcountById.get(employee.departmentId) ?? 0;
    directHeadcountById.set(employee.departmentId, current + 1);
  });

  const nodeById = new Map<string, IDepartmentTreeNode>();
  departments.forEach((department) => {
    nodeById.set(department.id, {
      ...department,
      depth: 0,
      children: [],
      managerName: department.managerId
        ? (managerNameById.get(department.managerId) ?? null)
        : null,
      directHeadcount: directHeadcountById.get(department.id) ?? 0,
      totalHeadcount: 0,
    });
  });

  // Info: (20260810 - Julian) 沿著父鏈往上走，走得回自己就是環
  const hasCycle = (department: IDepartment): boolean => {
    const seen = new Set<string>([department.id]);
    let cursor = department.parentId;
    while (cursor) {
      if (seen.has(cursor)) return true;
      seen.add(cursor);
      cursor = departments.find((item) => item.id === cursor)?.parentId ?? null;
    }
    return false;
  };

  const roots: IDepartmentTreeNode[] = [];
  departments.forEach((department) => {
    const node = nodeById.get(department.id);
    if (!node) return;

    const parent = department.parentId
      ? nodeById.get(department.parentId)
      : undefined;

    if (!parent || hasCycle(department)) {
      roots.push(node);
      return;
    }
    parent.children.push(node);
  });

  // Info: (20260810 - Julian) 遞迴補上 depth 與含子部門人數，順便讓子節點依部門編號排序
  const decorate = (node: IDepartmentTreeNode, depth: number): number => {
    // Info: (20260810 - Julian) eslint no-param-reassign 的 props 已放行，此處直接寫回節點
    node.depth = depth;
    node.children.sort((a, b) => a.code.localeCompare(b.code));
    node.totalHeadcount = node.children.reduce(
      (sum, child) => sum + decorate(child, depth + 1),
      node.directHeadcount,
    );
    return node.totalHeadcount;
  };

  roots.sort((a, b) => a.code.localeCompare(b.code));
  roots.forEach((root) => decorate(root, 0));

  return roots;
}

/**
 * Info: (20260810 - Julian) 把樹壓回一維，順序即畫面由上而下的順序。
 * 清單模式要靠它跑 `map`，展開/收合則由呼叫端用 `collapsedIds` 過濾。
 */
export function flattenDepartmentTree(
  nodes: IDepartmentTreeNode[],
): IDepartmentTreeNode[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenDepartmentTree(node.children),
  ]);
}

// Info: (20260810 - Julian) 從樹中找出指定部門，找不到回 null
export function findDepartmentNode(
  nodes: IDepartmentTreeNode[],
  departmentId: string,
): IDepartmentTreeNode | null {
  return (
    flattenDepartmentTree(nodes).find((node) => node.id === departmentId) ??
    null
  );
}

// Info: (20260810 - Julian) 職稱加上在職人數，並依職等由高至低排序
export function buildJobTitleList(
  jobTitles: IJobTitle[],
  employees: IEmployeeListItem[],
): IJobTitleListItem[] {
  const headcountById = new Map<string, number>();
  employees.filter(isHeadcountEmployee).forEach((employee) => {
    if (!employee.jobTitleId) return;
    const current = headcountById.get(employee.jobTitleId) ?? 0;
    headcountById.set(employee.jobTitleId, current + 1);
  });

  return [...jobTitles]
    .map((jobTitle) => ({
      ...jobTitle,
      headcount: headcountById.get(jobTitle.id) ?? 0,
    }))
    .sort((a, b) => b.level - a.level);
}
