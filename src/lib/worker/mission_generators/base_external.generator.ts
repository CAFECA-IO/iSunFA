import { ITaskDefinition } from "@/lib/worker/task.generator";
import {
  IMissionDefinition,
  IMissionParams,
} from "@/lib/worker/mission.interface";
import { getPeriodDateRange } from "@/lib/analysis/period";
import { COUNTRY_MAPPING } from "@/constants/country";

export interface IExternalPromptModule {
  STEP_1_EVENT_COLLECTION_PROMPT: string;
  STEP_2_TAG_EXTRACTION_PROMPT?: string;
  STEP_4_MARKET_REACTION_PROMPT?: string;
  STEP_5_FORMATTED_OUTPUT_PROMPT?: string;
  STEP_3_SUMMARY_AND_ANALYSIS_PROMPT?: string;
  STEP_3_1_SUMMARY_AND_ANALYSIS_PROMPT?: string;
  STEP_3_2_SUMMARY_AND_ANALYSIS_PROMPT?: string;
  STEP_3_FINAL_SUMMARY_AND_ANALYSIS_PROMPT?: string;
  buildNetZeroPrompt?: (
    params: import("@/constants/prompts/net_zero_emissions").INetZeroPromptParams,
  ) => string;
}

export function generateBaseExternalMission(
  params: IMissionParams,
  selectedPrompts: IExternalPromptModule,
): IMissionDefinition | null {
  const countryName = params.country
    ? COUNTRY_MAPPING[
        params.country.toUpperCase() as import("@/constants/enums").CountryCode
      ] || params.country
    : "臺灣";
  let startDateStr = "N/A";
  let endDateStr = "N/A";

  try {
    const { start, end } = getPeriodDateRange(
      params.periodType,
      params.year,
      params.periodValue,
    );
    startDateStr = start;
    endDateStr = end;
  } catch (e) {
    console.warn("Failed to parse date range for mission generator:", e);
  }

  const targetInfo = JSON.stringify({
    category: params.category,
    startDate: startDateStr,
    endDate: endDateStr,
    marketName: countryName,
    target:
      params.keyword ||
      (["carbon_health_check", "net_zero_emissions"].includes(params.category)
        ? "Target Company"
        : "General"),
    period: params.periodValue,
    year: params.year,
    esgRecordsContext:
      params.category === "carbon_health_check"
        ? params.prerequisiteData?.esgRecordsContext
        : undefined,
  });

  const tasks: ITaskDefinition[] = [];

  tasks.push({
    type: "MARKET_EVENT_COLLECTION",
    order: 0,
    data: {
      key: "STEP_1",
      prompt: selectedPrompts.STEP_1_EVENT_COLLECTION_PROMPT,
      context: targetInfo,
    },
  });

  if (
    params.category === "net_zero_emissions" &&
    selectedPrompts.buildNetZeroPrompt
  ) {
    const p =
      (params.prerequisiteData as unknown as import("@/constants/prompts/net_zero_emissions").INetZeroPromptParams) || {
        carbonHealthScore: 0,
        tier2Status: "NONE",
        failedQuestions: ["尚未檢測出明確痛點"],
        companyIndustry: "未分類產業",
      };
    const generatedPrompt = selectedPrompts.buildNetZeroPrompt(p);

    tasks.push({
      type: "MARKET_FORMATTED_OUTPUT",
      order: 1,
      data: {
        key: "STEP_5",
        prompt: generatedPrompt,
        context: targetInfo,
      },
    });
  } else {
    if (selectedPrompts.STEP_2_TAG_EXTRACTION_PROMPT) {
      tasks.push({
        type: "MARKET_TAG_EXTRACTION",
        order: 1,
        data: {
          key: "STEP_2",
          prompt: selectedPrompts.STEP_2_TAG_EXTRACTION_PROMPT,
          context: targetInfo,
        },
      });
    }

    if (
      selectedPrompts.STEP_3_1_SUMMARY_AND_ANALYSIS_PROMPT &&
      selectedPrompts.STEP_3_2_SUMMARY_AND_ANALYSIS_PROMPT &&
      selectedPrompts.STEP_3_FINAL_SUMMARY_AND_ANALYSIS_PROMPT &&
      selectedPrompts.STEP_4_MARKET_REACTION_PROMPT &&
      selectedPrompts.STEP_5_FORMATTED_OUTPUT_PROMPT
    ) {
      tasks.push({
        type: "MARKET_SUMMARY_ANALYSIS",
        order: 2,
        data: {
          key: "STEP_3_1",
          prompt: selectedPrompts.STEP_3_1_SUMMARY_AND_ANALYSIS_PROMPT,
          context: targetInfo,
        },
      });
      tasks.push({
        type: "MARKET_SUMMARY_ANALYSIS",
        order: 3,
        data: {
          key: "STEP_3_2",
          prompt: selectedPrompts.STEP_3_2_SUMMARY_AND_ANALYSIS_PROMPT,
          context: targetInfo,
        },
      });
      tasks.push({
        type: "MARKET_SUMMARY_ANALYSIS",
        order: 4,
        data: {
          key: "STEP_3_FINAL",
          prompt: selectedPrompts.STEP_3_FINAL_SUMMARY_AND_ANALYSIS_PROMPT,
          context: targetInfo,
        },
      });
      tasks.push({
        type: "MARKET_REACTION_PREDICTION",
        order: 5,
        data: {
          key: "STEP_4",
          prompt: selectedPrompts.STEP_4_MARKET_REACTION_PROMPT,
          context: targetInfo,
        },
      });
      tasks.push({
        type: "MARKET_FORMATTED_OUTPUT",
        order: 6,
        data: {
          key: "STEP_5",
          prompt: selectedPrompts.STEP_5_FORMATTED_OUTPUT_PROMPT,
          context: targetInfo,
        },
      });
    } else if (
      selectedPrompts.STEP_3_SUMMARY_AND_ANALYSIS_PROMPT &&
      selectedPrompts.STEP_4_MARKET_REACTION_PROMPT &&
      selectedPrompts.STEP_5_FORMATTED_OUTPUT_PROMPT
    ) {
      tasks.push({
        type: "MARKET_SUMMARY_ANALYSIS",
        order: 2,
        data: {
          key: "STEP_3",
          prompt: selectedPrompts.STEP_3_SUMMARY_AND_ANALYSIS_PROMPT,
          context: targetInfo,
        },
      });
      tasks.push({
        type: "MARKET_REACTION_PREDICTION",
        order: 3,
        data: {
          key: "STEP_4",
          prompt: selectedPrompts.STEP_4_MARKET_REACTION_PROMPT,
          context: targetInfo,
        },
      });
      tasks.push({
        type: "MARKET_FORMATTED_OUTPUT",
        order: 4,
        data: {
          key: "STEP_5",
          prompt: selectedPrompts.STEP_5_FORMATTED_OUTPUT_PROMPT,
          context: targetInfo,
        },
      });
    }
  }

  return {
    name: `External Analysis - ${params.category} - ${params.periodValue}`,
    tasks,
  };
}
