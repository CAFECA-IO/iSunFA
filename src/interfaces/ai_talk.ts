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

export interface IAttachment {
  id: string;
  fileName: string;
  url: string;
  fileSize: number;
  mimeType: string; // Info: (20260209 - Julian) 檔案類型，例如 "image/jpeg"
  dimensions?: {
    // Info: (20260209 - Julian) 可選：圖片寬高，有助於前端預留 Layout 空間
    width: number;
    height: number;
  };
  thumbnailUrl?: string; // Info: (20260209 - Julian) 可選：縮圖路徑，加速列表讀取速度
}

export interface IThreadDetail extends IThread {
  userReaction: UserReaction; // Info: (20260212 - Julian) 使用者對該討論串的按讚、倒讚
  attachments: IAttachment[];
}
