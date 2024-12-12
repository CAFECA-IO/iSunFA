import { exportLedgerFieldsSchema } from '@/lib/utils/zod_schema/export_ledger';
import { z } from 'zod';

export type LedgerHeader = z.infer<typeof exportLedgerFieldsSchema>;
