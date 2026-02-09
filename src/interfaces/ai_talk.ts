export interface IThread {
  id: number;
  authorId: string;
  question: string;
  answer: string;
  createdAt: number;
  tags: string[];
  countOfLike: number;
  countOfDislike: number;
  countOfShare: number;
}

export interface IComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: number;
  likes: number;
  dislikes: number;
  isProfessional: boolean; // 是否為專業評論
  isVerified: boolean; // 用戶是否為專業認證
  parentId: string | null; // 如果是第一層評論則為 null，回覆則存父評論 ID
  replyToUserId?: string; // 可選：用於顯示「@某人」
  replies: IComment[]; // 巢狀結構，存放該評論下的所有回覆
  isDeleted: boolean; // 當評論被刪除但仍有子回覆時，可用於顯示「此評論已刪除」
}

export interface IAttachment {
  id: string;
  fileName: string;
  url: string;
  fileSize: number;
  mimeType: string; // 檔案類型，例如 "image/jpeg"
  dimensions?: {
    // 可選：圖片寬高，有助於前端預留 Layout 空間
    width: number;
    height: number;
  };
  thumbnailUrl?: string; // 可選：縮圖路徑，加速列表讀取速度
}

export interface IThreadDetail extends IThread {
  attachments: IAttachment[];
  comments: IComment[];
}

const mockComments: IComment[] = [
  {
    id: "1",
    authorId: "user_001",
    content:
      "AI 的解析基本正確，但要補充一點：如果是餐飲業，還需注意「交際費」在年度申報時的限額問題。建議建立獨立的餐飲支出清單，方便月底核銷。",
    createdAt: 1770365492,
    likes: 103,
    dislikes: 24,
    isProfessional: true,
    isVerified: true,
    parentId: null,
    replies: [],
    isDeleted: false,
  },
  {
    id: "2",
    authorId: "user_002",
    content: "AI 解析有誤，請注意。",
    createdAt: 1770345093,
    likes: 1,
    dislikes: 3,
    isProfessional: false,
    isVerified: false,
    parentId: null,
    replies: [],
    isDeleted: false,
  },
  {
    id: "3",
    authorId: "user_003",
    content: "AI 的回答很棒，謝謝！",
    createdAt: 1770345093,
    likes: 0,
    dislikes: 0,
    isProfessional: false,
    isVerified: false,
    parentId: null,
    replies: [],
    isDeleted: false,
  },
  {
    id: "4",
    authorId: "user_004",
    content: "測試巢狀評論",
    createdAt: 1770345093,
    likes: 45,
    dislikes: 15,
    isProfessional: false,
    isVerified: false,
    parentId: null,
    replies: [
      {
        id: "5",
        authorId: "user_005",
        content: "我是巢狀 01",
        createdAt: 1770345093,
        likes: 1,
        dislikes: 0,
        isProfessional: false,
        isVerified: false,
        parentId: '4',
        replyToUserId: "user_004",
        replies: [],
        isDeleted: false,
      },
      {
        id: "6",
        authorId: "user_006",
        content: "我是巢狀 02",
        createdAt: 1770345093,
        likes: 2,
        dislikes: 0,
        isProfessional: false,
        isVerified: false,
        parentId: '4',
        replyToUserId: "user_005",
        replies: [],
        isDeleted: false,
      },
    ],
    isDeleted: false,
  },
];

const mockAttachments: IAttachment[] = [
  {
    id: "1",
    fileName: "憑證_01.jpg",
    url: "/test/電子紙本發票2.png",
    fileSize: 1024,
    mimeType: "image/jpeg",
    dimensions: {
      width: 800,
      height: 600,
    },
    thumbnailUrl:"/test/電子紙本發票2.png",
  },
  {
    id: "2",
    fileName: "憑證_02.jpg",
    url: "/test/捐款收據範例.jpg",
    fileSize: 1024,
    mimeType: "image/jpeg",
    dimensions: {
      width: 800,
      height: 600,
    },
    thumbnailUrl:"/test/捐款收據範例.jpg",
  },
];

export const mockThreads: IThreadDetail[] = [
  {
    id: 1,
    authorId: "user_001",
    question: "What is the capital of France?",
    answer: "The capital of France is Paris.",
    tags: ["France", "Paris"],
    createdAt: 1770365492,
    countOfLike: 10,
    countOfDislike: 2,
    countOfShare: 5,
    attachments: [],
    comments: [],
  },
  {
    id: 2,
    authorId: "user_002",
    question: "What is the capital of Japan?",
    answer: "The capital of Japan is Tokyo.",
    tags: ["Japan", "Tokyo"],
    createdAt: 1770345093,
    countOfLike: 15,
    countOfDislike: 3,
    countOfShare: 8,
    attachments: [],
    comments: [mockComments[2]],
  },
  {
    id: 3,
    authorId: "user_003",
    question: "What is the most popular sport in the world?",
    answer: "The most popular sport in the world is football.",
    tags: ["Sport", "Football"],
    createdAt: 1769364223,
    countOfLike: 20,
    countOfDislike: 4,
    countOfShare: 12,
    attachments: [],
    comments: [mockComments[1]],
  },
  {
    id: 4,
    authorId: "user_004",
    question: "What is the smallest animal in the world?",
    answer: "The smallest animal in the world is the tardigrade.",
    tags: ["Animal", "Smallest"],
    createdAt: 1750365022,
    countOfLike: 25,
    countOfDislike: 5,
    countOfShare: 15,
    attachments: [],
    comments: [],
  },
  {
    id: 5,
    authorId: "user_005",
    question: "Is AI a threat to humanity?",
    answer: "AI is a tool that can be used for good or evil.",
    tags: ["AI", "Threat"],
    createdAt: 1745664492,
    countOfLike: 30,
    countOfDislike: 6,
    countOfShare: 20,
    attachments: [],
    comments: [],
  },
  {
    id: 6,
    authorId: "user_006",
    question: "小規模營業稅如何計算？",
    answer: "# 查定課徵營業稅額 ＝ 國稅局查定每月銷售額 × 稅率 (通常為 1%)。\n\n- 執行建議：\n請確保發票上載明貴司統編，並確認屬於營業必要支出。若為餐飲業，需注意交際費限額問題。",
    tags: ["營業稅", "小規模"],
    createdAt: 1743827385,
    countOfLike: 35,
    countOfDislike: 7,
    countOfShare: 25,
    attachments: [mockAttachments[0], mockAttachments[1]],
    comments: [mockComments[0], mockComments[1]],
  },
  {
    id: 7,
    authorId: "user_007",
    question: "公司買車報支加油費，發票沒打統編可以扣抵嗎？",
    answer: "# 不可以。依據營業稅法，未載明統一編號之進項憑證不得扣抵銷項稅額。\n\n請確保發票上載明貴司統編，並確認屬於營業必要支出。若為餐飲業，需注意交際費限額問題。\n\n- 法條依據：\n 依據《加值型及非加值型營業稅法》第 33 條規定，營業人以進項稅額扣抵銷項稅額者，應具備載明其名稱、地址及統一編號之憑證。\n\n- 執行建議：\n請確保發票上載明貴司統編，並確認屬於營業必要支出。若為餐飲業，需注意交際費限額問題。",
    tags: ["扣抵稅額", "憑證"],
    createdAt: 1742382385,
    countOfLike: 40,
    countOfDislike: 8,
    countOfShare: 30,
    attachments: [mockAttachments[0], mockAttachments[1]],
    comments: [mockComments[0], mockComments[1], mockComments[2],mockComments[3]],
  },
];
