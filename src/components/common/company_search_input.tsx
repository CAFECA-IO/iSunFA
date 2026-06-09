import { Search } from "lucide-react";
import { ICompanySearchResult } from "@/app/user/dpp-demo/start/page";

export interface ICompanySearchInputProps {
  keyword: string;
  setKeyword: (val: string) => void;
  suggestions: ICompanySearchResult[];
  showDropdown: boolean;
  handleSelectCompany: (c: ICompanySearchResult) => void;
  disabled?: boolean;
}

export function CompanySearchInput({
  keyword,
  setKeyword,
  suggestions,
  showDropdown,
  handleSelectCompany,
  disabled = false,
}: ICompanySearchInputProps) {
  return (
    <div className="relative">
      <label
        htmlFor="companyKeyword"
        className="mb-1 block text-xs font-bold text-slate-700"
      >
        Target Enterprise (統一編號 / 企業名稱)
      </label>
      <div className="relative">
        <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
        <input
          id="companyKeyword"
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="輸入股票代號或公司名稱..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-4 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          disabled={disabled}
        />
      </div>
      {showDropdown && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {suggestions.length > 0 ? (
            suggestions.map((c) => (
              <button
                key={c.taxId}
                type="button"
                onClick={() => handleSelectCompany(c)}
                className="flex w-full cursor-pointer items-center justify-between border-b border-slate-100 px-4 py-2 text-left text-sm last:border-0 hover:bg-slate-50"
              >
                <span className="font-semibold text-slate-700">{c.name}</span>
                <span className="text-xs text-slate-400">{c.taxId}</span>
              </button>
            ))
          ) : (
            <div className="m-2 flex flex-col gap-1 rounded-r border-l-4 border-orange-500 bg-slate-50 p-4">
              <span className="text-sm font-bold text-slate-700">
                尚未支援此非公開發行企業
              </span>
              <span className="text-xs text-slate-500">
                目前系統僅支援上市櫃公司之公開財報與 ESG
                永續報告書自動爬梳。若需特定企業展示，請聯絡技術團隊進行手動建檔。
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
