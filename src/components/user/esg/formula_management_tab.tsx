"use client";
/* eslint-disable jsx-a11y/no-static-element-interactions, react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { Globe, User, Plus, Search, PenLine, Trash2 } from "lucide-react";
import { timestampToString } from "@/lib/utils/common";
import ConfirmModal from "@/components/common/confirm_modal";
import FormulaAddEditModal from "@/components/user/esg/formula_add_edit_modal";
import { FormulaCategory, IFormula, mockFormulaList } from "@/interfaces/formula";

enum FormulaTab {
  ALL = "all",
  STANDARD = "standard",
  CUSTOM = "custom",
}

interface IFormulaCardProps {
  formula: IFormula;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const FormulaCard = ({ formula, onEdit, onDelete }: IFormulaCardProps) => {
  const [isShowAction, setIsShowAction] = useState<boolean>(false);

  // Info: (20260413 - Julian) 游標移入時顯示編輯與刪除按鈕
  const handleMouseEnter = () => setIsShowAction(true);
  // Info: (20260413 - Julian) 游標移出時隱藏編輯與刪除按鈕
  const handleMouseLeave = () => setIsShowAction(false);

  // Info: (20260413 - Julian) 只有自訂公式可以編輯與刪除
  const actions = formula.category === FormulaCategory.CUSTOM && (
    <div
      className={`${isShowAction ? "visible opacity-100" : "invisible opacity-0"} flex items-center gap-2 transition-all duration-200`}
    >
      <button
        type="button"
        onClick={() => onEdit(formula.id)}
        className="rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700"
      >
        <PenLine size={16} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(formula.id)}
        className="rounded-lg p-2 text-gray-400 transition-all hover:bg-red-100 hover:text-red-600"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const icon =
    formula.category === FormulaCategory.STANDARD ? (
      <div className="rounded-lg bg-green-100 p-2.5 text-green-600">
        <Globe size={24} />
      </div>
    ) : (
      <div className="rounded-lg bg-orange-100 p-2.5 text-orange-600">
        <User size={24} />
      </div>
    );
  const tag =
    formula.category === FormulaCategory.STANDARD ? (
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
                {formula.name}
              </h2>
              {tag}
            </div>
            <p className="text-[10px] text-gray-400 lg:text-xs">
              {formula.source} • 最後更新{" "}
              {timestampToString(formula.updatedAt).dateWithDash}
            </p>
          </div>
        </div>
        {/* Info: (20260413 - Julian) Action */}
        {actions}
      </div>
      {/* Info: (20260413 - Julian) Description */}
      <div className="flex flex-col gap-2">
        <p className="line-clamp-2 text-xs text-gray-500 lg:text-sm">
          {formula.description}
        </p>
      </div>
      {/* Info: (20260413 - Julian) Formula */}
      <div className="flex flex-col gap-4 rounded-lg bg-gray-50 p-4 font-semibold">
        <p className="text-xs text-gray-400 lg:text-sm">計算邏輯</p>
        <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
          <p className="text-sm text-slate-800 lg:text-base">
            {formula.unit} * {formula.emissionFactor}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs lg:text-sm">
            <p className="text-gray-400">排放係數 (EF)</p>
            <p className="text-slate-800">{formula.emissionFactor}</p>
          </div>
          <p className="text-xs tracking-widest text-gray-400 uppercase lg:text-sm">
            kgCO2e/{formula.unit}
          </p>
        </div>
      </div>
    </div>
  );
};



export default function FormulaManagementTab() {
  const [formulaList, setFormulaList] = useState<IFormula[]>(mockFormulaList);
  const [activeTab, setActiveTab] = useState<FormulaTab>(FormulaTab.ALL);

  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [selectedFormulaId, setSelectedFormulaId] = useState<string | null>(
    null,
  );
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] =
    useState<boolean>(false);

  const clickAddFormula = () => {
    setSelectedFormulaId(null);
    setIsAddEditModalOpen(true);
  };

  // ToDo: (20260413 - Julian) 刪除公式 API
  const deleteFormula = async () => {
    console.log(`delete formula ${selectedFormulaId}`);
  };

  useEffect(() => {
    switch (activeTab) {
      case FormulaTab.ALL:
        setFormulaList(mockFormulaList);
        break;
      case FormulaTab.STANDARD:
        setFormulaList(
          mockFormulaList.filter(
          (f) => f.category === FormulaCategory.STANDARD,
          ),
        );
        break;
      case FormulaTab.CUSTOM:
        setFormulaList(
          mockFormulaList.filter((f) => f.category === FormulaCategory.CUSTOM),
        );
        break;
      default:
        break;
    }
  }, [activeTab]);

  const tabs = Object.values(FormulaTab).map((tab) => (
    <button
      key={tab}
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`${tab === activeTab ? "text-slate-800" : "text-gray-400"} w-24 py-4 text-base font-semibold transition-all outline-none hover:text-slate-700`}
    >
      {/* ToDo: (20260413 - Julian) 使用翻譯檔 */}
      {tab === FormulaTab.ALL
        ? "全部"
        : tab === FormulaTab.STANDARD
          ? "標準公式"
          : "自訂公式"}
    </button>
  ));

  const displayedFormulaList = formulaList.map((formula) => {
    const handleEdit = (id: string) => {
      setSelectedFormulaId(id);
      setIsAddEditModalOpen(true);
    };
    const handleDelete = (id: string) => {
      setSelectedFormulaId(id);
      setIsDeleteConfirmOpen(true);
    };

    return (
      <FormulaCard
        key={formula.id}
        formula={formula}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
  });

  return (
    <>
      {/* Info: (20260413 - Julian) Toolbar */}
      <div className="flex flex-col gap-8 rounded-xl bg-white p-6 shadow-sm lg:flex-row">
        {/* Info: (20260413 - Julian) Search */}
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-gray-50 px-5 py-3">
          <label htmlFor="formula-search-input" className="sr-only">搜尋公式</label>
          <Search size={20} className="text-gray-300" />
          <input
            id="formula-search-input"
            aria-label="搜尋公式"
            type="text"
            placeholder="搜尋公式名稱、描述..."
            className="w-full bg-transparent text-base font-medium text-slate-800 outline-none placeholder:text-gray-400"
          />
        </div>
        {/* Info: (20260413 - Julian) Add Button */}
        <button
          type="button"
          onClick={clickAddFormula}
          className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-base font-medium text-white shadow-sm transition-all hover:bg-orange-600 focus:outline-none"
        >
          <Plus size={20} />
          <p>新增公式</p>
        </button>
      </div>

      {/* Info: (20260413 - Julian) Tab Switch */}
      <div className="relative flex items-center border-b border-gray-200">
        {tabs}
        <div
          className={`absolute bottom-0 left-0 h-1 w-24 bg-slate-700 transition-all duration-200 ${activeTab === FormulaTab.ALL ? "left-0" : ""} ${activeTab === FormulaTab.STANDARD ? "left-24" : ""} ${activeTab === FormulaTab.CUSTOM ? "left-48" : ""} `}
        ></div>
      </div>

      {/* Info: (20260413 - Julian) Formula Section */}
      <div className="grid grid-flow-row grid-cols-1 gap-y-4 lg:grid-cols-2 lg:gap-x-4">
        {displayedFormulaList}
      </div>

      {/* Info: (20260413 - Julian) Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title={"刪除公式"}
        message={"確定要刪除此公式嗎？"}
        confirmText={"刪除"}
        cancelText={"取消"}
        onConfirm={deleteFormula}
      />

      {/* Info: (20260413 - Julian) Add/Edit Modal */}
      <FormulaAddEditModal
        selectedFormulaId={selectedFormulaId}
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        onConfirm={() => setIsAddEditModalOpen(false)}
      />
    </>
  );
}
