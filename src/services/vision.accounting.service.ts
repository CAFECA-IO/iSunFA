import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { CoaVectorService } from "@/services/rag/coa_vector.service";

// Info: (20260407 - Luphia) Stage 1. Journal Paradigm
export interface IJournalExtraction {
  documentType: string | "N/A" | null;
  documentNumber: string | "N/A" | null;
  tradingDate: string | "N/A" | null;
  vendorName: string | "N/A" | null;
  vendorTaxId: string | "N/A" | null;
  buyerName: string | "N/A" | null;
  buyerTaxId: string | "N/A" | null;
  netAmount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  currency: string | "N/A" | null;
  paymentMethod: string | "N/A" | null;
  text: string; // Info: (20260407 - Luphia) Raw recognized text
  confidence: number;
  aiNote: string | "N/A" | null;
}

// Info: (20260407 - Luphia) Stage 2. Voucher Paradigm
export interface IVoucherLineExtraction {
  accountingCode: string | "N/A" | null;
  particular: string | "N/A" | null;
  amount: number | null;
  isDebit: boolean | null;
}

export interface IVoucherExtraction {
  tradingType: "INCOME" | "OUTCOME" | "TRANSFER" | null;
  note: string | "N/A" | null;
  lines: IVoucherLineExtraction[];
  accountingNote: string | "N/A" | null;
  confidence: number;
}

// Info: (20260407 - Luphia) Stage 3. ESG Paradigm
export interface IEsgExtraction {
  esgScope: "SCOPE_1" | "SCOPE_2" | "SCOPE_3" | null;
  esgActivityType: string | "N/A" | null; // Info: (20260407 - Luphia) Selected from Emission Factors mapping
  esgVendor: string | "N/A" | null;
  esgAmount: string | "N/A" | null; // Info: (20260407 - Luphia) e.g. "500"
  esgUnit: string | "N/A" | null; // Info: (20260407 - Luphia) e.g. "Liter"
  // coefficient: string | "N/A" | null; // Info: (20260407 - Luphia) Specific scalar match from reference chart
  // coefficientSource: string | "N/A" | null; // Info: (20260407 - Luphia) Justifying the derivation
  esgNote: string | "N/A" | null;
  carbonNote: string | "N/A" | null;
  confidence: number;
}

export class VisionAccountingService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey?: string) {
    const key =
      apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    this.genAI = new GoogleGenerativeAI(key);
    this.modelName = process.env.MODEL || "gemini-1.5-flash";
  }

  // Info: (20260407 - Luphia) Utility
  private preparePayload(base64Image: string): string {
    return base64Image.replace(/^data:image\/\w+;base64,/, "");
  }

  private async generateJSON<T>(
    systemPrompt: string,
    base64Image: string,
    auxContext?: string,
  ): Promise<T> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const payload = this.preparePayload(base64Image);

    let combinedPrompt = systemPrompt;
    if (auxContext) {
      combinedPrompt += `\n\n[USER AUXILIARY BACKGROUND CONTEXT]:\n"${auxContext}"\n(Please integrate this background info into your reasoning).`;
    }

    const parts: Part[] = [
      { text: combinedPrompt },
      { inlineData: { data: payload, mimeType: "image/jpeg" } },
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1, // Info: (20260407 - Luphia) Highly rigid factual grounding
      },
    });

    const responseText = result.response.text().trim();
    return JSON.parse(responseText) as T;
  }

  // Info: (20260407 - Luphia) Phase 1. Pure Image Foundation Parsing
  public async analyzeJournal(
    base64Image: string,
    auxContext?: string,
  ): Promise<IJournalExtraction> {
    const prompt = `
      You are an expert Accountant parsing system. Analyze the provided image purely for objective physical data.
      You MUST return the output strictly as a JSON object without formatting prefixes like \`\`\`json.
      IMPORTANT: Do NOT invent values. If a field cannot be distinctly identified from the image, substitute strings with "N/A" and numbers with null.

      {
        "documentType": "String or N/A",
        "documentNumber": "String or N/A (Invoice/Receipt ID)",
        "tradingDate": "String or N/A (YYYY-MM-DD)",
        "vendorName": "String or N/A",
        "vendorTaxId": "String or N/A",
        "buyerName": "String or N/A",
        "buyerTaxId": "String or N/A",
        "netAmount": Number or null,
        "taxAmount": Number or null,
        "totalAmount": Number or null,
        "currency": "String or N/A (e.g. TWD)",
        "paymentMethod": "String or N/A",
        "text": "String (Extract all raw OCR text block found in image)",
        "confidence": Number (0-100 indicating visual clarity and OCR accuracy),
        "aiNote": "String or N/A (Note any blurriness or unclear text regions)"
      }
    `;

    try {
      return await this.generateJSON<IJournalExtraction>(
        prompt,
        base64Image,
        auxContext,
      );
    } catch (error) {
      console.error("[VisionAccountingService] Phase 1 Journal Error:", error);
      throw new Error("Failed to extract foundational Journal structure.");
    }
  }

  // Info: (20260407 - Luphia) Phase 2. Accounting (Accounting Code injection)
  public async analyzeVoucher(
    base64Image: string,
    journalResult: IJournalExtraction,
    auxContext?: string,
  ): Promise<IVoucherExtraction> {
    // Info: (20260521 - Tzuhan) Use CoaVectorService to fetch top 20 possible accounts to prevent context window explosion
    const availableAccounts = CoaVectorService.search(
      journalResult.text || "",
      "TW",
      20,
    )
      .map((acc) => "[" + acc.code + "] " + acc.name)
      .join(" | ");

    const prompt =
      "You are a Senior Auditor determining formal accounting entries (Vouchers).\n" +
      "Review the original image alongside the previously extracted foundational details.\n\n" +
      "[Extracted Foundation]:\n" +
      JSON.stringify(journalResult, null, 2) +
      "\n\n" +
      "[ACCOUNTING DICTIONARY REFERENCE (TAIWAN)]:\n" +
      "You MUST map every 'accountingCode' strictly matching codes from this explicit list:\n" +
      availableAccounts +
      "\n\n" +
      "Output strictly the following JSON structure:\n" +
      "{\n" +
      '  "tradingType": "INCOME" | "OUTCOME" | "TRANSFER" | null,\n' +
      '  "note": "String or N/A (Overall justification)",\n' +
      '  "lines": [\n' +
      "    {\n" +
      '      "accountingCode": "String (Must match exact code from dictionary, e.g. \'1101\') or N/A",\n' +
      '      "particular": "String or N/A (Line item description matching the image item)",\n' +
      '      "amount": Number or null,\n' +
      '      "isDebit": Boolean or null (true if debit/expense, false if credit/income)\n' +
      "    }\n" +
      "  ],\n" +
      '  "accountingNote": "String or N/A (Note any tax deduction irregularities, tax mapping problems)",\n' +
      '  "confidence": Number (1-100 evaluating your accounting classification confidence)\n' +
      "}";

    try {
      return await this.generateJSON<IVoucherExtraction>(
        prompt,
        base64Image,
        auxContext,
      );
    } catch (error) {
      console.error("[VisionAccountingService] Phase 2 Voucher Error:", error);
      throw new Error("Failed to process strict Voucher accounting lines.");
    }
  }

  // Info: (20260407 - Luphia) Phase 3. ESG Carbon Target Parsing
  public async analyzeEsg(
    base64Image: string,
    journalResult: IJournalExtraction,
    auxContext?: string,
  ): Promise<IEsgExtraction> {
    const prompt =
      "You are a Sustainability & Carbon Footprint Auditor. \n" +
      "Review the original image and foundational data to determine environmental tracking parameters.\n\n" +
      "Based strictly on the data and factors provided above, generate the following JSON payload:\n" +
      "{\n" +
      '  "esgScope": "SCOPE_1" | "SCOPE_2" | "SCOPE_3" | null,\n' +
      '  "esgActivityType": "String or N/A (Name of the category you matched in the database)",\n' +
      '  "esgVendor": "String or N/A",\n' +
      '  "esgAmount": "String or N/A (The physical consumption volume found in image, e.g. 500 liters or 20 KWH)",\n' +
      '  "esgUnit": "String or N/A",\n' +
      // '  "coefficient": "String or N/A (The exact coefficient numerical string extracted from the table match)",\n' +
      // '  "coefficientSource": "String or N/A (The official row/name source justification)",\n' +
      '  "esgNote": "String or N/A (General corporate sustainability alignment comments)",\n' +
      '  "carbonNote": "String or N/A (Any mathematical calculation limitations, missing conversions)",\n' +
      '  "confidence": Number (1-100 evaluating the precision of environmental mapping)\n' +
      "}";

    try {
      return await this.generateJSON<IEsgExtraction>(
        prompt,
        base64Image,
        auxContext,
      );
    } catch (error) {
      console.error("[VisionAccountingService] Phase 3 ESG Error:", error);
      throw new Error("Failed to process Environmental and Carbon factors.");
    }
  }
}
