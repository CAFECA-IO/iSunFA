import { ITaskSkill } from "@/skills/types";
import { JournalParsingSkill } from "@/skills/document/journal_parsing";
import { VoucherBaseParsingSkill } from "@/skills/document/voucher_base_parsing";
import { VoucherLinesParsingSkill } from "@/skills/document/voucher_lines_parsing";
import { EsgParsingSkill } from "@/skills/document/esg_parsing";
import { EsgIntensityEvaluationSkill } from "@/skills/document/esg_intensity_evaluation";
import { DocumentPreCheckSkill } from "@/skills/document/document_pre_check";
import { MarketEventCollectionSkill } from "@/skills/market/market_event_collection";
import { AiConsultingSkill } from "@/skills/ai_consulting/ai_consulting";

export const skillRegistry: Record<string, ITaskSkill> = {
  JOURNAL_PARSING: new JournalParsingSkill(),
  VOUCHER_BASE_PARSING: new VoucherBaseParsingSkill(),
  VOUCHER_LINES_PARSING: new VoucherLinesParsingSkill(),
  ESG_PARSING: new EsgParsingSkill(),
  ESG_INTENSITY_EVALUATION: new EsgIntensityEvaluationSkill(),
  DOCUMENT_PRE_CHECK: new DocumentPreCheckSkill(),
  MARKET_EVENT_COLLECTION: new MarketEventCollectionSkill(),
  AI_TALK_TASK: new AiConsultingSkill(),
};
