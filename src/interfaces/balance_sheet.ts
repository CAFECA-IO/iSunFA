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

export interface ILiabilityDetails {
  fairValue: string;
  details: {
    userDeposit: IAssetType;
    accountsPayable: IAssetType;
  };
}

export interface IEquityDetails {
  fairValue: string;
  details: {
    retainedEarning: IAssetType;
    otherCapitalReserve: IAssetType;
  };
}

export interface IAssetType {
  fairValue: string;
  breakdown: {
    [key: string]: {
      amount: string;
      fairValue: string;
    };
  };
}

export interface IFairValueContainer {
  fairValue: string;
}
