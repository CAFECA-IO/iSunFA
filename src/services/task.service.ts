import { taskRepo } from '@/repositories/task.repo';
import { analysisRepo } from '@/repositories/analysis.repo';
import { ChatService } from '@/services/chat.service';
import { TASK_STATUS } from '@/constants/status';
import { missionService } from '@/services/mission.service';
import { Task, Mission } from '@/generated/client';

interface ITaskData {
  key: string;
  prompt: string;
  context?: string;
}

interface IMissionData {
  startDate?: string;
  endDate?: string;
  marketName?: string;
  historicalTags?: string[];
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
    // Info: (20260310 - Tzuhan) Pass mission object to buildTaskPrompt instead of just missionId
    const fullPrompt = await this.buildTaskPrompt(task, mission);

    // Info: (20260130 - Luphia) 3. Execute
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY');
    }
    const chatService = new ChatService(apiKey);

    // Info: (20260130 - Luphia) Execution
    console.log(`[TaskService] Executing LLM for Task ${task.id}...`);
    console.log(`[TaskService] Full Prompt: ${fullPrompt}`);
    let result = "";

    if (task.type === 'MARKET_EVENT_COLLECTION') {
      const taskData = task.data as unknown as ITaskData;
      let needsSearch = false;

      if (taskData.context) {
        try {
          const parsedContext = JSON.parse(taskData.context);
          if (parsedContext.endDate && new Date(parsedContext.endDate) > new Date('2024-01-01')) {
            needsSearch = true;
          }
        } catch (e) {
          console.warn('[TaskService] Could not parse task context for date validation', e);
        }
      }

      if (needsSearch) {
        console.log(`[TaskService] Enabling Google Search Grounding for Date > 2024-01-01...`);
        result = await chatService.generateRawWithSearch(fullPrompt);
      } else {
        result = await chatService.generateRaw(fullPrompt);
      }
    } else {
      result = await chatService.generateRaw(fullPrompt);
    }

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

    const prevTasks = await taskRepo.getTasksBeforeOrder(missionId, currentOrder);
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

  private async buildTaskPrompt(task: Task, mission: Mission): Promise<string> {
    const taskData = task.data as unknown as ITaskData;
    let interpolatedPrompt = taskData.prompt;

    const mData = (mission.data as unknown as IMissionData) || {};
    const currentDate = new Date().toISOString().split('T')[0];
    let startDate = mData.startDate || 'N/A';
    let endDate = mData.endDate || 'N/A';
    let marketName = '台灣';

    if (taskData.context) {
      try {
        const parsedContext = JSON.parse(taskData.context);
        startDate = parsedContext.startDate || startDate;
        endDate = parsedContext.endDate || endDate;
        marketName = parsedContext.marketName || marketName;
      } catch (e) {
        console.warn('[TaskService] Could not parse task context for date validation', e);
        startDate = mData.startDate || 'N/A';
        endDate = mData.endDate || 'N/A';
      }
    }

    interpolatedPrompt = interpolatedPrompt
      .replace(/\{Period_Start\}/g, startDate)
      .replace(/\{Period_End\}/g, endDate)
      .replace(/\{Market_Name\}/g, marketName)
      .replace(/\{Current_Date\}/g, currentDate)
    if (task.type === 'MARKET_TAG_EXTRACTION') {
      try {
        const topTags = await analysisRepo.getGlobalTopTags(20);
        const tagsString = topTags.length > 0 ? topTags.join(', ') : '無歷史標籤';
        interpolatedPrompt = interpolatedPrompt.replace(/\{Historical_Tags_List\}/g, tagsString);
      } catch(e) {
        console.warn('[TaskService] Failed to load global top tags:', e);
        interpolatedPrompt = interpolatedPrompt.replace(/\{Historical_Tags_List\}/g, '無歷史標籤');
      }
    } else {
        // Fallback for other tasks if they somehow have this variable, or if mission data provides it
        interpolatedPrompt = interpolatedPrompt.replace(/\{Historical_Tags_List\}/g, mData.historicalTags ? mData.historicalTags.join(', ') : '無歷史標籤');
    }

    if (task.order > 0) {
      // Info: (20260130 - Luphia) Fetch results from previous order
      const prevResults = await this.getPreviousOrderResults(mission.id, task.order);

      for (const [key, value] of prevResults.entries()) {
        interpolatedPrompt = interpolatedPrompt.replace(`[${key}_CONTENT]`, value);

        // Info: (20260310 - Tzuhan) Specific extraction for Market Analysis Step 2 Tag Extraction
        if (key === 'STEP_2') {
          const match = value.match(/最終決定的標籤清單：\[(.*?)\]/);
          const tags = match ? match[1] : '';
          interpolatedPrompt = interpolatedPrompt.replace(/\{Step_2_Final_Tags\}/g, tags);
        }
      }
    }

    let fullPrompt = "";
    if (taskData.context) {
      try {
        const parsedContext = JSON.parse(taskData.context);
        const targetString = `Category: ${parsedContext.category || 'N/A'} / Keyword: ${parsedContext.target} / Country: ${parsedContext.marketName} / Period: ${parsedContext.period} (Year: ${parsedContext.year})`;
        fullPrompt = `${targetString}\n\n${interpolatedPrompt}`;
      } catch (e) {
        console.warn('[TaskService] Could not parse task context for target string', e);
        fullPrompt = `${taskData.context}\n\n${interpolatedPrompt}`;
      }
    } else {
      fullPrompt = interpolatedPrompt;
    }

    return fullPrompt;
  }
}

export const taskService = new TaskService();
