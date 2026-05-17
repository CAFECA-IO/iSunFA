import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { promises as fs } from "fs";
import path from "path";
import { jsonOk, jsonFail } from "@/lib/utils/response";
export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "documents/business_and_product/salary_calculator_operating_mechanism/v1_0_0.md",
    );
    const content = await fs.readFile(filePath, "utf8");

    return jsonOk({ content });
  } catch (error) {
    console.error("Failed to read mechanism document:", error);
    return jsonFail(API_ERRORS.NF_DOCUMENT);
  }
}
