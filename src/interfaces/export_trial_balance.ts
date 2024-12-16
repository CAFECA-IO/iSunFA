import { exportTrialBalanceFieldsSchema } from '@/lib/utils/zod_schema/export_trial_balance';
import { z } from 'zod';

export type ITrialBalanceHeader = z.infer<typeof exportTrialBalanceFieldsSchema>;
