export function translateAiNote(
  note: string | null | undefined,
  t: (key: string) => string,
): string {
  if (!note) return "";

  let translated = note;

  // Replace strictly formatted keys [[I18N_...]]
  translated = translated.replace(/\[\[I18N_(.*?)\]\]/g, (match, key) => {
    switch (key) {
      case "BASE_INFO_ANALYSIS":
        return t("ai_notes.base_info");
      case "ENTRY_ANALYSIS":
        return t("ai_notes.entry");
      case "AI_NOTE_EMPTY":
        return t("ai_notes.empty");
      case "AI_DYNAMIC_EXTRACTION":
        return t("ai_notes.ai_dynamic_extraction");
      case "ESG_SUSPENSE_WARNING":
        return t("ai_notes.esg_suspense_warning");
      default:
        return match;
    }
  });

  // Backward compatibility for old Chinese hardcoded strings
  translated = translated.replace("無 AI 分析備註", t("ai_notes.empty"));
  translated = translated.replace(
    "- 基本資訊分析：",
    "- " + t("ai_notes.base_info") + "：",
  );
  translated = translated.replace(
    "- 會計科目分錄分析：",
    "- " + t("ai_notes.entry") + "：",
  );
  translated = translated.replace(
    "🚨 懸記：缺少碳排係數主檔，已凍結計算。",
    t("ai_notes.esg_suspense_warning"),
  );
  translated = translated.replace(
    "AI 動態擷取",
    t("ai_notes.ai_dynamic_extraction"),
  );

  return translated;
}
