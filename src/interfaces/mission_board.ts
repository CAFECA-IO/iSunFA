export enum TaskStatus {
  Open = 0,
  PendingReview = 1,
  Disputed = 2,
  Closed = 3,
}

export interface ISubmission {
  submitter: string;
  resultCid: string;
  consumedTokens: string;
  isRejected: boolean;
  disputeUntil: number;
  subIndex: number; // Info: (20260420 - Luphia) Added to help mapping
}

export interface ITask {
  taskId: number;
  creator: string;
  contentCid: string;
  reward: string; // Info: (20260420 - Luphia) in wei / text
  createdAt: number;
  updatedAt: number;
  status: TaskStatus;
  submissionCount: number;
  submissions: ISubmission[];
  _trueStatus?: TaskStatus; // Info: (20260424 - Luphia) For diff engine animations
}

export type LocalMissionStatus = 'executing' | 'completed' | 'failed' | 'pending';

export interface ILocalMission {
  folderId: string;
  status: LocalMissionStatus;
  failureCount: number;
  failedLogs: { filename: string; content: string }[];
}
