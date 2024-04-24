// Info Murky (20240423) This class is for llama connection
// every instruction need do declare in prompt, this class won't auto generate string of interface
export default class LlamaConnect<T> {
  llamaURL: string;

  model: string;

  prompt: string;

  interfaceJSON: string;

  retryLimit: number;

  // Info Murky (20240423) typeGuard is a function that checks if the data is of type T
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeGuard: (data: any) => data is T;

  constructor(
    model: string,
    prompt: string,
    interfaceJSON: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeGuard: (data: any) => data is T,
    retryLimit = 3
  ) {
    if (!process.env.LLAMA_URL) {
      throw new Error('LLAMA_URL is required in env.local');
    }

    this.llamaURL = `${process.env.LLAMA_URL}/api/generate`;
    this.model = model;
    this.prompt = prompt;
    this.interfaceJSON = interfaceJSON;
    this.typeGuard = typeGuard;
    this.retryLimit = retryLimit;
  }

  private static extractJSONFromText(text: string): string | null {
    // This regular expression matches text between triple backticks
    const regex = /```([^`]+)```/;

    // Executing the regex on the input text
    const match = regex.exec(text);

    if (match && match[1]) {
      // match[1] contains the first captured group which is the text between the backticks
      const jsonString = match[1].trim();
      return jsonString;
    }
    return null;
  }

  private constructLLamaPrompt(input: string): string {
    return `
    - 你需要按照以下的說明與來生成JSON檔:\n
    ${this.prompt} \n
    - 以下是生成JSON檔時給你使用的資料:\n
    ${input}\n
    以下是你需要回傳的JSON格式，請不要回傳此格式JSON以外的資訊：\n
    ${this.interfaceJSON}`;
  }

  private constructRetryPrompt(input: string): string {
    return `
    - 你的回應不符合格式，請再試一次\n
    ${this.prompt} \n
    - 以下是生成JSON檔時給你使用的資料:\n
    ${input}\n
    以下是你需要回傳的JSON格式，請不要回傳此格式以外的資訊, 並把json包在 \`\`\`\`\`\`之間, value都要用"雙引號"包起來：\n
    ${this.interfaceJSON}`;
  }

  private async postToLlama(
    input: string,
    context: number[],
    retry: boolean = false
  ): Promise<{ responseJSON: T | null; context: number[] }> {
    // Info Murky (20240423) context是llama的短期記憶
    try {
      const result = await fetch(this.llamaURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: !retry ? this.constructLLamaPrompt(input) : this.constructRetryPrompt(input),
          context,
          stream: false,
        }),
      });

      const resultJSON = await result.json();

      const { response } = resultJSON;
      let newContext = resultJSON.context;

      if (!newContext || !Array.isArray(newContext)) {
        newContext = [];
      }

      if (!response || typeof response !== 'string') {
        return { responseJSON: null, context: newContext };
      }

      const dataString = LlamaConnect.extractJSONFromText(response);

      if (!dataString) {
        return { responseJSON: null, context: newContext };
      }

      const responseJSON = JSON.parse(dataString);
      if (!this.typeGuard(responseJSON)) {
        return { responseJSON: null, context: newContext };
      }
      return { responseJSON, context: newContext || '' };
    } catch (e) {
      return { responseJSON: null, context: [] };
    }
  }

  private async generateDataRecursive(
    input: string,
    context: number[],
    retry: number
  ): Promise<T | null> {
    try {
      let data: { responseJSON: T | null; context: number[] };
      if (retry === 0) {
        data = await this.postToLlama(input, context, false);
      } else {
        data = await this.postToLlama(input, context, true);
      }

      if (retry < this.retryLimit && data.responseJSON === null) {
        return await this.generateDataRecursive(input, data.context, retry + 1);
      } else {
        return data.responseJSON;
      }
    } catch (e) {
      return null;
    }
  }

  public async generateData(input: string): Promise<T | null> {
    try {
      return await this.generateDataRecursive(input, [], 0);
    } catch (e) {
      return null;
    }
  }
}
