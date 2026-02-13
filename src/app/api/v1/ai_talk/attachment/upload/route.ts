import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';

// Info: (20260212 - Julian) 上傳發票圖片
export async function POST() {
  try {
    // Info: (20260211 - Antigravity) In real implementation, you would process the file here
    // For now, return a mock attachment
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
