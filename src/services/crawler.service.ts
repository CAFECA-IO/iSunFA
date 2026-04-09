import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { SnapshotService } from "@/services/snapshot.service";

// Info: (20260407 - Luphia) Web Crawler Paradigm Interfaces
export interface IWebPageElement {
  type: "HEADING" | "PARAGRAPH" | "IMAGE" | "LINK" | "BUTTON" | "TABLE" | "OTHER";
  content: string;
  description?: string;
}

export interface ICrawlerJsonResult {
  url: string;
  title: string;
  summary: string;
  headerNavigation: IWebPageElement[];
  mainContent: IWebPageElement[];
  footer: IWebPageElement[];
  confidence: number;
}

export class CrawlerService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;
  private snapshotService: SnapshotService;

  constructor(apiKey?: string) {
    // Info: (20260407 - Luphia) Default to environment variable if no key is provided
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    this.genAI = new GoogleGenerativeAI(key);
    this.modelName = process.env.MODEL || "gemini-1.5-flash";
    this.snapshotService = new SnapshotService();
  }

  // Info: (20260407 - Luphia) Utility to clean Base64 prefixes
  private preparePayload(base64Image: string): string {
    return base64Image.replace(/^data:image\/\w+;base64,/, "");
  }

  // Info: (20260407 - Luphia) Generates a generic JSON representation from an image.
  private async generateJSON<T>(systemPrompt: string, base64Image: string): Promise<T> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const payload = this.preparePayload(base64Image);

    const parts: Part[] = [
      { text: systemPrompt },
      { inlineData: { data: payload, mimeType: "image/jpeg" } },
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2, // Info: (20260407 - Luphia) Provide slight creativity for summarizing
      }
    });

    const responseText = result.response.text().trim();
    return JSON.parse(responseText) as T;
  }

  /**
   * Info: (20260407 - Luphia) End-to-end Web Crawler capability.
   * Takes a URL, utilizes dockerized Puppeteer to snapshot the full layout,
   * completely parses the physical UI rendering via Gemini, and returns a JSON model.
   * @param url The target website URL
   * @returns Structured JSON extraction of the webpage segments
   */
  public async crawl(url: string): Promise<ICrawlerJsonResult> {
    console.log(`[CrawlerService] Capturing screenshot for ${url}...`);
    const base64Image = await this.snapshotService.snapshot(url);
    console.log(`[CrawlerService] Successfully captured screenshot (${base64Image.length} bytes). Translating to JSON...`);

    const prompt =
      "You are an advanced Web Crawler AI. Your objective is to look at the screenshot of this fully rendered web page\n" +
      "and convert its UI, content, and structure into a highly organized JSON data tree. \n" +
      "Analyze the visual layout to categorize navigational elements, main article/content hierarchies, and footers.\n\n" +
      "Target URL: " + url + "\n\n" +
      "You MUST output strictly in the following JSON format without any surrounding formatting or markdown blocks:\n" +
      "{\n" +
      "  \"url\": \"String (Same as Target URL)\",\n" +
      "  \"title\": \"String (Infer the main site brand/title from the header or huge text)\",\n" +
      "  \"summary\": \"String (A brief 2-3 sentence summary of what this page is about)\",\n" +
      "  \"headerNavigation\": [\n" +
      "    { \"type\": \"LINK\" | \"BUTTON\" | \"IMAGE\" | \"OTHER\", \"content\": \"String (extracted text/link name)\", \"description\": \"String (Optional purpose, e.g. 'Search Bar' or 'Logo')\" }\n" +
      "  ],\n" +
      "  \"mainContent\": [\n" +
      "    { \"type\": \"HEADING\" | \"PARAGRAPH\" | \"IMAGE\" | \"TABLE\" | \"LINK\" | \"BUTTON\" | \"OTHER\", \"content\": \"String\", \"description\": \"String (Provide image descriptions or tabular summaries)\" }\n" +
      "  ],\n" +
      "  \"footer\": [\n" +
      "    { \"type\": \"LINK\" | \"PARAGRAPH\" | \"OTHER\", \"content\": \"String\", \"description\": \"String\" }\n" +
      "  ],\n" +
      "  \"confidence\": Number (1-100 indicating clarity of physical layout)\n" +
      "}";

    try {
      const parsedJson = await this.generateJSON<ICrawlerJsonResult>(prompt, base64Image);
      return parsedJson;
    } catch (error) {
      console.error("[CrawlerService] Error parsing web UI to JSON:", error);
      throw new Error(`Failed to crawl and extract JSON from ${url}`);
    }
  }
}
