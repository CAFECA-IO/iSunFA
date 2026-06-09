import { FC, useState, useEffect } from "react";
import { Building2 } from "lucide-react";
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
}

const CompanySearchInput: FC<ICompanySearchInputProps> = ({
  value,
  onChange,
  onSelect = () => {},
  placeholder = "",
  className = "",
}) => {
  const { t } = useTranslation();
  const [showCompanyDropdown, setShowCompanyDropdown] =
    useState<boolean>(false);
  const [companySuggestions, setCompanySuggestions] = useState<ICompany[]>([]);
  const [isSearchingCompany, setIsSearchingCompany] = useState<boolean>(false);

  useEffect(() => {
    if (!value.trim()) {
      setCompanySuggestions([]);
      return;
    }

    if (value.includes("(") && value.endsWith(")")) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCompany(true);
      try {
        const res = await request<{
          payload: ICompany[];
        }>(`/api/v1/company/lookup?query=${encodeURIComponent(value)}`);
        if (res?.payload) {
          setCompanySuggestions(res.payload);
          setShowCompanyDropdown(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingCompany(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Building2 className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder={placeholder || t("analysis.company_input.placeholder")}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowCompanyDropdown(true);
          }}
          onFocus={() => setShowCompanyDropdown(true)}
          onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 200)}
          className="block w-full rounded-lg border border-slate-200 py-2.5 pr-3 pl-10 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
        />
      </div>

      {showCompanyDropdown && value && (
        <div className="absolute top-full z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {companySuggestions.map((c) => (
            <button
              key={c.taxId}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(`${c.name} (${c.taxId})`);
                if (onSelect) onSelect(c);
                setShowCompanyDropdown(false);
              }}
              className="w-full border-b border-gray-100 px-4 py-2 text-left text-sm font-medium text-gray-700 last:border-0 hover:bg-orange-50"
            >
              {c.name}{" "}
              <span className="font-normal text-gray-400">({c.taxId})</span>
            </button>
          ))}
          {companySuggestions.length === 0 && !isSearchingCompany && value && (
            <div className="px-4 py-2 text-sm text-red-500">
              {t("analysis.company_input.not_found")}
            </div>
          )}
          {isSearchingCompany && (
            <div className="px-4 py-2 text-sm text-gray-500">
              {t("analysis.company_input.searching")}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanySearchInput;
