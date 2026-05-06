import {
  AuditLogAction as ClientAuditLogAction,
  AuditLogDataType as ClientAuditLogDataType,
} from "@/constants/audit_log";
import {
  EsgScope as ClientEsgScope,
  EsgIntensity as ClientEsgIntensity,
} from "@/interfaces/esg";

// Info: (20260505 - Julian) 基礎篩選條件
export interface IBaseFilterOptions {
  accountBookId: string;
  keyword?: string | null;
  page?: number;
  limit?: number;
}

// Info: (20260505 - Julian) 基礎字串篩選條件
export interface IBaseStringFilter {
  equals?: string; // 完全符合
  in?: string[]; // 包含
  notIn?: string[]; // 不包含
  lt?: string; // 小於
  lte?: string; // 小於等於
  gt?: string; // 大於
  gte?: string; // 大於等於
  contains?: string; // 包含
  startsWith?: string; // 以...開頭
  endsWith?: string; // 以...結尾
  mode?: string; // 模式
  not?: string; // 不包含
}

// Info: (20260505 - Julian) 日記帳篩選條件
export interface IJournalFilterOptions extends IBaseFilterOptions {
  verifyStatus?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  sort?: "asc" | "desc" | null;
}

// Info: (20260505 - Julian) 傳票篩選條件
export interface IVoucherFilterOptions extends IBaseFilterOptions {
  verifyStatus?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  type?: string | null;
  hideDeleted?: boolean | null;
  orderBy?: string | null;
  sorting?: string | null;
}

// Info: (20260505 - Julian) ESG 紀錄篩選條件
export interface IEsgRecordFilterOptions extends IBaseFilterOptions {
  verifyStatus?: string | null;
  intensity?: ClientEsgIntensity | string | null;
  scope?: ClientEsgScope | string | null;
  sort?: "asc" | "desc" | null;
  year?: number | null;
  month?: number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  hideDeleted?: boolean | null;
}

// Info: (20260505 - Julian) 係數篩選條件
export interface ICoefficientFilterOptions extends IBaseFilterOptions {
  tab?: string | null;
  unit?: string | null;
}

// Info: (20260505 - Julian) 異動日誌篩選條件
export interface IAuditLogFilterOptions extends IBaseFilterOptions {
  actionType?: ClientAuditLogAction | null;
  dataType?: ClientAuditLogDataType | null;
  startDate?: string | null;
  endDate?: string | null;
}
