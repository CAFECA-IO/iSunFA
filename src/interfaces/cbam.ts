export interface IPersonaSupplier {
  name: string;
  taxId: string;
  errorRate: number;
}

export interface IPersonaSupplierCategory {
  category: string;
  suppliers: IPersonaSupplier[];
}

export interface IManufacturingProcess {
  stepName: string;
  description: string;
  energyIntensity: string;
  lossRate: number;
  processWeight_percent: number;
}

export interface ICompanyPersona {
  industryDynamics: string;
  topSuppliers: IPersonaSupplierCategory[];
  manufacturingProcess: IManufacturingProcess[];
  revenueScale: string;
  totalScope2Emissions_tCO2e: number;
  totalRevenue_NTD: number;
  voucherCalculationRationale: string;
  estimatedAnnualVouchers: number;
}

export interface IBomPrecursor {
  precursorName: string;
  supplierName: string;
  inputWeightKg: number;
  embeddedEmissionsKgCO2ePerKg: number;
  isCbamCovered?: boolean;
}

export interface IProductBom {
  productId: string;
  productName: string;
  cnCode: string;
  bom: IBomPrecursor[];
  materialComposition?: {
    element: string;
    percentage: number;
  }[];
  circularity?: {
    recycledContentShare_percent: number;
    recyclability_percent: number;
  };
}

export interface IBomData {
  products: IProductBom[];
}

export interface IMesWorkOrder {
  WorkOrderID: string;
  Timestamp: string;
  ProductID: string;
  ProcessStep: string;
  MachineID: string;
  InputWeight_kg: number;
  GoodWeight_kg: number;
  ScrapWeight_kg: number;
  DurationHrs: number;
  EnergyConsumed_kWh: number;
  LossRateAssumed: number;
}

export interface IOutsourcedLog {
  PO_Number: string;
  Ref_WorkOrderID: string;
  ProductID: string;
  SupplierName: string;
  ProcessName: string;
  DispatchDate: string;
  InputWeight_kg: number;
  OutputWeight_kg: number;
  SupplierScope1_kgCO2e: number;
  SupplierScope2_kgCO2e: number;
  ProcessingFee_NTD: number;
}

export interface ICustomsExportLog {
  InvoiceNo: string;
  Ref_WorkOrderID: string;
  ExportDate: string;
  DestinationCountry: string;
  CountryOfOrigin: string;
  Exporter_EORI: string;
  ProductID: string;
  ProductName: string;
  CN_Code: string;
  Quantity_pcs: number;
  NetWeight_kg: number;
  GrossWeight_kg: number;
  FOB_Value_USD: number;
}
