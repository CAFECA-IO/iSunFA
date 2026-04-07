import { GoogleGenerativeAI, Part } from "@google/generative-ai";

export class VisionService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey?: string) {
    // Info: (20260407 - Luphia) Default to environment variable if no key is provided
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    this.genAI = new GoogleGenerativeAI(key);
    this.modelName = process.env.MODEL || "gemini-1.5-flash";
  }

  /**
   * Info: (20260407 - Luphia) Converts a base64 encoded image into detailed Markdown text.
   * @param base64Image The image string (supports raw base64 or complete data-uri).
   * @param mimeType Defaults to "image/jpeg". 
   * @returns Generated Markdown text describing or extracting structured data from the image.
   */
  public async imageToMarkdown(base64Image: string, mimeType: string = "image/jpeg"): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });

      // Info: (20260407 - Luphia) Automatically strip the data-uri prefix (e.g. "data:image/png;base64,") if it exists
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

      // Info: (20260407 - Luphia) Prompt for image analysis
      const prompt = "Please analyze the content of this image and convert it strictly into structured Markdown format. Extract tables, lists, text structure, or important visual information accordingly.";

      const parts: Part[] = [
        { text: prompt },
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
      ];

      const result = await model.generateContent(parts);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error("[VisionService] Error converting image to markdown:", error);
      throw new Error("Failed to process vision data via Google Generative AI.");
    }
  }
}
