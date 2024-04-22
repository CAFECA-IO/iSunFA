// This file is for google vision api, for OCR service
// Usage const googleVisionClient = GoogleVisionClientSingleton.getInstance();
import vision, { ImageAnnotatorClient } from '@google-cloud/vision';

class GoogleVisionClientSingleton {
  private static instance: ImageAnnotatorClient;

  // Info Murky (20240422) Private constructor to prevent direct construction calls
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public static getInstance(): ImageAnnotatorClient {
    if (!GoogleVisionClientSingleton.instance) {
      GoogleVisionClientSingleton.instance = new vision.ImageAnnotatorClient({
        projectId: process.env.GOOGLE_PROJECT_ID,
        credentials: JSON.parse(
          Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64 || '', 'base64').toString('ascii')
        ),
      });
    }
    return GoogleVisionClientSingleton.instance;
  }
}

export default GoogleVisionClientSingleton;
