import { ContractStatusWithAll } from '@/constants/contract';
import { SortOptions } from '@/constants/display';
import { AllReportTypesKey } from '@/interfaces/report_type';

export interface RegisterFormModalProps {
  invitation?: string;
}

export interface BookmarkItem {
  id: string;
  name: string;
  iconOnModal: JSX.Element;
  iconOnSection: JSX.Element;
  added: boolean;
  link: string;
  tempSelectedOnSection?: boolean;
  tempSelectedOnModal?: boolean;
}

export interface IFilterOptions {
  period: { startTimeStamp: number; endTimeStamp: number };
  sort: SortOptions;
  selectedReportType?: AllReportTypesKey;
  selectedStatus?: keyof typeof ContractStatusWithAll;
}

export const DUMMY_FILTER_OPTIONS: IFilterOptions = {
  period: { startTimeStamp: 0, endTimeStamp: 0 },
  sort: SortOptions.newest,
  selectedReportType: AllReportTypesKey.all,
  selectedStatus: 'ALL',
};

export enum FilterOptionsModalType {
  history = 'history',
  pending = 'pending',
  contract = 'contract',
}
