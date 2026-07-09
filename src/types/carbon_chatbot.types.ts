// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260708 - Tzuhan) Define enterprise-grade types and enums for the Carbon Chatbot domain.

export enum ChatRoleEnum {
  USER = "user",
  AI = "ai",
}

export enum SessionStatusEnum {
  IN_PROGRESS = "進行中",
  COMPLETED = "已完成",
  DRAFT = "草稿",
  ARCHIVED = "已歸檔",
}

export interface IUploadedFileData {
  id: string;
  file: File;
  previewUrl: string | null;
  hash: string;
  base64: string;
}

export interface IChatMessage {
  id: string;
  sender: ChatRoleEnum;
  text: string;
  attachments?: IUploadedFileData[];
}

export interface IReportCategory {
  id: string;
  name: string;
  description: string;
  emissions: number;
}

export interface IReportParagraph {
  id: string;
  title: string;
  content: string;
  isCompleted: boolean;
  isVerified: boolean;
}

export interface IReportData {
  documentName: string;
  title: string;
  section: string;
  categories: IReportCategory[];
  paragraphs?: IReportParagraph[];
  totalEmissions: number;
}

export interface IChatSession {
  id: string;
  title: string;
  time: string;
  status: SessionStatusEnum;
  statusColor: string;
  progress: number;
  messages: IChatMessage[];
  currentStep?: string;
  reportData?: IReportData;
}
