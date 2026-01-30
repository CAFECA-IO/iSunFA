import { taskRepo } from '@/repositories/task.repo';
import { ChatService } from '@/services/chat.service';
import { TASK_STATUS } from '@/constants/status';
import { missionService } from '@/services/mission.service';
import { Task, Mission } from '@/generated/client';

interface ITaskData {
  key: string;
  prompt: string;
  context?: string;
}

export class TaskService {
  private isProcessing = false;

  /**
   * Info: (20260130 - Luphia) 
   * Trigger execution of the next available task.
   * Can be called by a worker, cron, or API route.
   */
  async processNextTask(): Promise<boolean> {
    if (this.isProcessing) {
      console.log('[TaskService] Already processing, skipping...');
      return false;
    }

    this.isProcessing = true;
    try {
      // Info: (20260130 - Luphia) 1. Find next candidate
      const candidate = await taskRepo.findNextPendingTask();
      if (!candidate) {
        console.log(`[TaskService] No pending tasks found. (${new Date().toLocaleString('zh-TW', { hour12: false })})`);
        return false;
      }

      const { task, mission } = candidate;

      await this.executeTask(task, mission);

      return true;

    } catch (error) {
      console.error('[TaskService] Error processing task:', error);
      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  async executeTask(task: Task, mission: Mission) {
    console.log(`[TaskService] Processing Task: ${task.id} (Mission: ${mission.id}, Order: ${task.order})`);

    // Info: (20260130 - Luphia) Mark as RUNNING
    await taskRepo.updateStatus(task.id, TASK_STATUS.RUNNING);

    // Info: (20260130 - Luphia) 2. Prepare Context
    const fullPrompt = await this.buildTaskPrompt(task, mission.id);

    // Info: (20260130 - Luphia) 3. Execute
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY');
    }
    const chatService = new ChatService(apiKey);

    // Info: (20260130 - Luphia) Execution
    console.log(`[TaskService] Executing LLM for Task ${task.id}...`);
    console.log(`[TaskService] Full Prompt: ${fullPrompt}`);
    const result = await chatService.generateRaw(fullPrompt);

    /**
     * Info: (20260130 - Luphia) 4. Save
     * Save raw string result directly? Or wrap in object? AnalysisService uses JSON. Let's start with raw, or { content: result }?
     */
    await taskRepo.updateStatus(task.id, TASK_STATUS.COMPLETED, result);
    console.log(`[TaskService] Task ${task.id} Completed.`);

    // Info: (20260130 - Luphia) 5. Check Mission Completion
    await missionService.tryCompleteMission(mission.id);
  }

  private async getPreviousOrderResults(missionId: string, currentOrder: number): Promise<Map<string, string>> {
    if (currentOrder <= 0) return new Map();

    const prevTasks = await taskRepo.getTasksByOrder(missionId, currentOrder - 1);
    const results = new Map<string, string>();

    prevTasks.forEach(pt => {
      const ptData = pt.data as unknown as ITaskData;
      const ptResult = pt.result as string;

      if (ptData && ptData.key && ptResult) {
        results.set(ptData.key, ptResult);
      }
    });

    return results;
  }

  private async buildTaskPrompt(task: Task, missionId: string): Promise<string> {
    const taskData = task.data as unknown as ITaskData;
    let fullPrompt = "";

    if (task.order === 0) {
      if (taskData.context) {
        fullPrompt = `${taskData.context}\n\n${taskData.prompt}`;
      } else {
        fullPrompt = taskData.prompt;
      }
    } else {
      // Info: (20260130 - Luphia) Fetch results from previous order
      const prevResults = await this.getPreviousOrderResults(missionId, task.order);

      let interpolatedPrompt = taskData.prompt;

      for (const [key, value] of prevResults.entries()) {
        interpolatedPrompt = interpolatedPrompt.replace(`[${key}_CONTENT]`, value);
      }

      if (taskData.context) {
        fullPrompt = `${taskData.context}\n\n${interpolatedPrompt}`;
      } else {
        fullPrompt = interpolatedPrompt;
      }
    }
    return fullPrompt;
  }
}

export const taskService = new TaskService();
