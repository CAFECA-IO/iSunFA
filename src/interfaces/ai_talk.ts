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
  attachments: string[] | null;
}

export const mockThreads: IThread[] = [
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
    attachments: ["憑證_01.jpg"],
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
    attachments: ["憑證_02.jpg"],
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
    attachments: null,
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
    attachments: null,
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
    attachments: null,
  },
  {
    id: 6,
    authorId: "user_006",
    question: "小規模營業稅如何計算？",
    answer: "查定課徵營業稅額 ＝ 國稅局查定每月銷售額 × 稅率 (通常為 1%)。",
    tags: ["營業稅", "小規模"],
    createdAt: 1743827385,
    countOfLike: 35,
    countOfDislike: 7,
    countOfShare: 25,
    attachments: ["憑證_03.jpg", "憑證_04.jpg", "憑證_05.jpg"],
  },
  {
    id: 7,  
    authorId: "user_007",
    question: "公司買車報支加油費，發票沒打統編可以扣抵嗎？",
    answer: "不可以。依據營業稅法，未載明統一編號之進項憑證不得扣抵銷項稅額。",
    tags: ["扣抵稅額", "憑證"],
    createdAt: 1742382385,
    countOfLike: 40,
    countOfDislike: 8,
    countOfShare: 30,
    attachments: ["憑證_06.jpg", "憑證_07.jpg"],
  },
];

export interface IComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: number;
  likes: number;
  dislikes: number;
  isProfessional: boolean;
  isVerified: boolean;
}

export const mockComments: IComment[] = [
  {
    id: "1",
    authorId: "user_001",
    content: "AI 的解析基本正確，但要補充一點：如果是餐飲業，還需注意「交際費」在年度申報時的限額問題。建議建立獨立的餐飲支出清單，方便月底核銷。",
    createdAt: 1770365492,
    likes: 10,
    dislikes: 2,
    isProfessional: true,
    isVerified: true,
  },
  {
    id: "2",
    authorId: "user_002",
    content: "AI 解析有誤，請注意。",
    createdAt: 1770345093,
    likes: 15,
    dislikes: 3,
    isProfessional: false,
    isVerified: false,
  },
];
