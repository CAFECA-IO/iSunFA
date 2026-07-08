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

export interface IAttachment {
  name: string;
  size: string;
}

export interface IChatMessage {
  id: string;
  sender: ChatRoleEnum;
  text: string;
  attachment?: IAttachment;
}

export interface IReportCategory {
  id: string;
  name: string;
  description: string;
  emissions: number;
}

export interface IReportData {
  documentName: string;
  title: string;
  section: string;
  categories: IReportCategory[];
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
