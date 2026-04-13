"use client";
/* eslint-disable jsx-a11y/no-static-element-interactions, react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import {
  Globe,
  User,
  Plus,
  Search,
  PenLine,
  Trash2,
  SearchX,
} from "lucide-react";
import { timestampToString } from "@/lib/utils/common";
import ConfirmModal from "@/components/common/confirm_modal";
import CoefficientAddEditModal from "@/components/user/esg/coefficient_add_edit_modal";
import {
  CoefficientCategory,
  ICoefficient,
  mockCoefficientList,
} from "@/interfaces/coefficient";

enum CoefficientTab {
  ALL = "all",
  STANDARD = "standard",
  CUSTOM = "custom",
}

interface ICoefficientCardProps {
  coefficient: ICoefficient;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const CoefficientCard = ({ coefficient, onEdit, onDelete }: ICoefficientCardProps) => {
  const [isShowAction, setIsShowAction] = useState<boolean>(false);

  // Info: (20260413 - Julian) 游標移入時顯示編輯與刪除按鈕
  const handleMouseEnter = () => setIsShowAction(true);
  // Info: (20260413 - Julian) 游標移出時隱藏編輯與刪除按鈕
  const handleMouseLeave = () => setIsShowAction(false);

  // Info: (20260413 - Julian) 只有自訂係數可以編輯與刪除
  const actions = coefficient.category === CoefficientCategory.CUSTOM && (
    <div
      className={`${isShowAction ? "visible opacity-100" : "invisible opacity-0"} flex items-center gap-2 transition-all duration-200`}
    >
      <button
        type="button"
        onClick={() => onEdit(coefficient.id)}
        className="rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700"
      >
        <PenLine size={16} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(coefficient.id)}
        className="rounded-lg p-2 text-gray-400 transition-all hover:bg-red-100 hover:text-red-600"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const icon =
    coefficient.category === CoefficientCategory.STANDARD ? (
      <div className="rounded-lg bg-green-100 p-2.5 text-green-600">
        <Globe size={24} />
      </div>
    ) : (
      <div className="rounded-lg bg-orange-100 p-2.5 text-orange-600">
        <User size={24} />
      </div>
    );
  const tag =
    coefficient.category === CoefficientCategory.STANDARD ? (
      <div className="rounded-lg bg-green-100 px-2.5 py-1 text-xs text-green-600">
        標準
      </div>
    ) : null;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm"
    >
      {/* Info: (20260413 - Julian) Header */}
      <div className="flex items-center justify-between">
        {/* Info: (20260413 - Julian) Title */}
        <div className="flex items-center gap-4">
          {icon}
          <div className="flex flex-col gap-1 font-bold">
            <div className="flex items-center gap-3">
              <h2 className="text-sm text-slate-800 lg:text-base">
                {coefficient.name}
              </h2>
              {tag}
            </div>
            <p className="text-[10px] text-gray-400 lg:text-xs">
              <span
                className={`${
                  coefficient.category === CoefficientCategory.STANDARD
                    ? "text-green-600"
                    : ""
                }`}
              >
                {coefficient.source}
              </span>{" "}
              • 最後更新{" "}
              {timestampToString(coefficient.updatedAt).dateWithDash}
            </p>
          </div>
        </div>
        {/* Info: (20260413 - Julian) Action */}
        {actions}
      </div>
      {/* Info: (20260413 - Julian) Description */}
      <div className="flex flex-col gap-2">
        <p className="line-clamp-2 text-xs text-gray-500 lg:text-sm">
          {coefficient.description}
        </p>
      </div>
      {/* Info: (20260413 - Julian) Coefficient */}
      <div className="flex flex-col gap-4 rounded-lg bg-gray-50 p-4 font-semibold">
        <p className="text-xs text-gray-400 lg:text-sm">計算邏輯</p>
        <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
          <p className="text-sm text-slate-800 lg:text-base">
            {coefficient.unit} * {coefficient.emissionFactor}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs lg:text-sm">
            <p className="text-gray-400">排放係數 (EF)</p>
            <p className="text-slate-800">{coefficient.emissionFactor}</p>
          </div>
          <p className="text-xs tracking-widest text-gray-400 uppercase lg:text-sm">
            kgCO2e/{coefficient.unit}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function CoefficientManagementTab() {
  const [coefficientList, setCoefficientList] = useState<ICoefficient[]>([]);
  const [activeTab, setActiveTab] = useState<CoefficientTab>(CoefficientTab.ALL);

  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [selectedCoefficientId, setSelectedCoefficientId] = useState<string | null>(
    null,
  );
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
    useState<boolean>(false);

  const clickAddCoefficient = () => {
    setSelectedCoefficientId(null);
    setIsAddEditModalOpen(true);
  };

  // ToDo: (20260413 - Julian) 刪除係數 API
  const deleteCoefficient = async () => {
    console.log(`delete coefficient ${selectedCoefficientId}`);
  };

  useEffect(() => {
    switch (activeTab) {
      case CoefficientTab.ALL:
        setCoefficientList(mockCoefficientList);
        break;
      case CoefficientTab.STANDARD:
        setCoefficientList(
          mockCoefficientList.filter(
            (f) => f.category === CoefficientCategory.STANDARD,
          ),
        );
        break;
      case CoefficientTab.CUSTOM:
        setCoefficientList(
          mockCoefficientList.filter((f) => f.category === CoefficientCategory.CUSTOM),
        );
        break;
      default:
        break;
    }
  }, [activeTab]);

  const tabs = Object.values(CoefficientTab).map((tab) => (
    <button
      key={tab}
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`${tab === activeTab ? "text-slate-800" : "text-gray-400"} w-24 py-4 text-base font-semibold transition-all outline-none hover:text-slate-700`}
    >
      {/* ToDo: (20260413 - Julian) 使用翻譯檔 */}
      {tab === CoefficientTab.ALL
        ? "全部"
        : tab === CoefficientTab.STANDARD
          ? "標準係數"
          : "自訂係數"}
    </button>
  ));

  const displayedCoefficientList = coefficientList.map((coefficient) => {
    const handleEdit = (id: string) => {
      setSelectedCoefficientId(id);
      setIsAddEditModalOpen(true);
    };
    const handleDelete = (id: string) => {
      setSelectedCoefficientId(id);
      setIsDeleteConfirmOpen(true);
    };

    return (
      <CoefficientCard
        key={coefficient.id}
        coefficient={coefficient}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
  });

  const coefficientSection =
    coefficientList.length > 0 ? (
      <div className="grid grid-flow-row grid-cols-1 gap-y-4 lg:grid-cols-2 lg:gap-x-4">
        {displayedCoefficientList}
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center gap-2 p-4 text-xl font-semibold text-gray-400">
        <SearchX size={40} />
        <p>沒有係數</p>
      </div>
    );

  return (
    <>
      {/* Info: (20260413 - Julian) Toolbar */}
      <div className="flex flex-col gap-8 rounded-xl bg-white p-6 shadow-sm lg:flex-row">
        {/* Info: (20260413 - Julian) Search */}
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-gray-50 px-5 py-3">
          <label htmlFor="coefficient-search-input" className="sr-only">
            搜尋係數
          </label>
          <Search size={20} className="text-gray-300" />
          <input
            id="coefficient-search-input"
            aria-label="搜尋係數"
            type="text"
            placeholder="搜尋係數名稱、描述..."
            className="w-full bg-transparent text-base font-medium text-slate-800 outline-none placeholder:text-gray-400"
          />
        </div>
        {/* Info: (20260413 - Julian) Add Button */}
        <button
          type="button"
          onClick={clickAddCoefficient}
          className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-base font-medium text-white shadow-sm transition-all hover:bg-orange-600 focus:outline-none"
        >
          <Plus size={20} />
          <p>新增係數</p>
        </button>
      </div>

      {/* Info: (20260413 - Julian) Tab Switch */}
      <div className="relative flex items-center border-b border-gray-200">
        {tabs}
        <div
          className={`absolute bottom-0 left-0 h-1 w-24 bg-slate-700 transition-all duration-200 ${activeTab === CoefficientTab.ALL ? "left-0" : ""} ${activeTab === CoefficientTab.STANDARD ? "left-24" : ""} ${activeTab === CoefficientTab.CUSTOM ? "left-48" : ""} `}
        ></div>
      </div>

      {/* Info: (20260413 - Julian) Coefficient Section */}
      {coefficientSection}

      {/* Info: (20260413 - Julian) Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title={"刪除係數"}
        message={"確定要刪除此係數嗎？"}
        confirmText={"刪除"}
        cancelText={"取消"}
        onConfirm={deleteCoefficient}
      />

      {/* Info: (20260413 - Julian) Add/Edit Modal */}
      <CoefficientAddEditModal
        selectedCoefficientId={selectedCoefficientId}
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        onConfirm={() => setIsAddEditModalOpen(false)}
      />
    </>
  );
}
