"use client";

import { FC } from "react";
import { Users } from "lucide-react";
import { IDepartmentTreeNode } from "@/interfaces/hr_management";
import { getEmployeeInitials } from "@/lib/utils/hr_employee";
import { useTranslation } from "@/i18n/i18n_context";

interface IDepartmentOrgChartProps {
  nodes: IDepartmentTreeNode[];
  selectedId: string | null;
  onSelect: (departmentId: string) => void;
}

interface IChartNodeProps {
  node: IDepartmentTreeNode;
  selectedId: string | null;
  onSelect: (departmentId: string) => void;
}

//Info: (20260810 - Julian) 上下式組織圖的單一節點（含其子樹）。
const ChartNode: FC<IChartNodeProps> = ({ node, selectedId, onSelect }) => {
  const { t } = useTranslation();
  const isSelected = node.id === selectedId;
  const isRoot = node.depth === 0;

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={`w-52 shrink-0 rounded-xl border bg-white p-3 text-center shadow-sm transition-colors ${
          isSelected
            ? "border-orange-500 ring-2 ring-orange-500/20"
            : "border-gray-200 hover:border-orange-300"
        }`}
      >
        <p className="font-mono text-[10px] tracking-wider text-gray-400">
          {node.code}
        </p>
        <p
          className={`mt-0.5 truncate font-semibold ${isRoot ? "text-orange-600" : "text-gray-800"}`}
        >
          {node.name}
        </p>

        <div className="mt-2 flex items-center justify-center gap-2">
          {node.managerName ? (
            <>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-semibold text-orange-600">
                {getEmployeeInitials(node.managerName)}
              </span>
              <span className="truncate text-xs text-gray-500">
                {node.managerName}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-300">
              {t("hr_management.organization.no_manager")}
            </span>
          )}
        </div>

        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
          <Users className="size-3 shrink-0" />
          {node.totalHeadcount}
          {t("hr_management.value.headcount_unit")}
        </span>
      </button>

      {node.children.length > 0 && (
        <>
          {/* Info: (20260810 - Julian) 由父節點往下的一豎 */}
          <span className="h-6 w-px bg-gray-300" />

          <div className="flex items-start">
            {node.children.map((child, index) => (
              <div
                key={child.id}
                className="relative flex flex-col items-center px-3 pt-6"
              >
                {index > 0 && (
                  <span className="absolute top-0 left-0 h-px w-1/2 bg-gray-300" />
                )}
                {index < node.children.length - 1 && (
                  <span className="absolute top-0 right-0 h-px w-1/2 bg-gray-300" />
                )}
                <span className="absolute top-0 left-1/2 h-6 w-px bg-gray-300" />

                <ChartNode
                  node={child}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Info: (20260810 - Julian) 組織圖模式。部門一多必然超出視窗寬度，因此由外層負責水平捲動
const DepartmentOrgChart: FC<IDepartmentOrgChartProps> = ({
  nodes,
  selectedId,
  onSelect,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="mb-4 text-xs text-gray-400">
        {t("hr_management.organization.chart_hint")}
      </p>
      {/**
       * Info: (20260810 - Julian) 置中用 `mx-auto` + `w-max`，不用 `justify-center`。
       *
       * flex 容器一旦 `justify-center` 而內容又超出寬度，溢出會平均分到左右兩側，
       * 而捲軸到不了負的位置 —— 組織圖一寬，最左邊那一支就永遠看不到。
       * auto margin 不會變成負值，因此窄的時候置中、寬的時候貼齊左緣正常捲動。
       */}
      <div className="w-full overflow-x-auto pb-2">
        <div className="mx-auto flex w-max gap-8">
          {nodes.map((node) => (
            <ChartNode
              key={node.id}
              node={node}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DepartmentOrgChart;
