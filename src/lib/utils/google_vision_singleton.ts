// This file is for google vision api, for OCR service
// Usage const googleVisionClient = GoogleVisionClientSingleton.getInstance();
import { IBlockData } from '@/interfaces/google_vision';
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

  // Info Murky (20240422) This method return the array of description of the image, seperate by lines
  public static async generateDescription(imagePath: string): Promise<string[]> {
    const client = GoogleVisionClientSingleton.getInstance();
    const [result] = await client.textDetection(imagePath);
    const detections = result.textAnnotations || [];

    if (!detections.length) {
      return [];
    }

    return detections[0].description?.split('\n') || [];
  }

  public static async generateFullTextAnnotation(imagePath: string): Promise<IBlockData[]> {
    const client = GoogleVisionClientSingleton.getInstance();
    const [result] = await client.textDetection(imagePath);
    const { fullTextAnnotation } = result;

    const blockData: IBlockData[] = [];
    if (fullTextAnnotation?.pages?.length) {
      fullTextAnnotation?.pages?.forEach((page) => {
        page?.blocks?.forEach((block) => {
          // prettier-ignore
          const blockText = block.paragraphs
            ?.map((paragraph) => paragraph.words
                ?.map((word) => word.symbols?.map((symbol) => symbol.text).join(''))
                .join(''))
            .join('\n');

          // 获取区块的边界框
          const blockVertices = block.boundingBox?.vertices?.map((vertex) => ({
            x: vertex.x,
            y: vertex.y,
          }));

          blockData.push({ blockText, blockVertices });
        });
      });
    }

    return blockData;
  }
}
export default GoogleVisionClientSingleton;
