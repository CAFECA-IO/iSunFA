import { ITaskDefinition } from "@/lib/worker/task.generator";
import { SchemaType } from "@/services/faith.service";
import {
  IMissionDefinition,
  IMissionParams,
} from "@/lib/worker/mission.interface";
import { getJournalPrompt } from "@/constants/prompts/journal";
import {
  getBaseVoucherPrompt,
  getVoucherLinesPrompt,
} from "@/constants/prompts/voucher";
import { getEsgPrompt } from "@/constants/prompts/esg";
import { getDocumentDuplicateCheckPrompt } from "@/constants/prompts/document_check";
import { DocumentType, EsgGenerationSource } from "@/constants/enums";
import { IAccountBookBase } from "@/interfaces/account_book";

export function generateCertificateAnalysisMission(
  params: IMissionParams,
): IMissionDefinition | null {
  const accountBook = params.prerequisiteData?.accountBook as
    | IAccountBookBase
    | undefined;

  const fileId = params.fileId; // Info: (20260422 - Luphia) The single targeted file hash passed by MissionIssuer

  const tasks: ITaskDefinition[] = [];

  const context = JSON.stringify({
    fileId,
    accountBook,
  });

  tasks.push({
    type: "DOCUMENT_PRE_CHECK",
    order: 0,
    data: {
      key: `PRE_CHECK`,
      prompt: getDocumentDuplicateCheckPrompt(),
      context,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          invoiceNumber: { type: SchemaType.STRING, nullable: true },
          vendorTaxId: { type: SchemaType.STRING, nullable: true },
          tradingDate: { type: SchemaType.STRING, nullable: true },
          totalAmount: { type: SchemaType.NUMBER, nullable: true },
        },
      },
    },
  });

  tasks.push({
    type: "JOURNAL_PARSING",
    order: 1,
    data: {
      key: `JOURNAL`,
      prompt: getJournalPrompt(accountBook),
      context,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          tradingDate: { type: SchemaType.STRING },
          text: { type: SchemaType.STRING },
          confidence: { type: SchemaType.INTEGER },
          aiNote: { type: SchemaType.STRING },
        },
        required: ["tradingDate", "text", "confidence", "aiNote"],
      },
    },
  });

  tasks.push({
    type: "VOUCHER_BASE_PARSING",
    order: 1,
    data: {
      key: `VOUCHER_BASE`,
      prompt: getBaseVoucherPrompt(accountBook),
      context,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          aiNote: { type: SchemaType.STRING },
          vendorName: { type: SchemaType.STRING },
          documentType: {
            type: SchemaType.STRING,
            enum: Object.values(DocumentType),
            description: "Must strictly be one of the provided enums.",
            format: "enum",
          },
          totalAmount: { type: SchemaType.NUMBER },
          currency: {
            type: SchemaType.STRING,
            description: "Currency code, e.g. TWD, USD, JPY",
          },
          tradingDate: { type: SchemaType.STRING },
          tradingType: {
            type: SchemaType.STRING,
            enum: ["INCOME", "OUTCOME", "TRANSFER"],
            description: "Must strictly be one of the provided enums.",
            format: "enum",
          },
          note: { type: SchemaType.STRING },
          startDate: {
            type: SchemaType.STRING,
            description:
              "Extract the exact start date (YYYY-MM-DD) of the service period, billing period, or contract if mentioned.",
          },
          endDate: {
            type: SchemaType.STRING,
            description:
              "Extract the exact end date (YYYY-MM-DD) of the service period, billing period, or contract if mentioned.",
          },
          confidence: { type: SchemaType.INTEGER },
        },
        required: [
          "aiNote",
          "vendorName",
          "documentType",
          "totalAmount",
          "currency",
          "tradingDate",
          "tradingType",
          "note",
          "confidence",
        ],
      },
    },
  });

  tasks.push({
    type: "VOUCHER_LINES_PARSING",
    order: 1,
    data: {
      key: `VOUCHER_LINES`,
      prompt: getVoucherLinesPrompt(accountBook),
      context,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          aiNote: { type: SchemaType.STRING },
          lines: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                semanticCategory: { type: SchemaType.STRING },
                particular: { type: SchemaType.STRING },
                amount: { type: SchemaType.NUMBER },
                isDebit: { type: SchemaType.BOOLEAN },
              },
              required: ["semanticCategory", "particular", "amount", "isDebit"],
            },
          },
        },
        required: ["aiNote", "lines"],
      },
    },
  });

  tasks.push({
    type: "ESG_PARSING",
    order: 1,
    data: {
      key: `ESG`,
      prompt: getEsgPrompt(accountBook),
      context,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          aiNote: { type: SchemaType.STRING },
          isTarget: { type: SchemaType.BOOLEAN },
          activityType: { type: SchemaType.STRING, nullable: true },
          amount: { type: SchemaType.NUMBER, nullable: true },
          unit: { type: SchemaType.STRING, nullable: true },
          generationSource: {
            type: SchemaType.STRING,
            enum: Object.values(EsgGenerationSource),
            description: "Must strictly be one of the provided enums.",
            format: "enum",
          },
          confidence: { type: SchemaType.INTEGER },
        },
        required: ["aiNote", "isTarget", "confidence", "generationSource"],
      },
    },
  });

  return {
    name: `Certificate Analysis Batch - ${params.orderId || "Order"}`,
    tasks,
  };
}
