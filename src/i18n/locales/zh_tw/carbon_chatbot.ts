export const carbonChatbot = {
  title: "碳盤查機器人",
  menu_title: "智能溫盤",
  // Info: (20260730 - Tzuhan) 未解鎖時的報告區文案:不可讓大綱骨架看起來像已載入的空報告
  report_locked_hint:
    "報告內容以裝置金鑰端對端加密。完成一次驗證即可解鎖並載入這份報告。",
  report_locked_hint_custodial:
    "報告內容加密後儲存。您以第三方帳號登入，加密金鑰由平台代管，完成一次驗證即可解鎖並載入這份報告。",
  unlock_button: "開始加密對話",
  unlock_hint:
    "為保護您的盤查內容，本對話將以裝置的安全金鑰進行端對端加密。點擊開始並完成一次驗證即可解鎖並取得 AI 招呼。",
  /**
   * Info: (20260812 - Luphia) 託管帳號（第三方登入）專用的解鎖說明。
   * 不能沿用上面那句 —— 那些帳號的金鑰由伺服器派生，說「以裝置的安全金鑰」既不準確，
   * 也隱含了一個它們沒有的保證。差異必須在使用者按下解鎖之前就講清楚。
   */
  unlock_hint_custodial:
    "為保護您的盤查內容，本對話將加密後儲存。您以第三方帳號登入，加密金鑰由平台代管（與您的錢包相同），因此平台在技術上具備解密能力；若需要「僅您本人可解密」的保護等級，請改用 passkey 帳號。點擊開始即可解鎖並取得 AI 招呼。",
  /**
   * Info: (20260812 - Luphia) custody 尚未載入時的中性說明（PR review P-2）。
   * 這個時刻不知道該給哪一種保證，所以一種都不給 —— 給錯的那一種比不給更糟。
   */
  custody_loading: "正在確認您的帳號金鑰保管方式，稍候即可開始加密對話。",
  // Info: (20260812 - Luphia) 這一列由另一種金鑰包裝，解不開不是「失敗」而是「需要移轉」
  key_source_mismatch:
    "這份對話是以另一種金鑰保管方式加密的（例如您在綁定 passkey 之前建立的內容），因此無法用目前的金鑰解開。請聯繫維運協助完成金鑰移轉 —— 重試不會有幫助。",
  device_unsupported:
    "您的裝置或瀏覽器不支援加密所需的安全金鑰功能（WebAuthn PRF），暫時無法使用加密對話。建議改用支援的環境，例如 Android 上的 Chrome，或支援 PRF 的實體安全金鑰。",
  unlock_failed:
    "解鎖加密金鑰失敗，對話尚未開始。請再按一次；若持續失敗，請重新整理頁面或聯繫維運（詳細原因已記錄在瀏覽器主控台）。",
  subtitle: "您專屬的企業碳會計師 (Carbon Accountant)",
  recent_chats: "最新對話",
  today: "今日",
  history: "歷史對話",
  new_chat: "新增對話",
  new_chat_personal: "個人會話(端對端加密)",
  rename_session: "重新命名對話",
  rename_document: "重新命名報告檔名",
  read_only: "唯讀(帳本閱覽權限)",
  // Info: (20260730 - Tzuhan) 語意去重:自己的帳本會話已列於上方歷史對話(帶帳本 chip),此區塊僅為其他成員的報告入口
  book_reports_title: "團隊成員的報告",
  book_no_sessions: "此帳本尚無碳盤查報告",
  book_session_own: "我的盤查會話({{date}})",
  book_session_member: "成員盤查報告({{date}})",
  book_report_viewer_title: "帳本碳盤查報告",
  book_report_editable: "可編輯(帳本編輯權限)",
  book_report_empty: "此會話尚未產生報告內容。",
  book_chat_hidden_note: "聊天記錄為個人端對端加密,僅報告對帳本成員共享",
  ai_thinking: "AI 思考中...",
  input_placeholder: "輸入您的問題或回覆...",
  report_progress: "報告產出進度",
  report_preview_title: "溫室氣體盤查報告預覽",
  report_empty_title: "報告尚未生成",
  report_empty_desc:
    "請透過左側聊天室與碳會計師完成盤查流程，系統將自動即時為您產出完整的碳盤查清冊與報告。",
  iso_inventory: "ISO 14064-1 盤查清冊",
  emission_sources: "排放源鑑別",
  data_activity: "數據活動紀錄",
  emission_factors: "排放係數對應",
  uncertainty: "不確定性評估",
  ghg_protocol: "GHG Protocol 報告",
  scope_analysis: "範疇一、二、三分析",
  reduction_pathway: "減碳路徑模擬",
  // Info: (20260730 - Tzuhan) gateway 連線中斷(504)時的提示:工作仍在跑,結果會經訂閱通道補上
  still_processing:
    "處理時間較長,連線已先中斷,但作業仍在進行中,完成的段落會自動出現。",
  // Info: (20260730 - Tzuhan) 段落來源標示:AI 草稿不得冒充逐字照抄原文(審計文件底線)
  realtime_connecting: "即時連線中…回覆可能延遲送達",
  realtime_disconnected:
    "即時連線中斷,長時間的處理結果可能送不回來。請重新整理頁面。",
  imported_from_short: "匯入自",
  imported_from_title: "匯入自 {{name}}(匯入時間 {{date}})",
  origin_imported: "逐字匯入",
  origin_ai_draft: "AI 草稿",
  origin_imported_short: "原文",
  origin_ai_draft_short: "草稿",
  // Info: (20260806 - Tzuhan) 匯入前先上傳取 cid:14 次呼叫共用一份儲存,文案要說出「為何要等」
  import_uploading:
    "正在將 {{name}} 存入安全儲存(後續每章解析改由伺服端取回,不再重複上傳整份檔案)…",
  // Info: (20260730 - Tzuhan) 兩階段匯入的第一階段提示:一次索引換來後續 11 章不必各自重送整份文件
  import_indexing:
    "正在建立 {{name}} 的章節索引(定位各節頁碼,可大幅減少後續解析量)…",
  // Info: (20260730 - Tzuhan) 結構圖:節點文字必須能在該段原文找到才會繪製,故文案明示來源
  diagram_generate: "產生結構圖(節點取自本節原文)",
  // Info: (20260730 - Tzuhan) 封存為軟刪:文案明示資料保留可還原,避免使用者誤以為永久刪除
  archive_session: "封存此對話(資料保留,可還原)",
  archive_confirm: "再點一次確認封存",
  // Info: (20260730 - Tzuhan) 已封存區塊:空清單也需文案,否則分不清「沒有封存」與「載入失敗」
  archived_sessions: "已封存",
  archived_loading: "載入中…",
  archived_empty: "沒有已封存的對話",
  archived_at: "封存於 {{date}}",
  restore_session: "還原此對話",
  system_error: "【系統錯誤】抱歉，連線到碳會計師服務時發生問題，請稍後再試。",
  system_unavailable: "抱歉，系統目前無法回應。",
  team_quota_exceeded:
    "團隊的 AI 額度與分配點數都已用完，請等待額度重置，或加購點數／升級方案後再試。",
  session_not_bound:
    "此盤查會話尚未綁定帳本，無法計算額度。請先於會話設定中選擇要歸屬的帳本。",
  ai_quota_exceeded:
    "【AI 額度已達上限】短時間內請求過多，請稍候一分鐘後再試。",
  rate_limited: "【操作過於頻繁】已達使用頻率上限，請稍候片刻再試。",
  ai_timeout: "【AI 回應逾時】系統處理時間過長，請再試一次。",
  ai_name: "費思",
  platform_name: "環境智能平台",
  system_online: "系統連線中",
  database_version: "數據庫版本",
  send_message: "傳送訊息",
  no_report_data: "目前尚未有報告資料",
  paragraph_tracker_title: "段落狀態追蹤面板",
  status_completed: "已完成",
  status_incomplete: "未完成",
  status_verified: "已查核",
  status_unverified: "未查核",
  outline_title: "章節目錄",
  outline_button: "目錄",
  completed_short: "完成",
  verified_short: "查核",
  verified_progress: "人工查核進度",
  jump_aria_label: "跳至此段落",
  close_outline: "關閉章節目錄",
  data_driven_badge: "數據段落: 數字由系統勾稽計算，非 AI 產出",
  jump_prompt: "請協助我完成「{{section}}」這個段落。",
  new_session_title: "新的盤查對話",
  save_saving: "保存中...",
  save_saved: "已保存",
  save_local: "已暫存於本機,解鎖加密對話後將自動保存至雲端",
  save_local_hint: "報告草稿已加密保存至雲端",
  save_failed: "保存失敗",
  save_failed_hint:
    "保存失敗：可能有其他分頁已更新草稿，請重整頁面取得最新版本",
  // Info: (20260807 - Emily) 保存失敗的分型文案:失敗代價是幾分鐘的成果,不能只留一個小圖示
  save_failed_notice:
    "報告最新的變更沒有保存到雲端。內容仍在本機,請稍後重試或重整頁面。",
  save_failed_conflict:
    "報告最新的變更沒有保存到雲端：草稿已被其他分頁或裝置更新。請重整頁面取得最新版本後再改一次。",
  save_failed_too_large:
    "報告最新的變更沒有保存到雲端：內容已超過單份草稿的上限。請先移除部分原文表格或改以分次匯入。",
  save_local_quota: "本機暫存空間已滿,離線備份未更新(雲端已保存)。",
  save_local_quota_only:
    "本機暫存空間已滿,而這一版尚未能保存至雲端 —— 請勿關閉分頁,先解鎖或重整後再試。",
  attach_file: "附加檔案",
  remove_attachment: "移除附件",
  attachment_invalid_type:
    "不支援的檔案類型：{{name}}(僅接受 PNG、JPG、PDF、CSV、XLSX)",
  attachment_too_large: "檔案過大：{{name}}(單檔上限 {{max}})",
  attachment_limit: "一則訊息最多附加 {{max}} 個檔案",
  attachment_upload_failed: "附件上傳失敗: {{name}}，請移除後重試",
  attachment_type_mismatch:
    "檔案內容與副檔名不符: {{name}}(疑似偽裝檔，已拒收)",
  attachment_infected: "偵測到惡意內容: {{name}}，已拒收",
  storage_quota_exceeded: "儲存空間已滿(上限 5GB)，請刪除舊附件後再試",
  draft_generate: "AI 撰寫此段草稿",
  draft_generating: "草稿生成中...",
  draft_generating_section: "「{{section}}」草稿生成中，完成後將寫入報告…",
  draft_failed:
    "【草稿生成失敗】「{{section}}」段落草稿生成時發生問題，請稍後再試。",
  revision_title: "修訂建議:{{section}}",
  revision_original: "原文",
  revision_revised: "修訂後",
  revision_cited_facts: "引用事實",
  revision_apply: "套用修訂",
  revision_discard: "捨棄",
  revision_generating: "「{{section}}」修訂建議產生中…",
  revision_failed: "【修訂失敗】無法產生修訂建議,請稍後再試。",
  import_button: "匯入報告",
  import_title: "匯入報告:{{name}}",
  import_overwrite_warning: "將覆蓋既有內容",
  import_drafting_sections:
    "「{{name}}」缺漏小節 AI 草稿補齊中(第 {{current}}/{{total}} 批,依據上傳文件撰寫)…",
  import_generating_diagrams:
    "結構圖生成中({{current}}/{{total}})…報告已可閱讀,圖表會在完成後陸續出現。",
  import_wrong_session: "這份匯入屬於「{{name}}」，請切回該對話再套用。",
  import_draft_badge: "AI 草稿",
  import_unmapped: "無法對應大綱的內容({{count}} 段,不會匯入,可於對話中處理)",
  // Info: (20260806 - Tzuhan) 待匯入結果的第三條路:保存起來稍後再決定(內容已入庫,重載仍在)
  import_defer: "稍後再說",
  import_pending_bar:
    "已保存待匯入的解析結果:{{name}}(共 {{count}} 節,尚未寫入報告)",
  import_pending_open: "檢視並匯入",
  import_pending_discard: "捨棄",
  import_reset_note:
    "匯入段落的查核狀態將重置;{{activities}} 筆活動數據將入帳並重新勾稽",
  import_apply: "匯入勾選({{count}})",
  import_parsing: "「{{name}}」解析中,完成後將顯示逐段預覽…",
  import_already_running:
    "「{{name}}」還在解析中。同時跑兩份會互相搶額度、兩邊都變慢,請等這一份跑完或重新整理後再試。",
  import_parsing_chapter:
    "「{{name}}」逐章解析中(已完成 {{current}}/{{total}} 章,{{inFlight}} 章解析中),完整報告約需數分鐘…",
  import_requires_book:
    "這個會話還沒綁定帳本,無法匯入整份報告(逐章匯入需要以帳本的額度計費)。請先在會話設定選擇帳本,再重新匯入。",
  import_paused_chapters:
    "點數已用完,以下章節還沒開始解析:{{chapters}}。補上點數後可以從這裡接著匯入,已完成的部分不會重跑。",
  // Info: (20260827 - Luphia) 中斷（關分頁／切走／當掉）不是點數用完（issue #6723）
  import_interrupted_chapters:
    "上一次匯入沒有跑完,以下章節還沒解析:{{chapters}}。可以從這裡接著匯入,已完成的部分不會重跑、也不會再扣點數。",
  // Info: (20260827 - Luphia) 另一個分頁／裝置正在跑（issue #6721）：等一下就好，不是壞了
  import_job_busy:
    "另一個分頁或裝置正在跑這份匯入。等它跑完再回來看,或重新整理這一頁——同時跑兩次會重複扣點數。",
  // Info: (20260827 - Luphia) 付款完成後自動接續（issue #6714）：畫面自己動起來要先說一句話
  import_auto_resuming:
    "點數已補上,正在接著把剩下的章匯入。已完成的部分不會重跑。",
  import_resume_needs_file:
    "接著匯入需要原本那份檔案,而它在重新整理或換裝置之後就不在瀏覽器裡了。請重新上傳同一份報告——已完成的章節不會重跑。",
  import_resume_paused: "接著匯入",
  import_failed_chapters: "以下章節解析失敗,可稍後重新匯入補齊:{{chapters}}",
  import_retry_failed: "重試失敗章節",
  import_retrying: "重試中…",
  import_retrying_hint:
    "正在重新解析失敗的章節,需要數分鐘。請不要關閉這張卡片。",
  import_empty: "【匯入失敗】檔案中沒有可對應到大綱的內容。",
  import_failed: "【匯入失敗】報告解析發生問題,請稍後再試。",
  attachments_processing:
    "附件解析中(萃取事實與生成草稿),大型檔案可能需要一至兩分鐘…",
  import_suggest:
    "「{{name}}」看起來是整份報告。要匯入為報告起點,還是作為佐證附件?",
  import_suggest_import: "匯入報告",
  import_suggest_attach: "作為附件傳送",
  // Info: (20260730 - Tzuhan) 連續未生成的節收成一列摘要;逐節整句佔位在 33 節全空時等於噪音
  sections_pending_summary:
    "以上 {{count}} 節尚未撰寫。到對話中告訴碳會計師要寫哪一節,內容會即時出現在對應位置。",
  section_placeholder:
    "本段尚未生成。回到左側對話告訴碳會計師你想撰寫這一段，內容將即時出現在這裡。",
  report_status_draft:
    "報告狀態：草稿(內容由 AI 逐段生成，經人工查核後方可定稿)",
  report_button: "報告",
  close_report: "關閉報告",
  // Info: (20260730 - Tzuhan) 聊天面板放大/縮小(浮層 ↔ 右側 dock);行動版兩態皆全螢幕故不顯示
  panel_maximize: "放大為側欄",
  panel_restore: "縮小為浮動視窗",
  close_chat: "關閉聊天視窗",
  progress_collapse: "收合進度浮窗",
  activity_ledger_title: "活動數據帳本",
  activity_ledger_pill: "活動數據 {{count}} 筆",
  activity_ledger_pill_imported: " · 匯入 {{count}} 筆",
  activity_ledger_imported_note:
    "匯入的排放量已在帳本:{{count}} 筆,合計 {{tonne}} 公噸 CO2e。原文只給排放量、沒有活動數據與係數,故不列於下方。",
  activity_ledger_empty_after_import:
    "尚無活動數據。匯入的報告只提供排放量;若要逐筆的活動數據與係數,請在對話中提供或從帳本匯入憑證數據。",
  activity_ledger_empty:
    "尚無活動數據。在對話中提供用電量、油耗等數據，或上傳帳單，系統會自動記錄於此。",
  activity_ledger_collapse: "收合活動數據",
  activity_source: "來源: {{source}}",
  activity_source_chat: "來源: 對話",
  activity_co2e: "CO2e: {{value}} kg",
  activity_pending_factor: "⚠ 待補: 查無可靠係數或單位不符,不予推估",
  activity_total_co2e: "總排放量（已勾稽）",
  articulation_passed: "質量守恆勾稽通過",
  articulation_violation: "質量守恆違反：{{material}}",
  articulation_equation:
    "期初+採購-期末 = {{expected}} {{unit}}，帳上消耗 = {{actual}} {{unit}}，缺口 = {{gap}} {{unit}}",
  articulation_plausibility_warning: "數量超出合理量級，請確認：{{source}}",
  report_table_detail_heading: "排放源明細",
  report_table_col_source: "排放源",
  report_table_col_scope: "範疇",
  report_table_col_quantity: "活動數據",
  report_table_col_factor: "排放係數（來源）",
  report_table_col_co2e: "排放量 (kgCO2e)",
  report_table_subtotal_heading: "範疇小計",
  report_table_total: "總排放量",
  report_table_insufficient:
    "（資料不足，補齊活動數據後由系統自動生成數據表格）",
  report_table_frozen:
    "⚠ 質量守恆勾稽未通過，數據表格已凍結。請於對話中澄清庫存缺口後，表格將自動生成。",
  report_table_pending_note:
    "註：尚有 {count} 筆活動數據待補係數，未計入下表。",
  report_table_col_provenance: "資料來源",
  report_table_provenance_computed: "系統計算",
  report_table_provenance_imported: "原文照錄",
  report_table_not_provided: "原文未提供",
  report_table_imported_note:
    "註：標示「原文照錄」者為外部報告既有的排放當量，本系統未套用任何活動數據或排放係數，故該兩欄為「原文未提供」；其數字已與原文總量勾稽（見本節對帳說明）。",
  data_table_refreshed: "數據表格已隨活動數據更新，請重新查核相關段落",
  data_badge_reconciled: "數據段落：已勾稽 ✓（數字由決定論引擎產出）",
  data_badge_imported:
    "數據段落：含原文照錄項目（已與原文總量勾稽，逐列標示來源）",
  data_badge_violated: "數據段落：質量守恆違反 ⚠（表格已凍結，待澄清）",
  data_badge_insufficient: "數據段落：數據不足（補齊活動數據後自動生成）",
  chart_scope_pie_title: "各範疇排放占比 (kgCO2e)",
  chart_scope_bar_title: "各範疇排放量 (kgCO2e)",
  chart_insufficient: "（資料不足，補齊活動數據後由系統自動生成圖表）",
  chart_frozen:
    "⚠ 質量守恆勾稽未通過，圖表已凍結。請於對話中澄清庫存缺口後，圖表將自動生成。",
  chart_sankey_chat_node: "憑證外的來源（對話/附件申報）",
  chart_sankey_period_unknown: "未標註期間",
  chart_sankey_period_collapsed:
    "期間跨度超過兩個年度，已略過月別層（月別請看趨勢圖）",
  chart_imported_sankey_title:
    "排放分類:全公司 → 範疇 → 子代碼(原文照錄,所在地基準,公噸 CO2e/年)",
  chart_imported_sankey_excluded: "未畫出的項目（NA/NS 或為零）",
  chart_imported_sankey_no_ledger:
    "本報告已匯入，但帳本沒有任何可用數據，因此畫不出排放流向圖。桑基圖與系統數據表格的唯一來源是表3.8（各公司溫室氣體排放量），本次未取得該表。請確認第三章是否解析成功；若該章列為解析失敗，請以預覽卡的「重試失敗章節」重新匯入，並在伺服端日誌查看該表是否被丟棄及其原因。",
  chart_imported_sankey_collapsed: "節點過多,已降為一層(全公司 → 範疇)",
  chart_imported_top_items_title:
    "排放去向：全公司 → 前九大排放項目與其他（原文照錄，所在地基準，公噸 CO2e/年）",
  chart_imported_sankey_other: "其他",
  // Info: (20260807 - Tzuhan) 分類圖抽掉廠址層(屏東佔 97%,同圖畫不出比重);廠址改列小計
  chart_imported_sankey_site_totals: "各廠址小計(公噸 CO2e/年,占全公司比)",
  chart_imported_sankey_ghg_mapping: "子代碼與 GHG Protocol 類別的對照",
  chart_imported_sankey_iso_mapping:
    "圖上的分類層依 GHG Protocol 範疇標示；對照 ISO 14064-1 為：範疇一＝類別一、範疇二＝類別二、範疇三＝類別三至類別六。本報告敘述採 ISO 14064-1 類別制，兩者指同一批排放源。",
  chart_imported_sankey_below_threshold: "占比過小未畫出（公噸 CO2e/年）",
  chart_imported_sankey_organization: "全公司",
  book_bind_pending_unlock:
    "帳本會話已建立。請先解鎖加密對話以完成帳本綁定（匯入憑證數據與證據鏈功能需綁定後才可用）",
  book_bind_done: "帳本綁定完成，可從活動數據卡匯入憑證數據",
  book_bind_denied: "帳本綁定失敗：需要該帳本 Editor 以上的權限",
  book_bind_failed: "帳本綁定失敗，請稍後再試",
  book_records_import_button: "從帳本匯入憑證數據",
  book_records_importing: "正在從帳本匯入已認列的憑證級碳排數據…",
  book_records_imported:
    "已從帳本匯入 {{count}} 筆憑證級活動數據（重複者自動略過）",
  book_records_imported_with_skips:
    "已從帳本匯入 {{count}} 筆；{{skipped}} 筆因無法判定 GHG 範疇而略過，請至 ESG 頁補選範疇或活動類型",
  book_records_import_failed: "從帳本匯入失敗，請稍後再試",
  activity_open_evidence: "查看憑證 ↗",
  evidence_chain_title: "排放證據鏈（點擊逐層展開，最細至單一憑證）",
  evidence_chain_loading: "正在載入帳本憑證數據…",
  evidence_chain_empty: "此帳本尚無已認列的碳排數據",
  evidence_chain_error: "憑證數據載入失敗（請確認帳本閱覽權限）",
  evidence_chain_records: "{{count}} 筆憑證",
  evidence_chain_formula:
    "{{quantity}} {{unit}} × {{factor}} = {{co2e}} kgCO2e",
  evidence_chain_total: "總排放量",
  evidence_chain_verified: "已驗證",
  evidence_chain_unverified: "未驗證",
  inventory_step_ORG_PROFILE: "步驟: 企業基本資料（名稱／年度）",
  inventory_step_ORG_BOUNDARY: "步驟: 組織邊界設定",
  inventory_step_EMISSION_SOURCES: "步驟: 排放源鑑別",
  inventory_step_ACTIVITY_DATA: "步驟: 活動數據蒐集",
  inventory_step_EMISSION_FACTORS: "步驟: 排放係數對應",
  inventory_step_REVIEW: "步驟: 勾稽與覆核",
  inventory_step_COMPLETED: "盤查資料蒐集完成",
};
