import { AssetSortBy, ExportFileType, ExportType } from '@/constants/export_file';
import { SortOrder } from '@/constants/sort';

// TODO: (20241108 - Shirley) 改成 zod input / output schema
export interface IBaseExportRequestBody {
  exportType: string;
  fileType: ExportFileType;
}

export type IExportRequestBody = IAssetExportRequestBody;

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
