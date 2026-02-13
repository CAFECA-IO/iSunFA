import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';

// Info: (20260212 - Julian) 上傳發票圖片
export async function POST() {
  try {
    /**
     * ToDo: (20260211 - Julian) 檔案處理流程
     * 使用 laria.ts 將檔案分隔保存至 IPFS
     * 保留 metadata fid(hash) 值
     * 目前回傳模擬附件資料，待後續實作
     */
    const mockAttachment = {
      id: Math.random().toString(36).substring(7),
      fileName: 'uploaded_file.png',
      url: '/test/電子紙本發票2.png',
      fileSize: 1024 * 1024,
      mimeType: 'image/png',
      thumbnailUrl: '/test/電子紙本發票2.png',
    };
    
    return jsonOk(mockAttachment, 'Attachment uploaded successfully');
  } 
  catch (error) {
    console.error('[API] /attachment/upload error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}
