// Info Murky (20240423) This class is for llama connection

import { LLAMA_CONFIG } from '@/constants/config';

// every instruction need do declare in prompt, this class won't auto generate string of interface
export default class LlamaConnect<T> {
  llamaURL: string;

  model: string;

  prompt: string;

  interfaceJSON: string;

  retryLimit: number;

  // Info Murky (20240423) typeGuard is a function that convert raw data to T type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeCleaner: (rawData: any) => T;

  constructor(
    model: string,
    prompt: string,
    interfaceJSON: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeCleaner: (rawData: any) => T,
    retryLimit = 3
  ) {
    if (!process.env.LLAMA_URL) {
      throw new Error('LLAMA_URL is required in env.local');
    }

    this.llamaURL = `${process.env.LLAMA_URL}/api/generate`;
    this.model = model;
    this.prompt = prompt;
    this.interfaceJSON = interfaceJSON;
    this.typeCleaner = typeCleaner;
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

      // remove "json" if it is the first word
      if (jsonString.startsWith('json')) {
        return jsonString.slice(4);
      }

      return jsonString;
    }
    return null;
  }

  private constructLLamaPrompt(input: string): string {
    return `
    - 請閱讀以下說明:\n
    ${this.prompt} \n
    - 看完以上說明後，請依照下列資料產生相對應的json文件:\n
    ${input}\n
    以下是你需要回傳的JSON格式，請不要回傳此格式JSON以外的資訊：\n
    ${this.interfaceJSON}
    請開始你的回答，除了輸入植根範例一樣的狀況，不要生成和範例回答一樣的資訊`;
  }

  private constructRetryPrompt(input: string): string {
    return `
    - 你的回應不符合格式，請再試一次\n
    ${this.prompt} \n
    - 看完以上說明後，請依照下列資料產生相對應的json文件:\n
    ${input}\n
    以下是你需要回傳的JSON格式，請不要回傳此格式JSON以外的資訊：\n
    ${this.interfaceJSON}
    請開始你的回答，除了輸入植根範例一樣的狀況，不要生成和範例回答一樣的資訊`;
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
          options: LLAMA_CONFIG.options,
        }),
      });

      // Deprecation Murky (20240423) debug
      // eslint-disable-next-line no-console
      // console.log('option of ollama: ', JSON.stringify(LLAMA_CONFIG.options));

      const resultJSON = await result.json();

      // Deprecation Murky (20240423) debug
      // eslint-disable-next-line no-console
      // console.log('resultJSON:', resultJSON);

      let newContext = resultJSON.context;

      if (!newContext || !Array.isArray(newContext)) {
        newContext = [];
      }

      const { response } = resultJSON;

      // Deprecation Murky (20240423) debug
      // eslint-disable-next-line no-console
      // console.log('response:', response);

      if (!response || typeof response !== 'string') {
        return { responseJSON: null, context: newContext };
      }

      const dataString = LlamaConnect.extractJSONFromText(response);

      // Deprecation Murky (20240423) debug
      // eslint-disable-next-line no-console
      // console.log('dataString:', dataString);

      if (!dataString) {
        return { responseJSON: null, context: newContext };
      }

      let responseJSON: T;

      try {
        responseJSON = this.typeCleaner(JSON.parse(dataString));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        return { responseJSON: null, context: newContext };
      }

      return { responseJSON, context: newContext || '' };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
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

      // Deprecation Murky (20240423) debug
      // eslint-disable-next-line no-console
      // console.log('retryTimes:', retry, 'data:', data.responseJSON);

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
