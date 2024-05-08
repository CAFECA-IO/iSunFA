import { isStringNumber } from './common';

export interface IBalanceSheet {
  reportID: string;
  reportName: string;
  reportStartTime: number;
  reportEndTime: number;
  reportType: string;
  totalAssetsFairValue: string;
  totalLiabilitiesAndEquityFairValue: string;
  assets: IAssetDetails;
  nonAssets: IFairValueContainer;
  liabilities: ILiabilityDetails;
  equity: IEquityDetails;
}

export interface IAssetDetails {
  fairValue: string;
  details: {
    cryptocurrency: IAssetType;
    cashAndCashEquivalent: IAssetType;
    accountsReceivable: IAssetType;
  };
}

interface ILiabilityDetails {
  fairValue: string;
  details: {
    userDeposit: IAssetType;
    accountsPayable: IAssetType;
  };
}

interface IEquityDetails {
  fairValue: string;
  details: {
    retainedEarning: IAssetType;
    otherCapitalReserve: IAssetType;
  };
}

interface IAssetType {
  fairValue: string;
  breakdown: {
    [key: string]: {
      amount: string;
      fairValue: string;
    };
  };
}

interface IFairValueContainer {
  fairValue: string;
}

// Info Murky (20240505): type guards
// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIBreakdown(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  return Object.values(obj).every(
    // Info Murky (20240505): type guards can input any type and return a boolean
    // prettier-ignore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any) => typeof item === 'object' &&
      item !== null &&
      isStringNumber(item.amount) &&
      isStringNumber(item.fairValue)
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIFairValueContainer(obj: any): obj is IFairValueContainer {
  return typeof obj === 'object' && obj !== null && isStringNumber(obj.fairValue);
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIAssetType(obj: any): obj is IAssetType {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.fairValue) &&
    isIBreakdown(obj.breakdown)
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isILiabilityDetails(obj: any): obj is ILiabilityDetails {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.fairValue) &&
    isIAssetType(obj.details.userDeposit) &&
    isIAssetType(obj.details.accountsPayable)
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIEquityDetails(obj: any): obj is IEquityDetails {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.fairValue) &&
    isIAssetType(obj.details.retainedEarning) &&
    isIAssetType(obj.details.otherCapitalReserve)
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIAssetDetails(obj: any): obj is IAssetDetails {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.fairValue) &&
    isIAssetType(obj.details.cryptocurrency) &&
    isIAssetType(obj.details.cashAndCashEquivalent) &&
    isIAssetType(obj.details.accountsReceivable)
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIBalanceSheet(obj: any): obj is IBalanceSheet {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.reportID === 'string' &&
    typeof obj.reportName === 'string' &&
    typeof obj.reportStartTime === 'number' &&
    typeof obj.reportEndTime === 'number' &&
    typeof obj.reportType === 'string' &&
    isStringNumber(obj.totalAssetsFairValue) &&
    isStringNumber(obj.totalLiabilitiesAndEquityFairValue) &&
    isIAssetDetails(obj.assets) &&
    isIFairValueContainer(obj.nonAssets) &&
    isILiabilityDetails(obj.liabilities) &&
    isIEquityDetails(obj.equity)
  );
}
