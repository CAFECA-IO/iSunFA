import { GoogleGenerativeAI, Part } from '@google/generative-ai';

export class ChatService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.MODEL || 'gemini-1.5-flash';
  }

  private getPrompt(message: string, tags: string[] = []): string {
    const basePrompt = `
      User Input: "${message}"
      Selected Tags: ${tags.join(', ') || 'None'}
      
      Output Guidelines:
      - Reply in Traditional Chinese (Taiwan).
      - Maintain a professional yet accessible accountant persona.
    `;

    if (tags.includes('Tax') || tags.includes('Taxation')) {
      return `
        You are an expert tax consultant specializing in Taiwan tax laws and regulations.
        ${basePrompt}
        Task:
        1. Identify the documented evidence (e.g., Invoice, Receipt) if present.
        2. Analyze the specific tax implications (VAT, Corporate Income Tax, Withholding Tax).
        3. Explain relevant tax filing requirements or deadlines.
        4. Suggest appropriate accounting entries with tax codes.
      `;
    }

    if (tags.includes('Audit')) {
      return `
        You are a senior auditor specializing in IFRS and internal controls.
        ${basePrompt}
        Task:
        1. Evaluate the content for audit compliance and risk.
        2. Identify any missing documentation or authorization requirements.
        3. Suggest verification procedures or internal control measures.
        4. Recommend adjustments to align with auditing standards.
      `;
    }

    if (tags.includes('Company Registration') || tags.includes('Commercial')) {
      return `
        You are an expert in Taiwan Company Application and Commercial Law.
        ${basePrompt}
        Task:
        1. Advise on company registration procedures and requirements.
        2. Explain capital requirements and shareholding structures.
        3. Clarify rights and obligations under the Company Act.
        4. Outline the steps for business setup or modification.
      `;
    }

    // Default Accountant Prompt
    return `
      You are an expert accountant specializing in IFRS (International Financial Reporting Standards).
      ${basePrompt}
      Task:
      1. Identify the documented evidence (e.g., Invoice, Receipt, Contract).
      2. Analyze the content based on IFRS standards.
      3. Suggest appropriate accounting entries (Debit/Credit).
      4. If user asks a generic question, answer it as an accountant.
    `;
  }

  async generateResponse(message: string, tags: string[] = [], image?: string, mimeType?: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const prompt = this.getPrompt(message, tags);

    const parts: Part[] = [{ text: prompt }];

    if (image) {
      parts.push({
        inlineData: {
          data: image,
          mimeType: mimeType || 'image/jpeg',
        },
      });
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    return response.text();
  }
}
