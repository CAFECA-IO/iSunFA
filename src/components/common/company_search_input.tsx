import { FC, useState, useEffect } from "react";
import { Search } from "lucide-react";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";

export interface ICompany {
  taxId: string;
  name: string;
}

export interface ICompanySearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (company: ICompany) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const CompanySearchInput: FC<ICompanySearchInputProps> = ({
  value,
  onChange,
  onSelect = () => {},
  placeholder = "",
  className = "",
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<ICompany[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    if (value.includes("(") && value.endsWith(")")) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await request<{ payload: ICompany[] }>(
          `/api/v1/company/lookup?query=${encodeURIComponent(value)}`,
        );
        if (res?.payload) {
          setSuggestions(res.payload);
          setShowDropdown(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder={placeholder || "輸入股票代號或公司名稱..."}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-4 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:bg-slate-100 disabled:text-slate-500"
          disabled={disabled}
        />
      </div>

      {showDropdown && value && (
        <div className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {suggestions.length > 0 ? (
            suggestions.map((c) => (
              <button
                key={c.taxId}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(`${c.name} (${c.taxId})`);
                  if (onSelect) onSelect(c);
                  setShowDropdown(false);
                }}
                className="flex w-full cursor-pointer items-center justify-between border-b border-slate-100 px-4 py-2 text-left text-sm last:border-0 hover:bg-slate-50"
              >
                <span className="font-semibold text-slate-700">{c.name}</span>
                <span className="text-xs text-slate-400">{c.taxId}</span>
              </button>
            ))
          ) : !isSearching ? (
            <div className="m-2 flex flex-col gap-1 rounded-r border-l-4 border-orange-500 bg-slate-50 p-4">
              <span className="text-sm font-bold text-slate-700">
                尚未支援此非公開發行企業
              </span>
              <span className="text-xs text-slate-500">
                目前系統僅支援上市櫃公司之公開財報與 ESG
                永續報告書自動爬梳。若需特定企業展示，請聯絡技術團隊進行手動建檔。
              </span>
            </div>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              {t("analysis.company_input.searching") || "搜尋中..."}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { CompanySearchInput };
export default CompanySearchInput;
