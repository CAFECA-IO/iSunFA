import { FC, useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Building2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ICompanySearchResult } from "@/app/(landing)/digital_product_passport_simulator/start/page";

export interface ISimulatorCompanySelectorProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (company: ICompanySearchResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const SimulatorCompanySelector: FC<ISimulatorCompanySelectorProps> = ({
  value,
  onChange,
  onSelect = () => {},
  placeholder = "",
  className = "",
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [availableCompanies, setAvailableCompanies] = useState<
    ICompanySearchResult[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Info: (20260612 - Tzuhan) Fetch all generated companies once on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch(
          "/api/v1/digital_product_passport_simulator/list",
        );
        if (res.ok) {
          const data = await res.json();
          // Info: (20260612 - Tzuhan) Fix: API returns { payload: [...] }
          const items = data.payload || [];

          // Info: (20260612 - Tzuhan) Extract unique companies
          const uniqueMap = new Map<string, ICompanySearchResult>();
          if (items && Array.isArray(items)) {
            items.forEach((item) => {
              if (item.stockId && item.name) {
                uniqueMap.set(item.stockId, {
                  taxId: item.stockId,
                  name: item.name,
                });
              }
            });
          }
          setAvailableCompanies(Array.from(uniqueMap.values()));
        }
      } catch (e) {
        console.error("Failed to fetch generated companies:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  // Info: (20260612 - Tzuhan) Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Info: (20260612 - Tzuhan) Focus search input when dropdown opens
  useEffect(() => {
    if (showDropdown && inputRef.current) {
      inputRef.current.focus();
    } else {
      setSearchKeyword(""); // Info: (20260612 - Tzuhan) clear search when closed
    }
  }, [showDropdown]);

  // Info: (20260612 - Tzuhan) Filter companies based on search input
  const filterKeywordLower = searchKeyword.trim().toLowerCase();
  const filteredCompanies = availableCompanies.filter((c) => {
    if (!filterKeywordLower) return true;
    const formattedName = `${c.name} (${c.taxId})`.toLowerCase();
    return (
      formattedName.includes(filterKeywordLower) ||
      c.name.toLowerCase().includes(filterKeywordLower) ||
      c.taxId.includes(filterKeywordLower)
    );
  });

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
      >
        <span className="flex items-center gap-2 truncate">
          {isLoading ? (
            <span className="text-slate-400">{t("common.loading")}</span>
          ) : value ? (
            <>
              <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
              {value}
            </>
          ) : (
            <span className="text-slate-400">
              {placeholder || "請選擇已生成的企業..."}
            </span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {showDropdown && (
        <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 bg-slate-50 p-2">
            <div className="relative">
              <Search className="absolute top-2 left-2.5 h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="搜尋企業名稱或統編..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white py-1.5 pr-3 pl-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((c) => (
                <button
                  key={c.taxId}
                  type="button"
                  onClick={() => {
                    onChange(`${c.name} (${c.taxId})`);
                    if (onSelect) onSelect(c);
                    setShowDropdown(false);
                  }}
                  className="flex w-full cursor-pointer items-center justify-between border-b border-slate-50 px-3 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                >
                  <span className="font-semibold text-slate-700">{c.name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-400">
                    {c.taxId}
                  </span>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center text-sm text-slate-500">
                <Search className="h-6 w-6 text-slate-300" />
                找不到符合的已生成企業
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { SimulatorCompanySelector };
export default SimulatorCompanySelector;
