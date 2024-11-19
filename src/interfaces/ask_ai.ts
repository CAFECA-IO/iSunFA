import { ProgressStatus } from '@/constants/account';
import { AI_TYPE } from '@/constants/aich';

export interface IAskResult {
  reason: AI_TYPE;
  resultId: string;
  progressStatus: ProgressStatus;
}
