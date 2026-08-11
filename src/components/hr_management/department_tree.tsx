"use client";

import { FC } from "react";
import { ChevronDown, ChevronRight, Building2, Users } from "lucide-react";
import { IDepartmentTreeNode } from "@/interfaces/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IDepartmentTreeProps {
  nodes: IDepartmentTreeNode[];
  selectedId: string | null;
  collapsedIds: Set<string>;
  onSelect: (departmentId: string) => void;
  onToggle: (departmentId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

/**
 * Info: (20260810 - Julian) 左側部門樹。
 *
 * 收合狀態存的是「被收合的 id」而不是「被展開的 id」：預設全展開，
 * 新增部門時不必有人記得把它加進展開清單，否則新部門會憑空消失。
 */
const DepartmentTree: FC<IDepartmentTreeProps> = ({
  nodes,
  selectedId,
  collapsedIds,
  onSelect,
  onToggle,
  onExpandAll,
  onCollapseAll,
}) => {
  const { t } = useTranslation();

  const renderNodes = (list: IDepartmentTreeNode[]) =>
    list.map((node) => {
      const hasChildren = node.children.length > 0;
      const isCollapsed = collapsedIds.has(node.id);
      const isSelected = node.id === selectedId;

      return (
        <li key={node.id}>
          <div
            className={`flex items-center gap-1 rounded-lg pr-2 transition-colors ${
              isSelected ? "bg-orange-50" : "hover:bg-gray-50"
            }`}
            style={{ paddingLeft: `${node.depth * 16}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                aria-label={t("hr_management.organization.toggle_aria")}
                aria-expanded={!isCollapsed}
                onClick={() => onToggle(node.id)}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
              >
                {isCollapsed ? (
                  <ChevronRight className="size-4 shrink-0" />
                ) : (
                  <ChevronDown className="size-4 shrink-0" />
                )}
              </button>
            ) : (
              // Info: (20260810 - Julian) 佔位，讓沒有子部門的節點與有子部門的節點對齊
              <span className="size-6 shrink-0" />
            )}

            <button
              type="button"
              onClick={() => onSelect(node.id)}
              className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
            >
              <Building2
                className={`size-4 shrink-0 ${isSelected ? "text-orange-500" : "text-gray-400"}`}
              />
              <span
                className={`truncate text-sm ${
                  isSelected
                    ? "font-semibold text-orange-600"
                    : "font-medium text-gray-700"
                }`}
              >
                {node.name}
              </span>
            </button>

            <span className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
              <Users className="h-3.5 w-3.5 shrink-0" />
              {node.totalHeadcount}
            </span>
          </div>

          {hasChildren && !isCollapsed && <ul>{renderNodes(node.children)}</ul>}
        </li>
      );
    });

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-bold text-gray-700">
          {t("hr_management.organization.tree_title")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onExpandAll}
            className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            {t("hr_management.organization.expand_all")}
          </button>
          <button
            type="button"
            onClick={onCollapseAll}
            className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            {t("hr_management.organization.collapse_all")}
          </button>
        </div>
      </div>

      <ul className="max-h-[32rem] overflow-y-auto p-2">
        {renderNodes(nodes)}
      </ul>
    </div>
  );
};

export default DepartmentTree;
