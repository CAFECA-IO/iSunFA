import { ITaskDefinition } from "@/lib/worker/task.generator";

export interface IMissionParams {
  category: string;
  periodType: string;
  periodValue: string;
  year: number;
  country?: string;
  keyword?: string;
  fileId?: string; // Info: (20260320 - Julian) 用於 AI 分析日記帳、傳票和碳盤查
  fileBase64?: string; // Info: (20260320 - Julian) 傳入檔案的 base64 字串
  fileMimeType?: string; // Info: (20260320 - Julian) 傳入檔案的 mimeType
  accountBookId?: string;
  prerequisiteData?: Record<string, unknown>;
  isExternal?: boolean;
}

export interface IMissionDefinition {
  name: string;
  tasks: ITaskDefinition[];
}
