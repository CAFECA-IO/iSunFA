import { documentSyncRepo } from "@/repositories/document_sync.repo";
import { IParsedVoucherLine } from "@/interfaces/voucher";

export interface IDocNode {
  data?: IDocNode;
  tradingDate?: string | Date;
  confidence?: number | string;
  text?: string;
  aiNote?: string;
  tradingType?: string;
  note?: string;
  currency?: string;
  lines?: IParsedVoucherLine[];
  coefficientId?: string;
  newCoefficient?: {
    name?: string;
    description?: string;
    unit?: string;
    emissionFactor?: number | string;
    source?: string;
  };
  emissionSourceId?: string;
  newEmissionSource?: {
    name?: string;
    description?: string;
    unit?: string;
    emissionFactor?: number | string;
    source?: string;
  };
  scope?: string;
  activityType?: string;
  vendor?: string;
  amount?: number | string;
  unit?: string;
  emissions?: number | string;
  intensity?: unknown;
  dqiScore?: number | string;
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
) {
  return documentSyncRepo.syncDocumentResultToDatabase(params);
}
