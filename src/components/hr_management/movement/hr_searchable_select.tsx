"use client";

import { FC, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { HR_INPUT_CLASS } from "@/constants/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

export interface IHrSelectOption {
  value: string;
  label: string;
  /** Info: (20260812 - Julian) 次要資訊，靠右以淡色標籤呈現（工號、職稱） */
  hint?: string;
  /** Info: (20260812 - Julian) 分組標題；同組的選項要相鄰 */
  group?: string;
}

interface IHrSearchableSelectProps {
  id: string;
  value: string;
  options: IHrSelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  hasError?: boolean;
  /**
   * Info: (20260812 - Julian) 錯誤訊息節點的 id；沒有錯誤時傳空字串。
   * 預設值用 `""` 而不是省略，理由見 `hr_field.tsx` 的 `hint`
   * （`react/require-default-props`）。
   */
  describedBy?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  /** Info: (20260812 - Julian) 關閉下拉時呼叫，讓呼叫端把欄位標成「碰過」 */
  onBlur?: () => void;
}

/**
 * Info: (20260812 - Julian) 清單搜尋的下拉選單。
 *
 * 多做了無障礙：`role="listbox"`、`aria-expanded`、
 * Esc 關閉、選完把焦點還給觸發鈕。
 */
const HrSearchableSelect: FC<IHrSearchableSelectProps> = ({
  id,
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  hasError = false,
  describedBy = "",
  disabled = false,
  onChange,
  onBlur = () => {},
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (normalized === "") return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalized) ||
        (option.hint ?? "").toLowerCase().includes(normalized),
    );
  }, [options, keyword]);

  // Info: (20260812 - Julian) 點外面就關，與專案既有下拉一致
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Info: (20260812 - Julian) 開啟時把游標放進搜尋框、關閉時清掉關鍵字。
   *
   * 不清的話，下次打開會看到一份被上次的搜尋縮小過的清單，
   * 而使用者不會記得自己打過什麼 —— 那看起來就像「有些人不見了」。
   */
  useEffect(() => {
    if (isOpen) {
      searchRef.current?.focus();
      return;
    }
    setKeyword("");
  }, [isOpen]);

  const close = (shouldRefocus: boolean) => {
    setIsOpen(false);
    onBlur();
    if (shouldRefocus) triggerRef.current?.focus();
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    close(true);
  };

  /**
   * Info: (20260812 - Julian) Esc 關閉，掛在原生互動元素上而不是外層 div。
   *
   * 掛在容器 div 上比較省事，但那是一個沒有角色、拿不到焦點的元素在攔鍵盤事件
   * （`jsx-a11y/no-static-element-interactions`）—— 對只用鍵盤的人來說，
   * 事件到不到得了那個 div 完全看瀏覽器。面板打開時焦點必定落在搜尋框
   * 或某個選項鈕上，兩者都掛就等於全覆蓋，而且都是原生可聚焦元素。
   */
  const handleEscape = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close(true);
    }
  };

  let renderedGroup: string | null = null;
  const listboxId = `${id}-listbox`;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? close(false) : setIsOpen(true))}
        /**
         * Info: (20260812 - Julian) 角色是 combobox，不是單純的 button。
         *
         * 這顆鈕的行為就是「展開一份清單並從中選一個值」，而 `aria-invalid`
         * 在 button 角色上根本不被支援 —— 標成 button 的話，
         * 那個「這一欄填錯了」的訊息對輔助技術等於沒說（jsx-a11y 擋的就是這個）。
         * combobox 支援 `aria-invalid`、`aria-expanded` 與 `aria-controls`，
         * 三個我們都真的有在用。
         */
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-invalid={hasError}
        aria-describedby={describedBy === "" ? undefined : describedBy}
        className={`${HR_INPUT_CLASS} flex w-full items-center justify-between gap-2 text-left disabled:bg-gray-50 disabled:text-gray-400 ${
          hasError
            ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
            : ""
        }`}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-gray-700">{selected.label}</span>
            {selected.hint ? (
              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">
                {selected.hint}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="truncate text-gray-400">{placeholder}</span>
        )}
        <ChevronDown
          className={`size-4 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 bg-gray-50 p-2">
            <div className="relative">
              <Search className="absolute top-2 left-2.5 size-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={keyword}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={handleEscape}
                className="w-full rounded-md border border-gray-200 bg-white py-1.5 pr-3 pl-8 text-sm text-gray-700 placeholder:text-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div
            id={listboxId}
            role="listbox"
            aria-label={placeholder}
            className="max-h-60 overflow-y-auto"
          >
            {filtered.length > 0 ? (
              filtered.map((option) => {
                const isNewGroup =
                  option.group !== undefined && option.group !== renderedGroup;
                renderedGroup = option.group ?? null;

                return (
                  <div key={option.value}>
                    {isNewGroup ? (
                      <p className="bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-400">
                        {option.group}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      aria-selected={option.value === value}
                      onClick={() => handleSelect(option.value)}
                      onKeyDown={handleEscape}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 border-b border-gray-50 px-3 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-orange-50 focus:bg-orange-50 focus:outline-none ${
                        option.value === value ? "bg-orange-50" : ""
                      }`}
                    >
                      <span className="truncate font-semibold text-gray-700">
                        {option.label}
                      </span>
                      {option.hint ? (
                        <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-400">
                          {option.hint}
                        </span>
                      ) : null}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center text-sm text-gray-500">
                <Search className="size-6 text-gray-300" />
                {emptyText}
              </div>
            )}
          </div>

          {/*
            Info: (20260812 - Julian) 搜尋縮小了清單時說明「還有幾個沒顯示」。
            沒有這一行，使用者看到的是一份看起來很完整、實際上被過濾過的名單。
          */}
          {keyword.trim() !== "" && filtered.length > 0 ? (
            <p className="border-t border-gray-100 bg-gray-50 px-3 py-1.5 text-xs text-gray-400">
              {t("hr_management.value.select_filtered_count", {
                shown: filtered.length,
                total: options.length,
              })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default HrSearchableSelect;
