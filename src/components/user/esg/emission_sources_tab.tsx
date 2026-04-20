"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { numberWithCommas } from "@/lib/utils/common";
import {
  ChartColumn,
  ChartPie,
  ChevronDown,
  Database,
  Folder,
  Minus,
  Plus,
  Search,
  SearchX,
  Settings,
  Zap,
} from "lucide-react";
import { EsgScope } from "@/interfaces/esg";
import {
  EsgActivityTypeMapping,
  IEsgActivityType,
} from "@/constants/esg_activity_type";
import { CoefficientCategory, ICoefficient } from "@/interfaces/coefficient";

const top3EmissionSources = [
  {
    name: "台中廠區 - A 棟電表",
    value: 8420.5,
  },
  {
    name: "熱軋鋼捲採購 - 中鋼",
    value: 3250.2,
  },
  {
    name: "公司貨車 ABC-1234",
    value: 1240.8,
  },
];

const scopeData = [
  {
    scope: EsgScope.SCOPE_1,
    count: 3,
  },
  {
    scope: EsgScope.SCOPE_2,
    count: 2,
  },
  {
    scope: EsgScope.SCOPE_3,
    count: 5,
  },
];

interface IEmissionSource {
  id: string;
  name: string;
  activityType: IEsgActivityType;
  coefficient: ICoefficient;
}

const emissionSourceData: IEmissionSource[] = [
  {
    id: "2026042100000001",
    name: "台中廠區 - A 棟電表",
    activityType: {
      key: "ELECTRICITY_USAGE",
      value: "電力使用",
      scope: EsgScope.SCOPE_2,
      description: "如：電費單度數",
    },
    coefficient: {
      id: "1",
      category: CoefficientCategory.STANDARD,
      name: "電力使用",
      description: "電力使用",
      emissionFactor: 1.3,
      unit: "kgCO2e/kWh",
      source: "電力使用",
      createdAt: 0,
      updatedAt: 0,
    },
  },
  {
    id: "2026042100000002",
    name: "熱軋鋼捲採購 - 中鋼",
    activityType: {
      key: "PURCHASED_GOODS",
      value: "購買的商品",
      scope: EsgScope.SCOPE_3,
      description: "如：電費單度數",
    },
    coefficient: {
      id: "2",
      category: CoefficientCategory.STANDARD,
      name: "熱軋鋼捲採購 - 中鋼",
      description: "熱軋鋼捲採購 - 中鋼",
      emissionFactor: 2.2,
      unit: "kgCO2e/kWh",
      source: "熱軋鋼捲採購 - 中鋼",
      createdAt: 0,
      updatedAt: 0,
    },
  },
  {
    id: "2026042100000003",
    name: "公司貨車 ABC-1234",
    activityType: {
      key: "PURCHASED_GOODS",
      value: "購買的商品",
      scope: EsgScope.SCOPE_3,
      description: "如：電費單度數",
    },
    coefficient: {
      id: "3",
      category: CoefficientCategory.STANDARD,
      name: "公司貨車 ABC-1234",
      description: "公司貨車 ABC-1234",
      emissionFactor: 3.5,
      unit: "kgCO2e/kWh",
      source: "公司貨車 ABC-1234",
      createdAt: 0,
      updatedAt: 0,
    },
  },
  {
    id: "2026042100000004",
    name: "台中廠區 - 鍋爐",
    activityType: {
      key: "STATIONARY_COMBUSTION",
      value: "定點燃燒",
      scope: EsgScope.SCOPE_1,
      description: "如：鍋爐、發電機、瓦斯",
    },
    coefficient: {
      id: "4",
      category: CoefficientCategory.CUSTOM,
      name: "台中廠區 - 鍋爐",
      description: "台中廠區 - 鍋爐",
      emissionFactor: 0.5,
      unit: "kgCO2e/kWh",
      source: "台中廠區 - 鍋爐",
      createdAt: 0,
      updatedAt: 0,
    },
  },
  {
    id: "2026042100000005",
    name: "售出產品加工",
    activityType: {
      key: "PROCESSING_OF_SOLD_PRODUCTS",
      value: "售出產品加工",
      scope: EsgScope.SCOPE_3,
      description: "如：售出產品加工",
    },
    coefficient: {
      id: "4",
      category: CoefficientCategory.CUSTOM,
      name: "售出產品加工",
      description: "售出產品加工",
      emissionFactor: 0.03,
      unit: "kgCO2e/kWh",
      source: "售出產品加工",
      createdAt: 0,
      updatedAt: 0,
    },
  },
];

const EmissionSourcesItem = ({
  emissionSource,
}: {
  emissionSource: IEmissionSource;
}) => {
  const { coefficient } = emissionSource;

  // ToDo: (20260420 - Julian) Open Emission Source Setting Modal
  const clickAction = () => {
    console.log("clickAction");
  };

  return (
    <tr className="group/item border-b border-gray-100 transition-colors last:border-b-0 hover:bg-orange-50">
      <td className="px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100 text-slate-400 transition-colors group-hover/item:bg-white">
            <Folder size={20} />
          </div>
          <div className="flex flex-col font-bold">
            <p className="text-sm text-slate-800 transition-colors group-hover/item:text-orange-400">
              {emissionSource.name}
            </p>
            <p className="text-xs text-slate-400">{emissionSource.id}</p>
          </div>
        </div>
      </td>
      <td className="px-8 py-4 text-xs font-bold text-slate-500">
        {coefficient.source}
      </td>
      <td className="px-8 py-4">
        <p className="text-sm font-bold text-slate-800 uppercase">
          {numberWithCommas(coefficient.emissionFactor)}
          <span className="ml-1 text-[10px] text-slate-400">
            {coefficient.unit}
          </span>
        </p>
      </td>
      <td className="px-8 py-4 text-center text-sm">
        <button
          type="button"
          onClick={clickAction}
          className="rounded-lg bg-transparent p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-800"
        >
          <Settings size={20} />
        </button>
      </td>
    </tr>
  );
};

const ActivityTypeItem = ({
  activityTypeValue,
  emissionSources,
}: {
  activityTypeValue: string;
  emissionSources: IEmissionSource[];
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  // Info: (20260420 - Julian) 取得該 activityType 的排放源數量
  const countOfEmissionSources = emissionSources.length;

  const emissionSourcesList =
    countOfEmissionSources > 0 &&
    emissionSources.map((source) => (
      <EmissionSourcesItem key={source.id} emissionSource={source} />
    ));

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors duration-200 focus-within:border-orange-200 hover:border-orange-200">
      {/* Info: (20260420 - Julian) Header */}
      <div
        onClick={toggleOpen}
        className="flex cursor-pointer items-center justify-between rounded-xl p-6 transition-colors duration-200 hover:bg-orange-50"
      >
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100 text-slate-800 transition-colors group-hover:bg-white">
            <ChevronDown
              size={24}
              className={`${isOpen ? "" : "-rotate-90"} transition-all duration-200`}
            />
          </div>
          <div className="flex flex-col font-bold">
            <p className="text-base text-slate-800">{activityTypeValue}</p>
            <p className="text-xs text-slate-400">
              {countOfEmissionSources} 個排放源 ID
            </p>
          </div>
        </div>
        <div className="text-slate-400 transition-colors duration-200 group-hover:text-orange-600">
          {isOpen ? <Minus size={20} /> : <Plus size={20} />}
        </div>
      </div>
      {/* Info: (20260420 - Julian) Emission Sources Table */}
      <div
        className={`grid bg-white transition-[grid-template-rows,opacity,margin-top] duration-300 ease-in-out ${
          isOpen
            ? "visible grid-rows-[1fr] opacity-100"
            : "invisible grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <table className="w-full text-left">
            {/* Info: (20260420 - Julian) Table Header */}
            <thead className="border-y border-gray-200 bg-gray-50 text-xs text-slate-400">
              <tr>
                <th className="px-8 py-4 font-bold">排放源名稱 / ID</th>
                <th className="px-8 py-4 font-bold">係數來源</th>
                <th className="px-8 py-4 font-bold">排放係數 (EF)</th>
                <th className="px-8 py-4 text-center font-bold">操作</th>
              </tr>
            </thead>
            {/* Info: (20260420 - Julian) Table Body */}
            <tbody>{emissionSourcesList}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function EmissionSourcesTab() {
  const { t } = useTranslation();

  const [keyword, setKeyword] = useState<string>("");
  const [activeScopeTab, setActiveScopeTab] = useState<EsgScope>(EsgScope.SCOPE_1);

  // Info: (20260420 - Julian) 根據目前選取的範疇，取得對應的 activityType 陣列
  const getActivityTypeData = (scope: EsgScope) => {
    switch (scope) {
      case EsgScope.SCOPE_1:
        return EsgActivityTypeMapping.filter((at) => at.scope === EsgScope.SCOPE_1);
      case EsgScope.SCOPE_2:
        return EsgActivityTypeMapping.filter((at) => at.scope === EsgScope.SCOPE_2);
      case EsgScope.SCOPE_3:
        return EsgActivityTypeMapping.filter((at) => at.scope === EsgScope.SCOPE_3);
    }
  }

  // (20260420 - Julian) 計算總數
  const totalCount = scopeData.reduce((acc, curr) => acc + curr.count, 0);

  const scopeChart = scopeData.map((scope) => {
    const color =
      scope.scope === EsgScope.SCOPE_1
        ? "bg-pink-100"
        : scope.scope === EsgScope.SCOPE_2
          ? "bg-orange-100"
          : "bg-indigo-100";
    return (
      <div key={scope.scope} className="flex flex-col gap-1">
        <div className="flex h-16 flex-col justify-end">
          <div
            className={`w-full rounded-t-sm ${color}`}
            style={{ height: `${(scope.count / totalCount) * 100}%` }}
          />
        </div>
        <p className="text-center text-[10px] font-bold text-gray-400">
          {scope.scope}: {scope.count}
        </p>
      </div>
    );
  });

  const top3EmissionList = top3EmissionSources.map((source, index) => (
    <li key={index} className="pl-2 not-last:mb-2">
      <div className="flex items-center justify-between font-bold text-slate-800">
        <div>{source.name}</div>
        <div>{numberWithCommas(source.value)}</div>
      </div>
    </li>
  ));

  const banner = (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
      {/* Info: (20260420 - Julian) 排放源總數 */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-500 lg:text-sm">
            排放源總數
          </p>
          <div className="absolute -top-2 -right-2 rounded-xl bg-slate-100 p-1.5 text-slate-800">
            <Database size={20} />
          </div>
        </div>
        <p className="text-2xl font-black text-slate-800">
          10
          <span className="ml-1 text-sm font-semibold text-slate-400">
            個 ID
          </span>
        </p>
      </div>

      {/* Info: (20260420 - Julian) 預估年度總排放 */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-500 lg:text-sm">
            預估年度總排放
          </p>
          <div className="absolute -top-2 -right-2 rounded-xl bg-orange-50 p-1.5 text-orange-500">
            <Zap size={20} />
          </div>
        </div>
        <p className="text-2xl font-black text-slate-800">
          {numberWithCommas(15420.8)}
          <span className="ml-1 text-sm font-semibold text-slate-400">
            kgCO2e
          </span>
        </p>
      </div>

      {/* Info: (20260420 - Julian) 排放量前三名 */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-500 lg:text-sm">
            排放量前三名
          </p>
          <div className="absolute -top-2 -right-2 rounded-xl p-1.5 text-orange-400">
            <ChartColumn size={20} />
          </div>
        </div>
        <ul className="mt-4 ml-4 list-outside list-decimal text-xs marker:font-bold marker:text-orange-400">
          {top3EmissionList}
        </ul>
      </div>

      {/* Info: (20260420 - Julian) 範疇分佈 */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-500 lg:text-sm">
            範疇分佈
          </p>
          <div className="absolute -top-2 -right-2 rounded-xl p-1.5 text-gray-400">
            <ChartPie size={20} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 items-end gap-1">
          {scopeChart}
        </div>
      </div>
    </div>
  );

  const scopeTab = (
    <div className="grid w-fit grid-cols-3 space-x-1 rounded-xl border border-gray-200 bg-gray-100 p-1.5">
      {Object.values(EsgScope).map((scope) => (
        <button
          key={scope}
          title={t(`esg_main.tab.${scope.toLowerCase()}`)}
          type="button"
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200 lg:px-4 lg:py-2.5 lg:text-sm ${
            activeScopeTab === scope
              ? "bg-white text-orange-600 shadow-sm"
              : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
          }`}
          onClick={() => setActiveScopeTab(scope)}
          disabled={activeScopeTab === scope} // Info: (20260420 - Julian) 避免重複 call API
        >
          {t(`esg_table.scope.${scope.toLowerCase()}`)}
        </button>
      ))}
    </div>
  );

  // Info: (20260420 - Julian) 將相同的 activityType 的排放源集合成一組
  const groupedActivityTypes = getActivityTypeData(activeScopeTab)
    .map((activityType) => {
      const emissionSources = emissionSourceData.filter(
        (source) => source.activityType.key === activityType.key,
      );

      // Info: (20260420 - Julian) 所屬 activityType 下的排放源數量
      const countOfEmissionSources = emissionSources.length;

      // Info: (20260420 - Julian) 如果沒有排放源，就回傳 null
      if (countOfEmissionSources === 0) {
        return null;
      }

      // Info: (20260420 - Julian) 回傳 activityType 和所屬的排放源
      return {
        activityType,
        emissionSources,
      };
    })
    .filter((group) => group !== null); // Info: (20260420 - Julian) 排除掉沒有排放源的項目

  const emissionSourcesList =
    groupedActivityTypes.length > 0 ? (
      <div className="flex flex-col gap-4">
        {groupedActivityTypes.map((group) => (
          <ActivityTypeItem
            key={group.activityType.key}
            activityTypeValue={group.activityType.value}
            emissionSources={group.emissionSources}
          />
        ))}
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-lg font-bold text-slate-400">
        <SearchX size={40} />
        <p>No emission sources found</p>
      </div>
    );

  return (
    <div className="flex flex-col gap-8">
      {/* Info: (20260420 - Julian) Banner */}
      {banner}

      {/* Info: (20260420 - Julian) Toolbar */}
      <div className="flex flex-col gap-x-8 gap-y-2 rounded-xl bg-white p-3 shadow-sm md:flex-row md:p-6">
        {/* Info: (20260413 - Julian) Search */}
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-gray-50 p-2 lg:px-5 lg:py-3">
          <label htmlFor="emission-sources-search-input" className="sr-only">
            搜尋排放源
          </label>
          <Search size={20} className="text-gray-300" />
          <input
            id="emission-sources-search-input"
            aria-label="搜尋排放源"
            type="text"
            placeholder="搜尋排放源 ID 或名稱..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-gray-400 lg:text-base"
          />
        </div>
        {/* Info: (20260420 - Julian) Add Button */}
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 p-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 focus:outline-none lg:px-5 lg:py-3 lg:text-base"
        >
          <Plus size={20} />
          <p>新增排放源</p>
        </button>
      </div>

      {/* Info: (20260420 - Julian) Tab Switch */}
      {scopeTab}

      {/* Info: (20260420 - Julian) Emission Sources List */}
      {emissionSourcesList}
    </div>
  );
}
