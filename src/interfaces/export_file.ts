import { AssetSortBy, ExportFileType, ExportType } from '@/constants/export_file';
import { SortOrder } from '@/constants/sort';

export interface IBaseExportRequestBody {
  exportType: string;
  fileType: ExportFileType;
}

export interface IAssetSort {
  by: AssetSortBy;
  order: SortOrder;
}

export interface IAssetExportRequestBody extends IBaseExportRequestBody {
  exportType: ExportType.ASSETS;
  filters?: {
    type?: string;
    status?: string;
    startDate?: number;
    endDate?: number;
    searchQuery?: string;
  };
  sort?: IAssetSort[];
  options?: {
    language?: string;
    timezone?: string;
    fields?: string[];
  };
}
