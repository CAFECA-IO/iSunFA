import { AssetSortBy, ExportFileType } from '@/constants/export_asset';
import { SortOrder } from '@/constants/sort';

// TODO: (20241108 - Shirley) 改成 zod input / output schema
export interface IAssetSort {
  by: AssetSortBy;
  order: SortOrder;
}

export interface IAssetExportRequestBody {
  fileType: ExportFileType;
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
