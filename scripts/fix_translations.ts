import fs from "fs";
import path from "path";
import { FaithService as GoogleGenerativeAI } from "../src/services/faith.service";
import { config } from "dotenv";

config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("No GEMINI_API_KEY found.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

const filesToFix = [
  "digital_product_passport.ts",
  "report_downloader.ts",
  "analysis.ts",
  "common.ts",
  "features.ts",
  "journal.ts",
];

const langs = [
  { dir: "ja", lang: "Japanese" },
  { dir: "ko", lang: "Korean" },
  { dir: "zh_cn", lang: "Simplified Chinese" },
];

async function fixFile(fileName: string, dir: string, lang: string) {
  const fullPath = path.join(process.cwd(), "src/i18n/locales", dir, fileName);
  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, "utf-8");
  // Info: (20260615 - Tzuhan) Simple heuristic: If it doesn't contain Chinese characters, and lang is not Chinese, we might still want to translate it if it contains English strings that shouldn't be there, but let's just send it.
  // Info: (20260615 - Tzuhan) Actually, to save API calls, we can just send everything and ask the AI to fix untranslated parts.

  const prompt = `
You are an elite software localization expert.
Below is the content of a TypeScript i18n file for a web application.
The target language for this file is: **${lang}**.
Your task:
1. Scan the file for any text values (especially those in Traditional Chinese or English) that should be translated into **${lang}** but currently aren't.
2. Translate those untranslated strings into highly natural and professional **${lang}**.
3. KEEP the existing correctly translated ${lang} strings intact.
4. KEEP all TypeScript syntax, object keys, and formatting completely intact.
5. ONLY output the raw valid TypeScript code. DO NOT wrap with markdown \`\`\` code blocks. DO NOT output any explanations.

File content:
\`\`\`typescript
${content}
\`\`\`
`;

  try {
    console.log(`Fixing ${dir}/${fileName}...`);
    const result = await model.generateContent(prompt);
    let translatedText = result.response.text();
    translatedText = translatedText
      .replace(/^```[a-z]*\n/im, "")
      .replace(/```$/m, "")
      .trim();
    if (translatedText.startsWith("export const")) {
      fs.writeFileSync(fullPath, translatedText + "\n", "utf-8");
      console.log(`✅ Fixed ${dir}/${fileName}`);
    } else {
      console.error(`❌ Failed to parse output for ${dir}/${fileName}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${dir}/${fileName}:`, error);
  }
}

async function main() {
  for (const l of langs) {
    for (const f of filesToFix) {
      await fixFile(f, l.dir, l.lang);
    }
  }
  console.log("All done!");
}

main().catch(console.error);
