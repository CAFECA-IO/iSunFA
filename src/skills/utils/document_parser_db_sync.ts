import { documentSyncRepo } from "@/repositories/document_sync.repo";
import { IParsedVoucherLine } from "@/interfaces/voucher";
import { EsgGenerationSource } from "@/constants/enums";
import { Prisma } from "@/generated";

export interface IDocNode {
  data?: IDocNode;
  tradingDate?: string | Date;
  confidence?: number | string;
  text?: string;
  aiNote?: string;
  documentType?: string;
  tradingType?: string;
  note?: string;
  currency?: string;
  lines?: IParsedVoucherLine[];
  coefficientId?: string;
  fallbackCategory?: string;
  emissionSourceId?: string;
  newEmissionSource?: {
    name?: string;
    description?: string;
    unit?: string;
    emissionFactor?: number | string;
    source?: string;
  };
  scope?: string;
  ghgProtocolCategory?: string;
  isoCategory?: string;
  activityType?: string;
  vendor?: string;
  vendorTaxId?: string;
  amount?: number | string;
  totalAmount?: number | string;
  taxAmount?: number | string;
  startDate?: string;
  endDate?: string;
  unit?: string;
  emissions?: number | string;
  ghgBreakdown?: Record<string, unknown>; // Info: (20260702 - Tzuhan) [AUDIT FIX]
  gwpVersion?: string; // Info: (20260702 - Tzuhan) [AUDIT FIX]
  intensity?: unknown;
  dqiScore?: number | string;
  generationSource?: EsgGenerationSource | string;
}

export interface IAggregatedDocumentResult {
  journal?: IDocNode;
  voucherBase?: IDocNode;
  voucherLines?: IDocNode;
  esg?: IDocNode;
  failureReason?: string;
}

export interface ISyncDocumentResultParams {
  fileId: string;
  accountBookId: string;
  result: IAggregatedDocumentResult;
  voucherIdContext?: string;
  esgRecordIdContext?: string;
  journalIdContext?: string;
}

export async function syncDocumentResultToDatabase(
  params: ISyncDocumentResultParams,
  tx?: Prisma.TransactionClient,
) {
  return documentSyncRepo.syncDocumentResultToDatabase(params, tx);
}
