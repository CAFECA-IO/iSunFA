import { AssetHeader } from '@/interfaces/asset';

export enum ExportFileType {
  CSV = 'csv',
}

export enum ExportType {
  ASSETS = 'assets',
}

export enum AssetSortBy {
  ACQUISITION_DATE = 'acquisitionDate',
  PURCHASE_PRICE = 'purchasePrice',
  ACCUMULATED_DEPRECIATION = 'accumulatedDepreciation',
  RESIDUAL_VALUE = 'residualValue',
  REMAINING_LIFE = 'remainingLife',
}

export const DEFAULT_TIMEZONE = '+0800';

export const AssetFieldsMap: Record<keyof AssetHeader, string> = {
  acquisitionDate: '取得日期',
  name: '資產名稱',
  purchasePrice: '購買價格',
  accumulatedDepreciation: '累積折舊',
  residualValue: '殘值',
  remainingLife: '剩餘使用年限',
  type: '資產類型',
  status: '狀態',
  number: '資產編號',
};
