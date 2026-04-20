
import { ChatService } from "@/services/chat.service";

export interface IPseudoTask {
  id: string;
  type: string;
  data: Record<string, unknown>;
  order: number;
}

export interface IPseudoMission {
  id: string;
  data: Record<string, unknown>;
}

export interface ITaskSkill {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;

  execute(
    task: IPseudoTask,
    mission: IPseudoMission,
    fullPrompt: string,
    chatService: ChatService,
  ): Promise<string>;
}
