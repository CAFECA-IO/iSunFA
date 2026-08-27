export const carbonChatbot = {
  title: "碳盘查机器人",
  menu_title: "智能温盘",
  // Info: (20260730 - Tzuhan) 未解鎖時的報告區文案:不可讓大綱骨架看起來像已載入的空報告
  report_locked_hint:
    "报告内容以设备密钥端对端加密。完成一次验证即可解锁并载入这份报告。",
  report_locked_hint_custodial:
    "报告内容加密后储存。您以第三方账号登录，加密密钥由平台代管，完成一次验证即可解锁并载入这份报告。",
  unlock_button: "开始加密对话",
  unlock_hint:
    "为保护您的盘查内容，本对话将以设备的安全密钥进行端到端加密。点击开始并完成一次验证即可解锁并取得 AI 招呼。",
  // Info: (20260812 - Luphia) 托管账号（第三方登录）专用的解锁说明，不可沿用上面那句
  unlock_hint_custodial:
    "为保护您的盘查内容，本对话将加密后储存。您以第三方账号登录，加密密钥由平台代管（与您的钱包相同），因此平台在技术上具备解密能力；若需要「仅您本人可解密」的保护等级，请改用 passkey 账号。点击开始即可解锁并取得 AI 招呼。",
  custody_loading: "正在确认您的账号密钥保管方式，稍候即可开始加密对话。",
  key_source_mismatch:
    "这份对话是以另一种密钥保管方式加密的（例如您在绑定 passkey 之前建立的内容），因此无法用目前的密钥解开。请联系运维协助完成密钥移转 —— 重试不会有帮助。",
  device_unsupported:
    "您的设备或浏览器不支持加密所需的安全密钥功能（WebAuthn PRF），暂时无法使用加密对话。建议改用支持的环境，例如 Android 上的 Chrome，或支持 PRF 的实体安全密钥。",
  unlock_failed:
    "解锁加密密钥失败，对话尚未开始。请再按一次；若持续失败，请刷新页面或联系运维（详细原因已记录在浏览器控制台）。",
  subtitle: "您专属的企业碳会计师 (Carbon Accountant)",
  recent_chats: "最新对话",
  today: "今日",
  history: "历史对话",
  new_chat: "新增对话",
  new_chat_personal: "个人会话(端对端加密)",
  rename_session: "重命名对话",
  rename_document: "重命名报告文件名",
  read_only: "只读(账本查看权限)",
  // Info: (20260730 - Tzuhan) 語意去重:自己的帳本會話已列於上方歷史對話(帶帳本 chip),此區塊僅為其他成員的報告入口
  book_reports_title: "团队成员的报告",
  book_no_sessions: "此账本尚无碳盘查报告",
  book_session_own: "我的盘查会话({{date}})",
  book_session_member: "成员盘查报告({{date}})",
  book_report_viewer_title: "账本碳盘查报告",
  book_report_editable: "可编辑(账本编辑权限)",
  book_report_empty: "此会话尚未产生报告内容。",
  book_chat_hidden_note: "聊天记录为个人端对端加密,仅报告对账本成员共享",
  ai_thinking: "AI 思考中...",
  input_placeholder: "输入您的问题或回复...",
  report_progress: "报告产出进度",
  report_preview_title: "温室气体盘查报告预览",
  report_empty_title: "报告尚未生成",
  report_empty_desc:
    "请透过左侧聊天室与碳会计师完成盘查流程，系统将自动实时为您产出完整的碳盘查清册与报告。",
  iso_inventory: "ISO 14064-1 盘查清册",
  emission_sources: "排放源鉴别",
  data_activity: "数据活动纪录",
  emission_factors: "排放系数对应",
  uncertainty: "不确定性评估",
  ghg_protocol: "GHG Protocol 报告",
  scope_analysis: "范畴一、二、三分析",
  reduction_pathway: "减碳路径模拟",
  // Info: (20260730 - Tzuhan) gateway 连线中断(504)时的提示:工作仍在跑,结果会经订阅通道补上
  still_processing:
    "处理时间较长,连线已先中断,但作业仍在进行中,完成的段落会自动出现。",
  // Info: (20260730 - Tzuhan) 段落來源標示:AI 草稿不得冒充逐字照抄原文(審計文件底線)
  realtime_connecting: "实时连线中…回复可能延迟送达",
  realtime_disconnected:
    "实时连线中断,长时间的处理结果可能送不回来。请刷新页面。",
  imported_from_short: "导入自",
  imported_from_title: "导入自 {{name}}(导入时间 {{date}})",
  origin_imported: "逐字导入",
  origin_ai_draft: "AI 草稿",
  origin_imported_short: "原文",
  origin_ai_draft_short: "草稿",
  // Info: (20260806 - Tzuhan) 匯入前先上傳取 cid:14 次呼叫共用一份儲存,文案要說出「為何要等」
  import_uploading:
    "正在将 {{name}} 存入安全存储(后续每章解析改由服务端取回,不再重复上传整份文件)…",
  // Info: (20260730 - Tzuhan) 兩階段匯入的第一階段提示:一次索引換來後續 11 章不必各自重送整份文件
  import_indexing:
    "正在建立 {{name}} 的章节索引(定位各节页码,可大幅减少后续解析量)…",
  // Info: (20260730 - Tzuhan) 結構圖:節點文字必須能在該段原文找到才會繪製,故文案明示來源
  diagram_generate: "生成结构图(节点取自本节原文)",
  // Info: (20260730 - Tzuhan) 封存為軟刪:文案明示資料保留可還原,避免使用者誤以為永久刪除
  archive_session: "封存此对话(资料保留,可还原)",
  archive_confirm: "再点一次确认封存",
  // Info: (20260730 - Tzuhan) 已封存區塊:空清單也需文案,否則分不清「沒有封存」與「載入失敗」
  archived_sessions: "已封存",
  archived_loading: "加载中…",
  archived_empty: "没有已封存的对话",
  archived_at: "封存于 {{date}}",
  restore_session: "还原此对话",
  system_error: "【系统错误】抱歉，连线到碳会计师服务时发生问题，请稍后再试。",
  system_unavailable: "抱歉，系统目前无法回应。",
  team_quota_exceeded:
    "团队的 AI 额度与分配点数都已用完，请等待额度重置，或加购点数／升级方案后再试。",
  session_not_bound:
    "此盘查会话尚未绑定账本，无法计算额度。请先于会话设置中选择要归属的账本。",
  ai_quota_exceeded:
    "【AI 额度已达上限】短时间内请求过多，请稍候一分钟后再试。",
  rate_limited: "【操作过于频繁】已达使用频率上限，请稍候片刻再试。",
  ai_timeout: "【AI 响应超时】系统处理时间过长，请再试一次。",
  ai_name: "费思",
  platform_name: "环境智能平台",
  system_online: "系统连线中",
  database_version: "数据库版本",
  send_message: "发送讯息",
  no_report_data: "目前尚未有报告资料",
  paragraph_tracker_title: "段落状态追踪面板",
  status_completed: "已完成",
  status_incomplete: "未完成",
  status_verified: "已查核",
  status_unverified: "未查核",
  outline_title: "章节目录",
  outline_button: "目录",
  completed_short: "完成",
  verified_short: "查核",
  verified_progress: "人工查核进度",
  jump_aria_label: "跳至此段落",
  close_outline: "关闭章节目录",
  data_driven_badge: "数据段落: 数字由系统勾稽计算，非 AI 产出",
  jump_prompt: "请协助我完成「{{section}}」这个段落。",
  new_session_title: "新的盘查对话",
  save_saving: "保存中...",
  save_saved: "已保存",
  save_local: "已暂存于本机,解锁加密对话后将自动保存至云端",
  save_local_hint: "报告草稿已加密保存至云端",
  save_failed: "保存失败",
  save_failed_hint:
    "保存失败: 可能有其他标签页已更新草稿，请刷新页面获取最新版本",
  // Info: (20260807 - Emily) 保存失败的分型文案:失败代价是几分钟的成果,不能只留一个小图标
  save_failed_notice:
    "报告最新的变更没有保存到云端。内容仍在本机,请稍后重试或刷新页面。",
  save_failed_conflict:
    "报告最新的变更没有保存到云端：草稿已被其他标签页或设备更新。请刷新页面获取最新版本后再改一次。",
  save_failed_too_large:
    "报告最新的变更没有保存到云端：内容已超过单份草稿的上限。请先移除部分原文表格或改以分次导入。",
  save_local_quota: "本机暂存空间已满,离线备份未更新(云端已保存)。",
  save_local_quota_only:
    "本机暂存空间已满,而这一版尚未能保存至云端 —— 请勿关闭标签页,先解锁或刷新后再试。",
  attach_file: "附加文件",
  remove_attachment: "移除附件",
  attachment_invalid_type:
    "不支持的文件类型：{{name}}(仅接受 PNG、JPG、PDF、CSV、XLSX)",
  attachment_too_large: "文件过大：{{name}}(单文件上限 {{max}})",
  attachment_limit: "一条消息最多附加 {{max}} 个文件",
  attachment_upload_failed: "附件上传失败: {{name}}，请移除后重试",
  attachment_type_mismatch:
    "文件内容与扩展名不符: {{name}}(疑似伪装文件，已拒收)",
  attachment_infected: "检测到恶意内容: {{name}}，已拒收",
  storage_quota_exceeded: "存储空间已满(上限 5GB)，请删除旧附件后再试",
  draft_generate: "AI 撰写此段草稿",
  draft_generating: "草稿生成中...",
  draft_generating_section: "「{{section}}」草稿生成中，完成后将写入报告…",
  draft_failed:
    "【草稿生成失败】「{{section}}」段落草稿生成时发生问题，请稍后再试。",
  revision_title: "修订建议:{{section}}",
  revision_original: "原文",
  revision_revised: "修订后",
  revision_cited_facts: "引用事实",
  revision_apply: "应用修订",
  revision_discard: "舍弃",
  revision_generating: "「{{section}}」修订建议生成中…",
  revision_failed: "【修订失败】无法生成修订建议,请稍后再试。",
  import_button: "导入报告",
  import_title: "导入报告:{{name}}",
  import_overwrite_warning: "将覆盖既有内容",
  import_drafting_sections:
    "「{{name}}」缺漏小节 AI 草稿补齐中(第 {{current}}/{{total}} 批,依据上传文件撰写)…",
  import_generating_diagrams:
    "结构图生成中({{current}}/{{total}})…报告已可阅读,图表会在完成后陆续出现。",
  import_wrong_session: "这份导入属于「{{name}}」，请切回该对话再套用。",
  import_draft_badge: "AI 草稿",
  import_unmapped: "无法对应大纲的内容({{count}} 段,不会导入,可于对话中处理)",
  // Info: (20260806 - Tzuhan) 待匯入結果的第三條路:保存起來稍後再決定(內容已入庫,重載仍在)
  import_defer: "稍后再说",
  import_pending_bar:
    "已保存待导入的解析结果:{{name}}(共 {{count}} 节,尚未写入报告)",
  import_pending_open: "查看并导入",
  import_pending_discard: "舍弃",
  import_reset_note:
    "导入段落的核对状态将重置;{{activities}} 笔活动数据将入账并重新核对",
  import_apply: "导入勾选({{count}})",
  import_parsing: "「{{name}}」解析中,完成后将显示逐段预览…",
  import_already_running:
    "「{{name}}」还在解析中。同时跑两份会互相抢额度、两边都变慢,请等这一份跑完或刷新后再试。",
  import_parsing_chapter:
    "「{{name}}」逐章解析中(已完成 {{current}}/{{total}} 章,{{inFlight}} 章解析中),完整报告约需数分钟…",
  import_requires_book:
    "这个会话还没绑定账本,无法导入整份报告(逐章导入需要以账本的额度计费)。请先在会话设置选择账本,再重新导入。",
  import_paused_chapters:
    "点数已用完,以下章节还没开始解析:{{chapters}}。补上点数后可以从这里接着导入,已完成的部分不会重跑。",
  // Info: (20260827 - Luphia) 中斷（關分頁／切走／當掉）不是點數用完（issue #6723）
  import_interrupted_chapters:
    "上一次导入没有跑完,以下章节还没解析:{{chapters}}。可以从这里接着导入,已完成的部分不会重跑、也不会再扣点数。",
  import_resume_needs_file:
    "接着导入需要原本那份文件,而它在刷新或换设备之后就不在浏览器里了。请重新上传同一份报告——已完成的章节不会重跑。",
  import_resume_paused: "接着导入",
  import_failed_chapters: "以下章节解析失败,可稍后重新导入补齐:{{chapters}}",
  import_retry_failed: "重试失败章节",
  import_retrying: "重试中…",
  import_retrying_hint:
    "正在重新解析失败的章节,需要数分钟。请不要关闭这张卡片。",
  import_empty: "【导入失败】文件中没有可对应到大纲的内容。",
  import_failed: "【导入失败】报告解析发生问题,请稍后再试。",
  attachments_processing:
    "附件解析中(提取事实与生成草稿),大型文件可能需要一至两分钟…",
  import_suggest:
    "「{{name}}」看起来是整份报告。要导入为报告起点,还是作为佐证附件?",
  import_suggest_import: "导入报告",
  import_suggest_attach: "作为附件发送",
  // Info: (20260730 - Tzuhan) 連續未生成的節收成一列摘要;逐節整句佔位在 33 節全空時等於噪音
  sections_pending_summary:
    "以上 {{count}} 节尚未撰写。到对话中告诉碳会计师要写哪一节,内容会即时出现在对应位置。",
  section_placeholder:
    "本段尚未生成。回到左侧对话告诉碳会计师你想撰写这一段，内容将实时出现在这里。",
  report_status_draft:
    "报告状态：草稿(内容由 AI 逐段生成，经人工查核后方可定稿)",
  report_button: "报告",
  close_report: "关闭报告",
  // Info: (20260730 - Tzuhan) 聊天面板放大/縮小(浮層 ↔ 右側 dock);行動版兩態皆全螢幕故不顯示
  panel_maximize: "放大为侧栏",
  panel_restore: "缩小为浮动窗口",
  close_chat: "关闭聊天窗口",
  progress_collapse: "收起进度浮窗",
  activity_ledger_title: "活动数据台账",
  activity_ledger_pill: "活动数据 {{count}} 笔",
  activity_ledger_pill_imported: " · 导入 {{count}} 笔",
  activity_ledger_imported_note:
    "导入的排放量已在账本:{{count}} 笔,合计 {{tonne}} 公吨 CO2e。原文只给排放量、没有活动数据与系数,故不列于下方。",
  activity_ledger_empty_after_import:
    "尚无活动数据。导入的报告只提供排放量;若要逐笔的活动数据与系数,请在对话中提供或从账本导入凭证数据。",
  activity_ledger_empty:
    "尚无活动数据。在对话中提供用电量、油耗等数据，或上传账单，系统会自动记录于此。",
  activity_ledger_collapse: "收起活动数据",
  activity_source: "来源: {{source}}",
  activity_source_chat: "来源: 对话",
  activity_co2e: "CO2e: {{value}} kg",
  activity_pending_factor: "⚠ 待补: 查无可靠系数或单位不符,不予推估",
  activity_total_co2e: "总排放量（已核对）",
  articulation_passed: "质量守恒核对通过",
  articulation_violation: "质量守恒违反：{{material}}",
  articulation_equation:
    "期初+采购-期末 = {{expected}} {{unit}}，账上消耗 = {{actual}} {{unit}}，缺口 = {{gap}} {{unit}}",
  articulation_plausibility_warning: "数量超出合理量级，请确认：{{source}}",
  report_table_detail_heading: "排放源明细",
  report_table_col_source: "排放源",
  report_table_col_scope: "范畴",
  report_table_col_quantity: "活动数据",
  report_table_col_factor: "排放系数（来源）",
  report_table_col_co2e: "排放量 (kgCO2e)",
  report_table_subtotal_heading: "范畴小计",
  report_table_total: "总排放量",
  report_table_insufficient:
    "（数据不足，补齐活动数据后由系统自动生成数据表格）",
  report_table_frozen:
    "⚠ 质量守恒核对未通过，数据表格已冻结。请于对话中澄清库存缺口后，表格将自动生成。",
  report_table_pending_note:
    "注：尚有 {count} 笔活动数据待补系数，未计入下表。",
  report_table_col_provenance: "资料来源",
  report_table_provenance_computed: "系统计算",
  report_table_provenance_imported: "原文照录",
  report_table_not_provided: "原文未提供",
  report_table_imported_note:
    "注：标示「原文照录」者为外部报告既有的排放当量，本系统未套用任何活动数据或排放系数，故该两栏为「原文未提供」；其数字已与原文总量勾稽（见本节对账说明）。",
  data_table_refreshed: "数据表格已随活动数据更新，请重新核对相关段落",
  data_badge_reconciled: "数据段落：已核对 ✓（数字由确定性引擎产出）",
  data_badge_imported:
    "数据段落：含原文照录项目（已与原文总量勾稽，逐列标示来源）",
  data_badge_violated: "数据段落：质量守恒违反 ⚠（表格已冻结，待澄清）",
  data_badge_insufficient: "数据段落：数据不足（补齐活动数据后自动生成）",
  chart_scope_pie_title: "各范畴排放占比 (kgCO2e)",
  chart_scope_bar_title: "各范畴排放量 (kgCO2e)",
  chart_insufficient: "（数据不足，补齐活动数据后由系统自动生成图表）",
  chart_frozen:
    "⚠ 质量守恒核对未通过，图表已冻结。请于对话中澄清库存缺口后，图表将自动生成。",
  chart_sankey_chat_node: "凭证外的来源（对话/附件申报）",
  chart_sankey_period_unknown: "未标注期间",
  chart_sankey_period_collapsed:
    "期间跨度超过两个年度，已略过月别层（月别请看趋势图）",
  chart_imported_sankey_title:
    "排放分类:全公司 → 范畴 → 子代码(原文照录,所在地基准,公吨 CO2e/年)",
  chart_imported_sankey_excluded: "未画出的项目（NA/NS 或为零）",
  chart_imported_sankey_no_ledger:
    "本报告已导入，但账本没有任何可用数据，因此画不出排放流向图。桑基图与系统数据表格的唯一来源是表3.8（各公司温室气体排放量），本次未取得该表。请确认第三章是否解析成功；若该章列为解析失败，请以预览卡的「重试失败章节」重新导入，并在服务端日志查看该表是否被丢弃及其原因。",
  chart_imported_sankey_collapsed: "节点过多,已降为一层(全公司 → 范畴)",
  chart_imported_top_items_title:
    "排放去向：全公司 → 前九大排放项目与其他（原文照录，所在地基准，公吨 CO2e/年）",
  chart_imported_sankey_other: "其他",
  // Info: (20260807 - Tzuhan) 分類圖抽掉廠址層(屏東佔 97%,同圖畫不出比重);廠址改列小計
  chart_imported_sankey_site_totals: "各厂址小计(公吨 CO2e/年,占全公司比)",
  chart_imported_sankey_ghg_mapping: "子代码与 GHG Protocol 类别的对照",
  chart_imported_sankey_iso_mapping:
    "图上的分类层依 GHG Protocol 范畴标示；对照 ISO 14064-1 为：范畴一＝类别一、范畴二＝类别二、范畴三＝类别三至类别六。本报告叙述采 ISO 14064-1 类别制，两者指同一批排放源。",
  chart_imported_sankey_below_threshold: "占比过小未画出（公吨 CO2e/年）",
  chart_imported_sankey_organization: "全公司",
  book_bind_pending_unlock:
    "账本会话已建立。请先解锁加密对话以完成账本绑定（导入凭证数据与证据链功能需绑定后才可用）",
  book_bind_done: "账本绑定完成，可从活动数据卡导入凭证数据",
  book_bind_denied: "账本绑定失败：需要该账本 Editor 以上的权限",
  book_bind_failed: "账本绑定失败，请稍后再试",
  book_records_import_button: "从账本导入凭证数据",
  book_records_importing: "正在从账本导入已认列的凭证级碳排数据…",
  book_records_imported:
    "已从账本导入 {{count}} 笔凭证级活动数据（重复者自动略过）",
  book_records_imported_with_skips:
    "已从账本导入 {{count}} 笔；{{skipped}} 笔因无法判定 GHG 范畴而略过，请至 ESG 页补选范畴或活动类型",
  book_records_import_failed: "从账本导入失败，请稍后再试",
  activity_open_evidence: "查看凭证 ↗",
  evidence_chain_title: "排放证据链（点击逐层展开，最细至单一凭证）",
  evidence_chain_loading: "正在加载账本凭证数据…",
  evidence_chain_empty: "此账本尚无已认列的碳排数据",
  evidence_chain_error: "凭证数据加载失败（请确认账本查看权限）",
  evidence_chain_records: "{{count}} 笔凭证",
  evidence_chain_formula:
    "{{quantity}} {{unit}} × {{factor}} = {{co2e}} kgCO2e",
  evidence_chain_total: "总排放量",
  evidence_chain_verified: "已验证",
  evidence_chain_unverified: "未验证",
  inventory_step_ORG_PROFILE: "步骤: 企业基本资料（名称／年度）",
  inventory_step_ORG_BOUNDARY: "步骤: 组织边界设定",
  inventory_step_EMISSION_SOURCES: "步骤: 排放源识别",
  inventory_step_ACTIVITY_DATA: "步骤: 活动数据收集",
  inventory_step_EMISSION_FACTORS: "步骤: 排放系数对应",
  inventory_step_REVIEW: "步骤: 核对与复核",
  inventory_step_COMPLETED: "盘查资料收集完成",
};
