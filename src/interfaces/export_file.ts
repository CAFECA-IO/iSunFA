export interface BaseExportRequestBody {
  exportType: string;
  fileType: ExportFileType;
}

export enum ExportFileType {
  CSV = 'csv',
}

export enum ExportType {
  ASSETS = 'assets',
}

export interface AssetExportRequestBody extends BaseExportRequestBody {
  exportType: ExportType.ASSETS;
  filters?: {
    type?: string;
    status?: string;
    startDate?: number;
    endDate?: number;
    searchQuery?: string;
  };
  sortOption?: string;
  options?: {
    language?: string;
    timezone?: string;
    fields?: string[];
  };
}
