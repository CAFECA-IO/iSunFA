import { IJournalListItem } from '@/interfaces/journal';
import { ISalaryRecord } from '@/interfaces/salary_record';

export interface IFolder {
  id: number;
  name: string;
  createdAt: number;
}

export interface IFolderContent extends IFolder {
  voucher: IJournalListItem;
  salaryRecordList: ISalaryRecord[];
}
