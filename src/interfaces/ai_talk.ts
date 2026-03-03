export type UserReaction = 'LIKE' | 'DISLIKE' | null;

export interface IThread {
  id: string;
  authorName: string;
  question: string;
  answer: string;
  createdAt: number;
  tags: string[];
  countOfLike: number;
  countOfDislike: number;
  countOfShare: number;
  countOfComment: number;
}

export interface IComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: number;
  likes: number;
  dislikes: number;
  isProfessional: boolean; // Info: (20260209 - Julian) 是否為專業評論
  isVerified: boolean; // Info: (20260209 - Julian) 用戶是否為專業認證
  parentId: string | null; // Info: (20260209 - Julian) 如果是第一層評論則為 null，回覆則存父評論 ID
  replyToUserName?: string; // Info: (20260209 - Julian) 可選：用於顯示「@某人」
  replies: IComment[]; // Info: (20260209 - Julian) 巢狀結構，存放該評論下的所有回覆
  isDeleted: boolean; // Info: (20260209 - Julian) 當評論被刪除但仍有子回覆時，可用於顯示「此評論已刪除」
  userReaction: UserReaction; // Info: (20260212 - Julian) 使用者對該評論的按讚、倒讚
}

export interface IFile {
  id: string;
  hash: string; // Info: (20260226 - Julian) 上傳至 IPFS 後，檔案的 Hash 值就是檔案 id
  threadId: string; // Info: (20260226 - Julian) 檔案所屬的討論串 id
  
  fileName?: string;
  mimeType?: string;
  metadata?: string;
  fileSize?: number;
  base64?: string;
}

export interface IThreadDetail extends IThread {
  userReaction: UserReaction; // Info: (20260212 - Julian) 使用者對該討論串的按讚、倒讚
  file: IFile[];
}
