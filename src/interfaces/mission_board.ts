export enum TaskStatus {
  Open = 0,
  PendingReview = 1,
  Disputed = 2,
  Closed = 3,
}

export interface ISubmission {
  submitter: string;
  resultCid: string;
  consumedTokens: string; // Info: (20261015 - Luphia) 原始 token 數（十進位字串）
  isRejected: boolean;
  subIndex: number; // Info: (20260420 - Luphia) Added to help mapping
}

export interface ITask {
  taskId: number;
  creator: string;
  contentCid: string;
  reward: string; // Info: (20261015 - Luphia) 已由 wei 刻度換算成十進位字串
  createdAt: number;
  updatedAt: number;
  status: TaskStatus;
  submissionCount: number;
  submissions: ISubmission[];
  _trueStatus?: TaskStatus; // Info: (20260424 - Luphia) For diff engine animations
}

export type LocalMissionStatus =
  | "executing"
  | "completed"
  | "failed"
  | "pending";

export interface ILocalMission {
  folderId: string;
  status: LocalMissionStatus;
  failureCount: number;
  failedLogs: { filename: string; content: string }[];
}
