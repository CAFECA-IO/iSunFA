export const carbonChatbot = {
  title: "Carbon Chatbot",
  menu_title: "Smart GHG Inventory",
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
  book_reports_title: "Account book reports (shared)",
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
  revision_failed: "[Revision failed] Could not generate a revision; please retry later.",
  import_button: "Import report",
  import_title: "Import report: {{name}}",
  import_overwrite_warning: "Will overwrite existing content",
  import_unmapped:
    "Content not matching the outline ({{count}} blocks; not imported, handle in chat)",
  import_reset_note:
    "Verification resets for imported paragraphs; {{activities}} activity records will be re-reconciled",
  import_apply: "Import selected ({{count}})",
  import_parsing: "Parsing 「{{name}}」; a per-paragraph preview will follow…",
  import_parsing_chapter:
    "Parsing 「{{name}}」 chapter by chapter ({{current}}/{{total}} done, in parallel); a full report takes a few minutes…",
  import_failed_chapters:
    "These chapters failed to parse and can be re-imported later: {{chapters}}",
  import_retry_failed: "Retry failed chapters",
  import_empty: "[Import failed] Nothing in the file maps to the outline.",
  import_failed: "[Import failed] Could not parse the report; please retry later.",
  attachments_processing:
    "Processing attachments (extracting facts and drafting); large files may take a minute or two…",
  import_suggest:
    "「{{name}}」 looks like a full report. Import it as the report baseline, or send it as supporting evidence?",
  import_suggest_import: "Import report",
  import_suggest_attach: "Send as attachment",
  section_placeholder:
    "This section has not been generated yet. Tell the Carbon Accountant in the chat that you want to work on it, and the content will appear here in real time.",
  report_status_draft:
    "Report status: Draft (content is generated section by section by AI and must pass human review before finalization)",
  report_button: "Report",
  close_report: "Close report",
  close_chat: "Close chat window",
  progress_collapse: "Collapse progress widget",
  activity_ledger_title: "Activity Data Ledger",
  activity_ledger_pill: "{{count}} activity records",
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
  data_table_refreshed:
    "Data tables were refreshed from the activity ledger — please re-verify the affected sections",
  data_badge_reconciled:
    "Data section: reconciled ✓ (figures produced by the deterministic engine)",
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
  inventory_step_ORG_PROFILE: "Step: Organization profile (name/year)",
  inventory_step_ORG_BOUNDARY: "Step: Organizational boundary",
  inventory_step_EMISSION_SOURCES: "Step: Emission source identification",
  inventory_step_ACTIVITY_DATA: "Step: Activity data collection",
  inventory_step_EMISSION_FACTORS: "Step: Emission factor mapping",
  inventory_step_REVIEW: "Step: Reconciliation & review",
  inventory_step_COMPLETED: "Inventory data collection completed",
};
