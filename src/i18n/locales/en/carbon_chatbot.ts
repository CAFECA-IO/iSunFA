export const carbonChatbot = {
  title: "Carbon Chatbot",
  menu_title: "Smart GHG Inventory",
  // Info: (20260730 - Tzuhan) 未解鎖時的報告區文案:不可讓大綱骨架看起來像已載入的空報告
  report_locked_hint:
    "This report is end-to-end encrypted with your device key. Verify once to unlock and load it.",
  unlock_button: "Start encrypted chat",
  unlock_hint:
    "To protect your inventory data, this chat is end-to-end encrypted with your device's secure key. Click start and complete one verification to unlock and receive the AI greeting.",
  device_unsupported:
    "Your device or browser does not support the secure key feature (WebAuthn PRF) required for encryption, so encrypted chat is unavailable. Please use a supported environment, such as Chrome on Android or a PRF-capable security key.",
  subtitle: "Your personal Enterprise Carbon Accountant",
  recent_chats: "Recent Chats",
  today: "Today",
  history: "History",
  new_chat: "New Chat",
  new_chat_personal: "Personal chat (end-to-end encrypted)",
  rename_session: "Rename chat",
  rename_document: "Rename report file",
  read_only: "Read-only (account book viewer)",
  // Info: (20260730 - Tzuhan) 語意去重:自己的帳本會話已列於上方歷史對話(帶帳本 chip),此區塊僅為其他成員的報告入口
  book_reports_title: "Reports by teammates",
  book_no_sessions: "No carbon reports in this account book yet",
  book_session_own: "My inventory chat ({{date}})",
  book_session_member: "Member report ({{date}})",
  book_report_viewer_title: "Account book carbon report",
  book_report_editable: "Editable (book editor role)",
  book_report_empty: "This session has no report content yet.",
  book_chat_hidden_note:
    "Chat history is personally end-to-end encrypted; only the report is shared with book members",
  ai_thinking: "AI is thinking...",
  input_placeholder: "Type your question or response...",
  report_progress: "Report Progress",
  report_preview_title: "GHG Inventory Report Preview",
  report_empty_title: "Report not generated yet",
  report_empty_desc:
    "Please complete the inventory process with the Carbon Accountant in the chat. The system will automatically generate a complete carbon inventory list and report for you.",
  iso_inventory: "ISO 14064-1 Inventory",
  emission_sources: "Emission Sources Identification",
  data_activity: "Data Activity Records",
  emission_factors: "Emission Factors Mapping",
  uncertainty: "Uncertainty Assessment",
  ghg_protocol: "GHG Protocol Report",
  scope_analysis: "Scope 1, 2, 3 Analysis",
  reduction_pathway: "Reduction Pathway Simulation",
  // Info: (20260730 - Tzuhan) Shown when the gateway drops the connection (504) while the job is still running
  still_processing:
    "This is taking a while and the connection dropped, but the work is still running — completed sections will appear automatically.",
  // Info: (20260730 - Tzuhan) 段落來源標示:AI 草稿不得冒充逐字照抄原文(審計文件底線)
  realtime_connecting:
    "Reconnecting to the live channel — replies may be delayed",
  realtime_disconnected:
    "Live channel disconnected. Results of long-running work may not reach you. Please reload the page.",
  imported_from_short: "Imported from",
  imported_from_title: "Imported from {{name}} on {{date}}",
  origin_imported: "Verbatim",
  origin_ai_draft: "AI draft",
  origin_imported_short: "source",
  origin_ai_draft_short: "draft",
  // Info: (20260730 - Tzuhan) 兩階段匯入的第一階段提示:一次索引換來後續 11 章不必各自重送整份文件
  import_indexing:
    "Indexing {{name}} — locating each section's page so the parsing that follows stays small…",
  // Info: (20260730 - Tzuhan) 結構圖:節點文字必須能在該段原文找到才會繪製,故文案明示來源
  diagram_generate: "Generate diagram (nodes taken from this section's text)",
  // Info: (20260730 - Tzuhan) 封存為軟刪:文案明示資料保留可還原,避免使用者誤以為永久刪除
  archive_session: "Archive this conversation (data kept, restorable)",
  archive_confirm: "Click again to confirm",
  // Info: (20260730 - Tzuhan) 已封存區塊:空清單也需文案,否則分不清「沒有封存」與「載入失敗」
  archived_sessions: "Archived",
  archived_loading: "Loading…",
  archived_empty: "No archived conversations",
  archived_at: "Archived on {{date}}",
  restore_session: "Restore this conversation",
  system_error:
    "[System Error] Sorry, there was a problem connecting to the Carbon Accountant service. Please try again later.",
  system_unavailable: "Sorry, the system is currently unavailable to respond.",
  ai_quota_exceeded:
    "[AI quota reached] Too many requests in a short time; please wait a minute and try again.",
  ai_timeout: "[AI timeout] The request took too long; please try again.",
  rate_limited:
    "[Rate limited] You have hit the usage limit; please wait a moment and retry.",
  ai_name: "FAITH",
  platform_name: "ENVIRONMENTAL INTELLIGENCE PLATFORM",
  system_online: "SYSTEM ONLINE",
  database_version: "Database Version",
  send_message: "Send message",
  no_report_data: "No report data available yet",
  paragraph_tracker_title: "Paragraph Status Tracker",
  status_completed: "Completed",
  status_incomplete: "Incomplete",
  status_verified: "Verified",
  status_unverified: "Unverified",
  outline_title: "Report Outline",
  outline_button: "Outline",
  completed_short: "Done",
  verified_short: "Verified",
  verified_progress: "Human Review Progress",
  jump_aria_label: "Jump to this section",
  close_outline: "Close outline",
  data_driven_badge:
    "Data section: figures are reconciled by the deterministic engine, not AI-generated",
  jump_prompt: "Please help me complete the section 「{{section}}」.",
  new_session_title: "New inventory chat",
  save_saving: "Saving...",
  save_saved: "Saved",
  save_local:
    "Saved locally; will sync to the cloud after you unlock the encrypted chat",
  save_local_hint: "Report draft is encrypted and saved to the cloud",
  save_failed: "Save failed",
  save_failed_hint:
    "Save failed: another tab may have updated the draft; reload to get the latest version",
  attach_file: "Attach file",
  remove_attachment: "Remove attachment",
  attachment_invalid_type:
    "Unsupported file type: {{name}} (only PNG, JPG, PDF, CSV, XLSX are accepted)",
  attachment_too_large: "File too large: {{name}} (max {{max}} per file)",
  attachment_limit: "Up to {{max}} attachments per message",
  attachment_upload_failed:
    "Attachment upload failed: {{name}}; remove it and try again",
  attachment_type_mismatch:
    "File content does not match its extension: {{name}} (rejected as disguised file)",
  attachment_infected: "Malicious content detected: {{name}} (rejected)",
  storage_quota_exceeded:
    "Storage is full (5GB limit); please remove old attachments and retry",
  draft_generate: "Draft this section with AI",
  draft_generating: "Generating draft...",
  draft_generating_section:
    "Drafting 「{{section}}」 — it will be written to the report when ready…",
  draft_failed:
    "[Draft failed] Something went wrong while drafting 「{{section}}」. Please try again later.",
  revision_title: "Revision suggestion: {{section}}",
  revision_original: "Original",
  revision_revised: "Revised",
  revision_cited_facts: "Cited facts",
  revision_apply: "Apply revision",
  revision_discard: "Discard",
  revision_generating: "Generating revision for 「{{section}}」…",
  revision_failed:
    "[Revision failed] Could not generate a revision; please retry later.",
  import_button: "Import report",
  import_title: "Import report: {{name}}",
  import_overwrite_warning: "Will overwrite existing content",
  import_drafting_sections:
    'Drafting missing sections for "{{name}}" (batch {{current}}/{{total}}, grounded in the uploaded file)…',
  import_generating_diagrams:
    "Generating structural diagrams ({{current}}/{{total}})… the report is already usable; diagrams will appear as they finish.",
  import_wrong_session:
    'This import belongs to "{{name}}". Switch back to that conversation to apply it.',
  import_draft_badge: "AI Draft",
  import_unmapped:
    "Content not matching the outline ({{count}} blocks; not imported, handle in chat)",
  import_reset_note:
    "Verification resets for imported paragraphs; {{activities}} activity records will be re-reconciled",
  import_apply: "Import selected ({{count}})",
  import_parsing: "Parsing 「{{name}}」; a per-paragraph preview will follow…",
  import_already_running:
    "\u300c{{name}}\u300d is still being parsed. Running two imports at once makes both slower by competing for the same quota \u2014 please wait for this one to finish, or reload and try again.",
  import_parsing_chapter:
    "Parsing \u300c{{name}}\u300d chapter by chapter ({{current}}/{{total}} done, {{inFlight}} in progress); a full report takes a few minutes\u2026",
  import_failed_chapters:
    "These chapters failed to parse and can be re-imported later: {{chapters}}",
  import_retry_failed: "Retry failed chapters",
  import_retrying: "Retrying…",
  import_retrying_hint:
    "Re-parsing the failed chapters. This takes a few minutes — please keep this card open.",
  import_empty: "[Import failed] Nothing in the file maps to the outline.",
  import_failed:
    "[Import failed] Could not parse the report; please retry later.",
  attachments_processing:
    "Processing attachments (extracting facts and drafting); large files may take a minute or two…",
  import_suggest:
    "「{{name}}」 looks like a full report. Import it as the report baseline, or send it as supporting evidence?",
  import_suggest_import: "Import report",
  import_suggest_attach: "Send as attachment",
  // Info: (20260730 - Tzuhan) 連續未生成的節收成一列摘要;逐節整句佔位在 33 節全空時等於噪音
  sections_pending_summary:
    "{{count}} section(s) above are not written yet. Tell the carbon accountant in chat which one to write and it will appear in place.",
  section_placeholder:
    "This section has not been generated yet. Tell the Carbon Accountant in the chat that you want to work on it, and the content will appear here in real time.",
  report_status_draft:
    "Report status: Draft (content is generated section by section by AI and must pass human review before finalization)",
  report_button: "Report",
  close_report: "Close report",
  // Info: (20260730 - Tzuhan) 聊天面板放大/縮小(浮層 ↔ 右側 dock);行動版兩態皆全螢幕故不顯示
  panel_maximize: "Expand to side panel",
  panel_restore: "Shrink to floating window",
  close_chat: "Close chat window",
  progress_collapse: "Collapse progress widget",
  activity_ledger_title: "Activity Data Ledger",
  activity_ledger_pill: "{{count}} activity records",
  activity_ledger_pill_imported: " · imported {{count}}",
  activity_ledger_imported_note:
    "Imported emissions are already in the ledger: {{count}} rows totalling {{tonne}} tCO2e. The source report gives emissions only — no activity data or factors — so they are not listed below.",
  activity_ledger_empty_after_import:
    "No activity data yet. The imported report provides emissions only; to get per-row activity data and factors, provide them in the chat or import voucher data from the account book.",
  activity_ledger_empty:
    "No activity data yet. Provide figures like electricity or fuel usage in the chat, or upload bills, and they will be recorded here automatically.",
  activity_ledger_collapse: "Collapse activity ledger",
  activity_source: "Source: {{source}}",
  activity_source_chat: "Source: conversation",
  activity_co2e: "CO2e: {{value}} kg",
  activity_pending_factor:
    "⚠ Pending: no reliable factor or unit mismatch; no estimate will be fabricated",
  activity_total_co2e: "Total emissions (reconciled)",
  articulation_passed: "Mass conservation check passed",
  articulation_violation: "Mass conservation violated: {{material}}",
  articulation_equation:
    "Opening + purchased - closing = {{expected}} {{unit}}, recorded consumption = {{actual}} {{unit}}, gap = {{gap}} {{unit}}",
  articulation_plausibility_warning:
    "Quantity exceeds a plausible range, please verify: {{source}}",
  report_table_detail_heading: "Emission source details",
  report_table_col_source: "Source",
  report_table_col_scope: "Scope",
  report_table_col_quantity: "Activity data",
  report_table_col_factor: "Emission factor (source)",
  report_table_col_co2e: "Emissions (kgCO2e)",
  report_table_subtotal_heading: "Scope subtotals",
  report_table_total: "Total emissions",
  report_table_insufficient:
    "(Insufficient data — the table will be generated automatically once activity data is complete)",
  report_table_frozen:
    "⚠ Mass conservation check failed; the data table is frozen. Clarify the inventory gap in the chat and the table will be generated automatically.",
  report_table_pending_note:
    "Note: {count} activity record(s) still await emission factors and are excluded from this table.",
  report_table_col_provenance: "Source",
  report_table_provenance_computed: "Computed",
  report_table_provenance_imported: "Transcribed",
  report_table_not_provided: "Not given in source",
  report_table_imported_note:
    "Note: rows marked \u201cTranscribed\u201d carry CO2e figures taken verbatim from the source report. This system applied no activity data and no emission factor, hence those two columns read \u201cNot given in source\u201d. The figures have been reconciled against the source totals (see the reconciliation note in this section).",
  data_table_refreshed:
    "Data tables were refreshed from the activity ledger — please re-verify the affected sections",
  data_badge_reconciled:
    "Data section: reconciled ✓ (figures produced by the deterministic engine)",
  data_badge_imported:
    "Data section: contains transcribed figures (reconciled against source totals; provenance marked per row)",
  data_badge_violated:
    "Data section: mass conservation violated ⚠ (table frozen pending clarification)",
  data_badge_insufficient:
    "Data section: insufficient data (generated automatically once activity data is complete)",
  chart_scope_pie_title: "Emissions share by scope (kgCO2e)",
  chart_scope_bar_title: "Emissions by scope (kgCO2e)",
  chart_insufficient:
    "(Insufficient data — the chart will be generated automatically once activity data is complete)",
  chart_frozen:
    "⚠ Mass conservation check failed; the chart is frozen. Clarify the inventory gap in the chat and it will be generated automatically.",
  chart_sankey_chat_node: "Declared in chat/attachments",
  chart_sankey_period_unknown: "No period recorded",
  chart_sankey_period_collapsed:
    "The period spans more than two years; the monthly layer is omitted (see the trend chart for months)",
  chart_imported_sankey_title:
    "GHG emission flow: organization → site → scope → category → emission form (verbatim from the report, location-based, tCO2e/yr)",
  chart_imported_sankey_excluded: "Not shown (NA/NS or zero)",
  chart_imported_sankey_no_ledger:
    'The report was imported but the ledger holds no usable data, so the emission flow cannot be drawn. Table 3.8 (GHG emissions by company) is the only source for the Sankey diagram and the system data table, and it was not obtained this time. Check whether Chapter 3 parsed successfully; if it is listed as failed, re-import it via "Retry failed chapters" on the preview card, and check the server log for whether the table was dropped and why.',
  chart_imported_sankey_collapsed:
    "Too many nodes; collapsed to two layers (site → scope)",
  chart_imported_top_items_title:
    "Where emissions go: company → top nine emission items plus Other (verbatim from the report, location-based, tCO2e/yr)",
  chart_imported_sankey_other: "Other",
  chart_imported_sankey_ghg_mapping:
    "Sub-code to GHG Protocol category mapping",
  chart_imported_sankey_below_threshold: "Too small to plot (tCO2e/yr)",
  chart_imported_sankey_organization: "Whole company",
  book_bind_pending_unlock:
    "Book session created. Unlock the encrypted chat to complete the binding (voucher import and the evidence chain require it)",
  book_bind_done:
    "Account book bound — you can now import voucher data from the activity ledger",
  book_bind_denied:
    "Binding failed: an Editor role or above is required on this account book",
  book_bind_failed: "Failed to bind the account book; please retry",
  book_records_import_button: "Import voucher data from the book",
  book_records_importing:
    "Importing recognized voucher-level emission records from the account book…",
  book_records_imported:
    "Imported {{count}} voucher-level activity record(s) from the book (duplicates skipped automatically)",
  book_records_imported_with_skips:
    "Imported {{count}} record(s); {{skipped}} skipped because the GHG scope could not be determined — set the scope or activity type on the ESG page",
  book_records_import_failed:
    "Import from the account book failed; please retry",
  activity_open_evidence: "View voucher ↗",
  evidence_chain_title:
    "Emission evidence chain (click to expand layer by layer, down to a single voucher)",
  evidence_chain_loading: "Loading voucher data from the account book…",
  evidence_chain_empty:
    "No recognized emission records in this account book yet",
  evidence_chain_error:
    "Failed to load voucher data (check your account book viewing permission)",
  evidence_chain_records: "{{count}} voucher record(s)",
  evidence_chain_formula:
    "{{quantity}} {{unit}} × {{factor}} = {{co2e}} kgCO2e",
  evidence_chain_total: "Total emissions",
  evidence_chain_verified: "Verified",
  evidence_chain_unverified: "Unverified",
  inventory_step_ORG_PROFILE: "Step: Organization profile (name/year)",
  inventory_step_ORG_BOUNDARY: "Step: Organizational boundary",
  inventory_step_EMISSION_SOURCES: "Step: Emission source identification",
  inventory_step_ACTIVITY_DATA: "Step: Activity data collection",
  inventory_step_EMISSION_FACTORS: "Step: Emission factor mapping",
  inventory_step_REVIEW: "Step: Reconciliation & review",
  inventory_step_COMPLETED: "Inventory data collection completed",
};
