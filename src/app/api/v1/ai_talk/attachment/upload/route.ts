// import { NextRequest } from 'next/server';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
// import { IAttachment } from '@/interfaces/ai_talk';

/**
 * 上傳發票圖片
 */
export async function POST(/* request: NextRequest */) {
  try {
    // const body = await request.json();
    // const { image, mimeType } = body;
    
    return jsonOk({
        message: 'Attachment uploaded successfully',
    });
  } 
  catch (error) {
    console.error('[API] /attachment/upload error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}