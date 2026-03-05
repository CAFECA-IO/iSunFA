import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { ChatService } from "@/services/chat.service";
import { Prisma } from "@/generated/browser";

/**
 * Info: (20260304 - Julian) 將檔案傳給 AI 進行解析
 * POST /api/v1/journal
 */

export async function POST(request: NextRequest) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const body = await request.json();
    const { file } = body;

    // Info: (20260304 - Julian) 驗證 file 參數
    if (!file || !file.hash) {
      console.error("Missing file or file hash");
      return jsonFail(ApiCode.VALIDATION_ERROR, "File is required");
    }

    const author = await prisma.user.findUnique({
      where: { address: sessionUser.address },
    });

    if (!author) {
      console.error("Author not found");
      return jsonFail(ApiCode.NOT_FOUND, "Author not found");
    }

    // Info: (20260304 - Julian) 使用 AI 生成日記帳
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY");
      return jsonFail(
        ApiCode.INTERNAL_SERVER_ERROR,
        "Server configuration error",
      );
    }

    const chatService = new ChatService(apiKey);

    // Info: (20260304 - Julian) 整理圖片資料發給 AI
    const imagesForAi = file.base64 && file.mimeType ? [{
      data: file.base64,
      mimeType: file.mimeType,
    }] : [];

    const { text } = await chatService.analyzeJournal(imagesForAi);

    // Info: (20260304 - Julian) 建立上傳檔案 DB 紀錄
    const dbFile = await prisma.file.create({
      data: {
        hash: file.hash,
        fileName: file.fileName,
      },
    });

    // Info: (20260304 - Julian) 建立憑證(日記帳)紀錄
    const journal = await prisma.journal.create({
      data: {
        fileId: dbFile.id,
        userId: author.id,
        text: text,
      },
    });

    return jsonOk({ journalId: journal.id, text });
  } catch (error) {
    console.error("Upload failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Upload failed");
  }
}

/**
 * Info: (20260304 - Julian) 取得全部或指定日記帳列表
 * GET /api/v1/journal
 */
export async function GET(request: NextRequest) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const author = await prisma.user.findUnique({
      where: { address: sessionUser.address },
    });

    if (!author) {
      console.error("Author not found");
      return jsonFail(ApiCode.NOT_FOUND, "Author not found");
    }

    const searchParams = request.nextUrl.searchParams;
    const keyWord = searchParams.get("keyWord");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : undefined;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!) : undefined;
    const orderByParams = searchParams.get("orderBy");

    const filteredConditions: Prisma.JournalFindManyArgs = {
      where: { userId: author.id },
      include: { file: true },
    };

    // Info: (20260304 - Julian) 關鍵字篩選
    if (keyWord) {
      filteredConditions.where!.text = { contains: keyWord };
    }

    // Info: (20260304 - Julian) 建立時間區間篩選
    if (startDate || endDate) {
      filteredConditions.where!.createdAt = {};
      if (startDate) {
        filteredConditions.where!.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        filteredConditions.where!.createdAt.lte = new Date(endDate);
      }
    }

    // Info: (20260304 - Julian) 分頁
    if (page && pageSize) {
      filteredConditions.skip = (page - 1) * pageSize;
      filteredConditions.take = pageSize;
    }

    // Info: (20260304 - Julian) 排序
    if (orderByParams) {
      try {
        filteredConditions.orderBy = JSON.parse(orderByParams);
      } catch {
         console.warn("Invalid orderBy param format, ignoring");
      }
    }

    // Info: (20260304 - Julian) 取得日記帳列表
    const journals = await prisma.journal.findMany(filteredConditions);

    return jsonOk({ journals });
  } catch (error) {
    console.error("Get journals failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Get journals failed");
  }
}