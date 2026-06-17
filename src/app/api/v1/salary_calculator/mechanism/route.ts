import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { promises as fs } from "fs";
import path from "path";
import { jsonOk, jsonFail } from "@/lib/utils/response";
export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "documents/domain/salary_calculator_mechanism.md",
    );
    const content = await fs.readFile(filePath, "utf8");

    return jsonOk({ content });
  } catch (error) {
    console.error("Failed to read mechanism document:", error);
    return jsonFail(API_ERRORS.NF_DOCUMENT);
  }
}
