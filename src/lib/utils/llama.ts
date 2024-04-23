// Info Murky (20240423) This class is for llama connection
// every instruction need do declare in prompt, this class won't auto generate string of interface
export default class LlamaConnect<T> {
  llamaURL: string;

  model: string;

  prompt: string;

  interfaceJSON: string;

  retryLimit: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeGuard: (data: any) => data is T;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(
    model: string,
    prompt: string,
    interfaceJSON: string,
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

  private async postToLlama(input: string, retry: boolean = false): Promise<T | null> {
    try {
      const result = await fetch(this.llamaURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: !retry ? this.constructLLamaPrompt(input) : this.constructRetryPrompt(input),
          stream: false,
        }),
      });

      const { response } = await result.json();

      if (!response || typeof response !== 'string') {
        return null;
      }

      const dataString = LlamaConnect.extractJSONFromText(response);

      if (!dataString) {
        return null;
      }

      const responseJSON = JSON.parse(dataString);
      if (!this.typeGuard(responseJSON)) {
        return null;
      }
      return responseJSON;
    } catch (e) {
      return null;
    }
  }

  private async generateDataRecursive(input: string, retry: number): Promise<T | null> {
    try {
      let data: T | null;
      if (retry === 0) {
        data = await this.postToLlama(input, false);
      } else {
        data = await this.postToLlama(input, true);
      }

      if (retry < this.retryLimit && data === null) {
        return await this.generateDataRecursive(input, retry + 1);
      } else {
        return data;
      }
    } catch (e) {
      return null;
    }
  }

  public async generateData(input: string): Promise<T | null> {
    try {
      return await this.generateDataRecursive(input, 0);
    } catch (e) {
      return null;
    }
  }
}
