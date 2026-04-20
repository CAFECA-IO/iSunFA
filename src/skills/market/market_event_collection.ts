import { ITaskSkill } from "@/skills/types";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ChatService } from "@/services/chat.service";

export class MarketEventCollectionSkill implements ITaskSkill {
  name = "MARKET_EVENT_COLLECTION";
  description =
    "Collect and analyze market events, using Google Search Grounding for recent dates.";
  parameters = {
    type: "object",
    properties: {
      endDate: {
        type: "string",
        description: "The end date of the analysis period (YYYY-MM-DD).",
      },
      marketName: {
        type: "string",
        description: "The market region to analyze.",
      },
      target: {
        type: "string",
        description: "The target keyword or industry.",
      },
    },
    required: [],
  };

  async execute(
    task: IPseudoTask,
    mission: IPseudoMission,
    fullPrompt: string,
    chatService: ChatService,
  ): Promise<string> {
    const taskData = task.data as { context?: string };
    let needsSearch = false;

    if (taskData.context) {
      try {
        const parsedContext = JSON.parse(taskData.context);
        if (
          parsedContext.endDate &&
          new Date(parsedContext.endDate) > new Date("2024-01-01")
        ) {
          needsSearch = true;
        }
      } catch (e) {
        console.warn(
          "[TaskService] Could not parse task context for date validation",
          e,
        );
      }
    }

    if (needsSearch) {
      console.log(
        `[TaskService] Enabling Google Search Grounding for Date > 2024-01-01...`,
      );
      return await chatService.generateRawWithSearch(fullPrompt);
    } else {
      return await chatService.generateRaw(fullPrompt);
    }
  }
}
