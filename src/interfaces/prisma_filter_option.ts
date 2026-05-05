import { AuditLogAction, AuditLogDataType } from "@/constants/audit_log";

export interface IBaseFilterOptions {
  accountBookId: string;
  keyword?: string | null;
  page?: number;
  limit?: number;
}

// Info: (20260505 - Julian) 異動日誌篩選條件
export interface IAuditLogFilterOptions extends IBaseFilterOptions {
  actionType?: AuditLogAction | null;
  dataType?: AuditLogDataType | null;
  startDate?: string | null;
  endDate?: string | null;
}

// Info: (20260505 - Julian) 係數篩選條件
export interface ICoefficientFilterOptions extends IBaseFilterOptions {
  tab?: string | null;
  unit?: string | null;
}
