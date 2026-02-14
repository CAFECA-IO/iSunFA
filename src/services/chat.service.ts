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

    // Info: (20260105 - Luphia) Tax Consultant
    if (tags.includes('tax')) {
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

    // Info: (20260105 - Luphia) Financial Analyst
    if (tags.includes('financial_report') || tags.includes('analysis')) {
      return `
        You are a senior financial analyst.
        ${basePrompt}
        Task:
        1. Analyze financial statements and key performance indicators.
        2. Provide insights on financial health, profitability, and liquidity.
        3. Create forecasts or trend analysis based on provided data.
        4. Suggest strategic financial improvements.
      `;
    }

    // Info: (20260105 - Luphia) Operational Accountant (Bookkeeping)
    if (tags.includes('bookkeeping') || tags.includes('adjustment') || tags.includes('salary') || tags.includes('cashier')) {
      return `
        You are a meticulous operational accountant.
        ${basePrompt}
        
        Task:
        1. **Analyze & Extract**: deeply analyze the user input or image. Extract key financial data (Date, Amount, Vendor, Tax ID, Description).
        2. **Repeated Identification**: Perform a self-check. Compare your extracted data against the source twice to ensure accuracy.
        3. **Confidence Scoring**: specific confidence score (0-100%) based on the clarity of the evidence and your certainty.
        
        Output Requirements:
        
        If Confidence Score < 80%:
        Display this warning at the top in RED style (use markdown or emoji):
        "⚠️ **Low Confidence Warning**: The system detected ambiguity or low clarity. Please manually review the data below."
        
        Regardless of score, provide these two tables in Markdown:
        
        ### 1. Accounting Certificate (會計憑證)
        | Date (日期) | Type (憑證種類) | ID/VAT No. (統編/稅號) | Description (摘要) | Amount (金額) |
        |---|---|---|---|---|
        | YYYY/MM/DD | e.g. Invoice/Receipt | 12345678 | ... | $... |
        
        ### 2. Accounting Voucher (會計傳票)
        | Date (日期) | Voucher No. (傳票編號) | Account Title (會計科目) | Debit (借方) | Credit (貸方) | Summary (摘要) |
        |---|---|---|---|---|---|
        | YYYY/MM/DD | Auto-Gen | ... | $... | | ... |
        | | | ... | | $... | ... |
        
        Finally, verify supporting documents and suggest any necessary adjustments.
      `;
    }

    // Info: (20260105 - Luphia) Commercial/Company Registration (Legacy/Other)
    if (tags.includes('commercial') || tags.includes('other')) {
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

    // Info: (20260105 - Luphia) Default IFRS Accountant
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

  async generateRaw(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  /**
   * Info: (20260213 - Julian) 向 AI 提問，並取得答案與關聯標籤
   */
  async askAccountTalk(
    message: string,
    images: { data: string; mimeType: string }[] = [],
  ): Promise<{ answer: string; tags: string[] }> {
    const prompt = `
      你是一位專業的會計師。請針對以下問題提供詳細、專業且親切的回答（使用台灣繁體中文）。
      同時，請根據問題內容建議 1-3 個相關的會計標籤（例如：稅法, 記帳, 財務報表, 創業, 勞健保, 營業稅, 所得稅）。

      使用者問題： "${message}"

      輸出要求：
      請僅輸出包含以下欄位的 JSON 格式，不要包含任何開場白或導言：
      {
        "answer": "你的回答內容（支援 Markdown 格式）",
        "tags": ["標籤1", "標籤2"]
      }

      請確保輸出是合法的 JSON 格式。
    `;

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const parts: Part[] = [{ text: prompt }];

      // Info: (20260213 - Julian) 加入多張圖片支援
      if (images && images.length > 0) {
        images.forEach((img) => {
          parts.push({
            inlineData: {
              data: img.data,
              mimeType: img.mimeType,
            },
          });
        });
      }

      const result = await model.generateContent(parts);
      const response = await result.response;
      const responseText = response.text();

      // Info: (20260213 - Julian) 尋找 JSON 區塊
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          answer: result.answer || responseText,
          tags: Array.isArray(result.tags) ? result.tags : ["其他"],
        };
      }
      return { answer: responseText, tags: ["其他"] };
    } catch (error) {
      console.error("[ChatService] Error in askAccountTalk:", error);
      return { answer: "AI 暫時無法回答，請稍後再試。", tags: ["錯誤"] };
    }
  }
}
