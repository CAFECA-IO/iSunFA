import { Task, Mission } from "@/generated/client";
import { ChatService } from "@/services/chat.service";

export interface ITaskSkill {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;

  execute(
    task: Task,
    mission: Mission,
    fullPrompt: string,
    chatService: ChatService,
  ): Promise<string>;
}
