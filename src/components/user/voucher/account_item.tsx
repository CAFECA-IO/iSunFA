"use client";

import { Plus, Pencil, ChevronRight, Trash2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { IAccountingAccount } from "@/interfaces/accounting_account";
import { ACCOUNT_TYPE_COLORS } from "@/constants/accounting_account";

interface IAccountItemProps {
  account: IAccountingAccount;
  onAddChild: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  onClick?: () => void;
  hasChildren?: boolean;
}

/**
 * Info: (20260706 - Julian) 大類 (Level 1) 與 主科目 (Level 2) 元件
 */
const CategorySubjectItem = ({
  account,
  onAddChild,
  onEdit,
  isSelected = false,
  onClick = () => {},
  hasChildren = false,
}: IAccountItemProps) => {
  const { t } = useTranslation();
  const colors = ACCOUNT_TYPE_COLORS[account.type] || ACCOUNT_TYPE_COLORS.other;
  const isLevel1 = account.level === 1;
  const canClick = isLevel1 || hasChildren;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (canClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  const interactionProps = canClick
    ? {
        onClick,
        onKeyDown: handleKeyDown,
        role: "button",
        tabIndex: 0,
      }
    : {};

  return (
    <div
      {...interactionProps}
      className={`group relative flex items-start gap-3 transition-all outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
        isLevel1
          ? "mt-6 mb-2 first:mt-0"
          : `rounded-xl border px-4 py-4 shadow-sm ${
              isSelected
                ? "border-orange-300 bg-orange-50 ring-2 ring-orange-500 ring-offset-2"
                : `border-slate-100 bg-white ${canClick ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}`
            } ${
              account.isCustom
                ? "border-dashed border-orange-300 bg-orange-50/50"
                : ""
            }`
      }`}
    >
      {/* Info: (20260706 - Julian) 自訂科目的裝飾條 */}
      {!isLevel1 && account.isCustom && (
        <div className="absolute top-0 bottom-0 -left-1 w-2 rounded-l-xl bg-orange-400" />
      )}

      {isLevel1 ? (
        <div
          className={`flex w-full items-center justify-between gap-2 rounded-lg border-b-2 border-slate-700 px-4 py-2.5 text-sm font-black tracking-widest text-white uppercase shadow-md ${colors.tab}`}
        >
          <p>{account.name}</p>
          <p>({account.code})</p>
        </div>
      ) : (
        <>
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg border px-2 py-1 text-xs font-black ${colors.bg} ${colors.text} ${colors.border} mt-0.5`}
          >
            {account.code}
          </div>
          <div className="flex flex-1 items-start justify-between gap-1 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="text-sm leading-relaxed font-bold wrap-break-word text-slate-700">
                {account.name}
              </div>
              {account.isCustom && (
                <span className="text-[10px] font-bold tracking-tighter text-orange-500 uppercase">
                  {t("voucher.account.custom")}
                </span>
              )}
            </div>
            {hasChildren && (
              <ChevronRight
                size={16}
                className={`mt-1 shrink-0 text-slate-300 transition-all ${
                  isSelected ? "translate-x-1 text-orange-500" : ""
                }`}
              />
            )}
          </div>
          {/* Info: (20260706 - Julian) 懸停動作，僅在自訂科目顯示 */}
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddChild();
              }}
              className="flex size-7 items-center justify-center rounded-full bg-green-100 text-green-600 shadow-sm transition-colors hover:bg-green-200"
              title={t("voucher.account.action.add_child")}
            >
              <Plus size={14} />
            </button>
            {account.isCustom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex size-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-sm transition-colors hover:bg-blue-100"
                title={t("voucher.account.action.edit")}
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Info: (20260706 - Julian) 子科目 (Level 3+) 元件
 */
const SubAccountItem = ({
  account,
  onAddChild,
  onEdit,
  onDelete = () => {},
}: IAccountItemProps) => {
  const { t } = useTranslation();
  const { level, type, code, name, isCustom, description } = account;

  const colors = ACCOUNT_TYPE_COLORS[type] || ACCOUNT_TYPE_COLORS.other;
  const offset = Math.max(0, level - 3) * 24; // Info: (20260706 - Julian) 子科目縮排效果，每多一層增加 24px

  // Info: (20260706 - Julian) 事件輔助函數：停止冒泡並執行動作
  const withStopProp = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  // Info: (20260706 - Julian) 主要動作：自訂科目為編輯，其餘為新增子科目
  const handleMainAction = isCustom ? onEdit : onAddChild;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleMainAction();
    }
  };

  return (
    <div
      onClick={withStopProp(handleMainAction)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-orange-500 md:px-6 ${
        isCustom ? "border-dashed border-orange-300" : "border-slate-100"
      }`}
      style={{ marginLeft: `${offset}px` }}
    >
      {isCustom && (
        <span className="rounded-md bg-orange-100 px-2 py-0.5 text-sm font-bold text-orange-500 uppercase">
          {t("voucher.account.custom")}
        </span>
      )}
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-bold md:text-base ${colors.bg} ${colors.text} ${colors.border}`}
      >
        {code}
      </div>

      {/* Info: (20260706 - Julian) 自訂科目的裝飾條 */}
      {isCustom && (
        <div className="absolute top-0 bottom-0 -left-1 w-2 rounded-l-xl bg-orange-400" />
      )}

      <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold whitespace-normal text-slate-700">
              {name}
            </p>
            <div
              className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text} ${colors.border}`}
            >
              {type}
            </div>
          </div>
          <p className="text-xs whitespace-normal text-slate-500">
            {description}
          </p>
        </div>

        <div className="absolute right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={withStopProp(onAddChild)}
            className="flex size-8 items-center justify-center rounded-full border border-green-200 bg-green-100 text-green-600 shadow-md transition-colors hover:bg-green-200"
            title={t("voucher.account.action.add_child")}
            aria-label={t("voucher.account.action.add_child")}
          >
            <Plus size={16} />
          </button>
          {isCustom && (
            <>
              <button
                type="button"
                onClick={withStopProp(onEdit)}
                className="flex size-8 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-600 shadow-md transition-colors hover:bg-blue-100"
                title={t("voucher.account.action.edit")}
                aria-label={t("voucher.account.action.edit")}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={withStopProp(onDelete)}
                className="flex size-8 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600 shadow-md transition-colors hover:bg-red-100"
                title={t("voucher.account.action.delete")}
                aria-label={t("voucher.account.action.delete")}
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export { CategorySubjectItem, SubAccountItem };
