// Info: (20260130 - Luphia) Task Definition Interface
export interface ITaskDefinition {
  type: string;
  order: number;
  data: {
    key: string;
    prompt: string;
    context?: string;
  };
}

export class TaskGenerator {
  generateTask(key: string, prompt: string, context: string, order: number = 0): ITaskDefinition {
    // Info: (20260130 - Luphia) Just return the logic definition, no execution
    return {
      type: 'LLM_GENERATION',
      order,
      data: {
        key,
        prompt,
        context
      }
    };
  }
}

