export const carbonChatbot = {
  title: "탄소 인벤토리 챗봇",
  menu_title: "스마트 GHG 인벤토리",
  // Info: (20260730 - Tzuhan) 未解鎖時的報告區文案:不可讓大綱骨架看起來像已載入的空報告
  report_locked_hint:
    "보고서는 기기 키로 종단간 암호화되어 있습니다. 한 번 인증하면 해제되어 불러옵니다.",
  unlock_button: "암호화 대화 시작",
  unlock_hint:
    "점검 내용을 보호하기 위해 이 대화는 기기의 보안 키로 종단 간 암호화됩니다. 시작을 클릭하고 인증을 한 번 완료하면 잠금이 해제되고 AI 인사를 받습니다.",
  device_unsupported:
    "사용 중인 기기 또는 브라우저가 암호화에 필요한 보안 키 기능(WebAuthn PRF)을 지원하지 않아 암호화 채팅을 사용할 수 없습니다. Android의 Chrome 또는 PRF를 지원하는 보안 키 등 지원되는 환경을 사용해 주세요.",
  subtitle: "귀하만의 기업 탄소 회계사",
  recent_chats: "최근 대화",
  today: "오늘",
  history: "이전 대화",
  new_chat: "새 대화",
  new_chat_personal: "개인 채팅(종단 간 암호화)",
  rename_session: "대화 이름 바꾸기",
  rename_document: "보고서 파일명 바꾸기",
  read_only: "읽기 전용(장부 열람 권한)",
  // Info: (20260730 - Tzuhan) 語意去重:自己的帳本會話已列於上方歷史對話(帶帳本 chip),此區塊僅為其他成員的報告入口
  book_reports_title: "팀원의 보고서",
  book_no_sessions: "이 장부에는 아직 탄소 보고서가 없습니다",
  book_session_own: "내 인벤토리 채팅({{date}})",
  book_session_member: "구성원 보고서({{date}})",
  book_report_viewer_title: "장부 탄소 보고서",
  book_report_editable: "편집 가능(장부 편집자 권한)",
  book_report_empty: "이 세션에는 아직 보고서 내용이 없습니다.",
  book_chat_hidden_note:
    "채팅 기록은 개인 종단 간 암호화입니다. 보고서만 장부 구성원과 공유됩니다",
  ai_thinking: "AI가 생각 중입니다...",
  input_placeholder: "질문이나 답변을 입력하세요...",
  report_progress: "보고서 생성 진행률",
  report_preview_title: "온실가스 인벤토리 보고서 미리보기",
  report_empty_title: "보고서가 아직 생성되지 않았습니다",
  report_empty_desc:
    "왼쪽 채팅창에서 탄소 회계사와 인벤토리 프로세스를 완료해 주세요. 시스템이 자동으로 완전한 탄소 인벤토리 목록과 보고서를 실시간으로 생성합니다.",
  iso_inventory: "ISO 14064-1 인벤토리 목록",
  emission_sources: "배출원 식별",
  data_activity: "데이터 활동 기록",
  emission_factors: "배출 계수 매핑",
  uncertainty: "불확실성 평가",
  ghg_protocol: "GHG 프로토콜 보고서",
  scope_analysis: "Scope 1, 2, 3 분석",
  reduction_pathway: "탄소 감축 경로 시뮬레이션",
  // Info: (20260730 - Tzuhan) gateway 연결 중단(504) 시 안내:작업은 계속 진행 중
  still_processing:
    "처리 시간이 길어 연결이 끊어졌지만 작업은 계속 진행 중입니다. 완료된 섹션은 자동으로 표시됩니다.",
  // Info: (20260730 - Tzuhan) 段落來源標示:AI 草稿不得冒充逐字照抄原文(審計文件底線)
  realtime_connecting: "실시간 연결 중… 응답이 지연될 수 있습니다",
  realtime_disconnected:
    "실시간 연결이 끊겼습니다. 오래 걸리는 작업의 결과가 전달되지 않을 수 있습니다. 페이지를 새로고침해 주세요.",
  imported_from_short: "가져온 파일",
  imported_from_title: "가져온 파일 {{name}} ({{date}})",
  origin_imported: "원문 그대로",
  origin_ai_draft: "AI 초안",
  origin_imported_short: "원문",
  origin_ai_draft_short: "초안",
  // Info: (20260730 - Tzuhan) 兩階段匯入的第一階段提示:一次索引換來後續 11 章不必各自重送整份文件
  import_indexing:
    "{{name}}의 장 색인을 만들고 있습니다(각 섹션의 페이지를 찾아 이후 분석량을 크게 줄입니다)…",
  // Info: (20260730 - Tzuhan) 結構圖:節點文字必須能在該段原文找到才會繪製,故文案明示來源
  diagram_generate: "구조도 생성(노드는 본 절 원문에서 추출)",
  // Info: (20260730 - Tzuhan) 封存為軟刪:文案明示資料保留可還原,避免使用者誤以為永久刪除
  archive_session: "이 대화 보관(데이터 유지, 복원 가능)",
  archive_confirm: "한 번 더 클릭하면 확정",
  // Info: (20260730 - Tzuhan) 已封存區塊:空清單也需文案,否則分不清「沒有封存」與「載入失敗」
  archived_sessions: "보관됨",
  archived_loading: "불러오는 중…",
  archived_empty: "보관된 대화가 없습니다",
  archived_at: "{{date}}에 보관",
  restore_session: "이 대화 복원",
  system_error:
    "[시스템 오류] 죄송합니다. 탄소 회계사 서비스에 연결하는 중 문제가 발생했습니다. 나중에 다시 시도해 주세요.",
  system_unavailable: "죄송합니다. 현재 시스템이 응답할 수 없습니다.",
  ai_quota_exceeded:
    "[AI 사용량 한도 도달] 짧은 시간에 요청이 많았습니다. 1분 후 다시 시도해 주세요.",
  ai_timeout:
    "[AI 응답 시간 초과] 처리 시간이 너무 깁니다. 다시 시도해 주세요.",
  rate_limited:
    "[요청 과다] 사용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",
  ai_name: "페이스",
  platform_name: "환경 인텔리전스 플랫폼",
  system_online: "시스템 온라인",
  database_version: "데이터베이스 버전",
  send_message: "메시지 보내기",
  no_report_data: "아직 보고서 데이터가 없습니다",
  paragraph_tracker_title: "단락 상태 추적 패널",
  status_completed: "완료됨",
  status_incomplete: "미완료",
  status_verified: "검증됨",
  status_unverified: "미검증",
  outline_title: "목차",
  outline_button: "목차",
  completed_short: "완료",
  verified_short: "검증",
  verified_progress: "수동 검토 진행률",
  jump_aria_label: "이 섹션으로 이동",
  close_outline: "목차 닫기",
  data_driven_badge:
    "데이터 섹션: 수치는 시스템 결정론 엔진에서 계산되며 AI 생성이 아닙니다",
  jump_prompt: "「{{section}}」 섹션 작성을 도와주세요.",
  new_session_title: "새 인벤토리 대화",
  save_saving: "저장 중...",
  save_saved: "저장됨",
  save_local:
    "로컬에 임시 저장됨. 암호화 채팅 잠금 해제 후 클라우드에 자동 저장됩니다",
  save_local_hint: "보고서 초안은 암호화되어 클라우드에 저장됩니다",
  save_failed: "저장 실패",
  save_failed_hint:
    "저장 실패: 다른 탭에서 초안을 업데이트했을 수 있습니다. 페이지를 새로고침해 주세요",
  attach_file: "파일 첨부",
  remove_attachment: "첨부 제거",
  attachment_invalid_type:
    "지원하지 않는 파일 형식: {{name}} (PNG, JPG, PDF, CSV, XLSX만 가능)",
  attachment_too_large: "파일이 너무 큽니다: {{name}} (파일당 최대 {{max}})",
  attachment_limit: "메시지당 최대 {{max}}개 첨부 가능",
  attachment_upload_failed:
    "첨부파일 업로드 실패: {{name}}. 제거 후 다시 시도해 주세요",
  attachment_type_mismatch:
    "파일 내용이 확장자와 일치하지 않습니다: {{name}}(위장 파일 의심, 거부됨)",
  attachment_infected: "악성 콘텐츠 감지: {{name}}(거부됨)",
  storage_quota_exceeded:
    "저장 공간이 가득 찼습니다(상한 5GB). 오래된 첨부 파일을 삭제 후 다시 시도해 주세요",
  draft_generate: "AI로 이 섹션 초안 작성",
  draft_generating: "초안 생성 중...",
  draft_generating_section:
    "「{{section}}」 초안 생성 중입니다. 완료되면 보고서에 반영됩니다…",
  draft_failed:
    "[초안 생성 실패] 「{{section}}」 섹션 초안 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  revision_title: "수정 제안: {{section}}",
  revision_original: "원문",
  revision_revised: "수정 후",
  revision_cited_facts: "인용 사실",
  revision_apply: "수정 적용",
  revision_discard: "폐기",
  revision_generating: "「{{section}}」 수정 제안 생성 중…",
  revision_failed:
    "[수정 실패] 수정 제안을 생성할 수 없습니다. 나중에 다시 시도해 주세요.",
  import_button: "보고서 가져오기",
  import_title: "보고서 가져오기: {{name}}",
  import_overwrite_warning: "기존 내용을 덮어씁니다",
  import_drafting_sections:
    "「{{name}}」 누락 섹션 AI 초안 보완 중(제 {{current}}/{{total}} 배치, 업로드 문서 기반)…",
  import_generating_diagrams:
    "구조도 생성 중({{current}}/{{total}})… 보고서는 이미 사용할 수 있으며 도표는 완성되는 대로 추가됩니다.",
  import_wrong_session:
    "이 가져오기는 「{{name}}」의 것입니다. 적용하려면 해당 대화로 돌아가세요.",
  import_draft_badge: "AI 초안",
  import_unmapped: "목차에 대응하지 않는 내용({{count}}건, 가져오지 않음)",
  import_reset_note:
    "가져온 단락의 검증 상태는 초기화됩니다. 활동 데이터 {{activities}}건은 재대사됩니다",
  import_apply: "선택 항목 가져오기({{count}})",
  import_parsing: "「{{name}}」 분석 중. 완료 후 단락별 미리보기가 표시됩니다…",
  import_already_running:
    "「{{name}}」을(를) 아직 분석 중입니다. 두 건을 동시에 실행하면 같은 할당량을 두고 경쟁해 양쪽 모두 느려집니다. 완료를 기다리거나 새로고침 후 다시 시도해 주세요.",
  import_parsing_chapter:
    "「{{name}}」 장별 분석 중({{current}}/{{total}} 완료, {{inFlight}}개 장 처리 중). 전체 보고서는 몇 분 걸립니다…",
  import_failed_chapters:
    "다음 장은 분석에 실패했습니다. 나중에 다시 가져오기로 보완할 수 있습니다: {{chapters}}",
  import_retry_failed: "실패한 장 재시도",
  import_empty: "[가져오기 실패] 목차에 대응하는 내용이 없습니다.",
  import_failed:
    "[가져오기 실패] 보고서 분석에 실패했습니다. 나중에 다시 시도해 주세요.",
  attachments_processing:
    "첨부 파일 분석 중(사실 추출 및 초안 생성). 대용량 파일은 1~2분 걸릴 수 있습니다…",
  import_suggest:
    "「{{name}}」은(는) 전체 보고서로 보입니다. 보고서 기점으로 가져올까요, 증빙 첨부로 보낼까요?",
  import_suggest_import: "보고서 가져오기",
  import_suggest_attach: "첨부로 보내기",
  // Info: (20260730 - Tzuhan) 連續未生成的節收成一列摘要;逐節整句佔位在 33 節全空時等於噪音
  sections_pending_summary:
    "위 {{count}}개 섹션은 아직 작성되지 않았습니다. 채팅에서 어느 섹션을 쓸지 알려주면 해당 위치에 표시됩니다.",
  section_placeholder:
    "이 섹션은 아직 생성되지 않았습니다. 왼쪽 대화에서 탄소 회계사에게 작성 의사를 알리면 내용이 실시간으로 여기에 표시됩니다.",
  report_status_draft:
    "보고서 상태: 초안 (내용은 AI가 섹션별로 생성하며 수동 검토 후 확정됩니다)",
  report_button: "보고서",
  close_report: "보고서 닫기",
  // Info: (20260730 - Tzuhan) 聊天面板放大/縮小(浮層 ↔ 右側 dock);行動版兩態皆全螢幕故不顯示
  panel_maximize: "사이드 패널로 확대",
  panel_restore: "플로팅 창으로 축소",
  close_chat: "채팅 창 닫기",
  progress_collapse: "진행률 위젯 접기",
  activity_ledger_title: "활동 데이터 장부",
  activity_ledger_pill: "활동 데이터 {{count}}건",
  activity_ledger_empty:
    "활동 데이터가 아직 없습니다. 채팅에서 전력 사용량, 연료 사용량 등을 알려주거나 청구서를 업로드하면 자동으로 기록됩니다.",
  activity_ledger_collapse: "활동 데이터 접기",
  activity_source: "출처: {{source}}",
  activity_source_chat: "출처: 대화",
  activity_co2e: "CO2e: {{value}} kg",
  activity_pending_factor:
    "⚠ 보류: 신뢰할 수 있는 계수가 없거나 단위 불일치로 추정하지 않습니다",
  activity_total_co2e: "총 배출량(대사 완료)",
  articulation_passed: "질량 보존 검증 통과",
  articulation_violation: "질량 보존 위반: {{material}}",
  articulation_equation:
    "기초+구매-기말 = {{expected}} {{unit}}, 장부상 소비 = {{actual}} {{unit}}, 차이 = {{gap}} {{unit}}",
  articulation_plausibility_warning:
    "수량이 합리적 범위를 초과했습니다. 확인해 주세요: {{source}}",
  report_table_detail_heading: "배출원 명세",
  report_table_col_source: "배출원",
  report_table_col_scope: "스코프",
  report_table_col_quantity: "활동 데이터",
  report_table_col_factor: "배출계수(출처)",
  report_table_col_co2e: "배출량 (kgCO2e)",
  report_table_subtotal_heading: "스코프별 소계",
  report_table_total: "총 배출량",
  report_table_insufficient:
    "(데이터 부족: 활동 데이터가 완성되면 시스템이 표를 자동 생성합니다)",
  report_table_frozen:
    "⚠ 질량 보존 검증에 통과하지 못해 데이터 표가 동결되었습니다. 대화에서 재고 차이를 해명하면 자동으로 생성됩니다.",
  report_table_pending_note:
    "참고: {count}건의 활동 데이터가 계수 대기 중으로 본 표에 포함되지 않았습니다.",
  report_table_col_provenance: "데이터 출처",
  report_table_provenance_computed: "시스템 계산",
  report_table_provenance_imported: "원문 전재",
  report_table_not_provided: "원문에 없음",
  report_table_imported_note:
    "참고: \u201c원문 전재\u201d로 표시된 행은 외부 보고서에 기재된 CO2e를 그대로 옮긴 것입니다. 본 시스템은 활동 데이터나 배출계수를 적용하지 않았으므로 해당 두 열은 \u201c원문에 없음\u201d으로 표시됩니다. 수치는 원문 합계와 대조 완료되었습니다(본 절의 대조 설명 참조).",
  data_table_refreshed:
    "데이터 표가 활동 데이터에 맞춰 갱신되었습니다. 해당 섹션을 다시 확인해 주세요",
  data_badge_reconciled: "데이터 섹션: 대사 완료 ✓ (수치는 결정론 엔진 산출)",
  data_badge_imported:
    "데이터 섹션: 원문 전재 항목 포함 (원문 합계와 대조 완료, 행별 출처 표시)",
  data_badge_violated: "데이터 섹션: 질량 보존 위반 ⚠ (표 동결, 해명 대기)",
  data_badge_insufficient:
    "데이터 섹션: 데이터 부족 (활동 데이터 완성 시 자동 생성)",
  chart_scope_pie_title: "스코프별 배출 비중 (kgCO2e)",
  chart_scope_bar_title: "스코프별 배출량 (kgCO2e)",
  chart_insufficient:
    "(데이터 부족: 활동 데이터가 완성되면 시스템이 차트를 자동 생성합니다)",
  chart_frozen:
    "⚠ 질량 보존 검증에 통과하지 못해 차트가 동결되었습니다. 대화에서 재고 차이를 해명하면 자동으로 생성됩니다.",
  chart_sankey_chat_node: "대화/첨부로 신고됨",
  chart_imported_sankey_title:
    "온실가스 배출 흐름(원문 전재, 지역 기준, tCO2e/년)",
  chart_imported_sankey_excluded: "그래프에 없는 항목(NA/NS 또는 0)",
  chart_imported_sankey_collapsed:
    "노드가 너무 많아 2단계(사업장 → 범주)로 축약했습니다",
  book_bind_pending_unlock:
    "장부 세션이 생성되었습니다. 암호화 대화를 잠금 해제하면 장부 바인딩이 완료됩니다(증빙 가져오기와 증거 체인은 바인딩 후 사용 가능)",
  book_bind_done:
    "장부 바인딩 완료. 활동 데이터 카드에서 증빙 데이터를 가져올 수 있습니다",
  book_bind_denied: "장부 바인딩 실패: 이 장부의 Editor 이상 권한이 필요합니다",
  book_bind_failed: "장부 바인딩에 실패했습니다. 다시 시도해 주세요",
  book_records_import_button: "장부에서 증빙 데이터 가져오기",
  book_records_importing:
    "장부에서 인식된 증빙 수준 배출 데이터를 가져오는 중…",
  book_records_imported:
    "장부에서 {{count}}건의 증빙 수준 활동 데이터를 가져왔습니다(중복은 자동 생략)",
  book_records_imported_with_skips:
    "{{count}}건 가져옴; {{skipped}}건은 GHG 스코프를 판정할 수 없어 생략했습니다. ESG 페이지에서 스코프 또는 활동 유형을 설정해 주세요",
  book_records_import_failed:
    "장부 가져오기에 실패했습니다. 다시 시도해 주세요",
  activity_open_evidence: "증빙 보기 ↗",
  evidence_chain_title:
    "배출 증거 체인(클릭하여 단계별 확장, 최소 단위는 단일 증빙)",
  evidence_chain_loading: "장부 증빙 데이터를 불러오는 중…",
  evidence_chain_empty: "이 장부에는 아직 인식된 배출 데이터가 없습니다",
  evidence_chain_error: "증빙 데이터 로드 실패(장부 열람 권한을 확인해 주세요)",
  evidence_chain_records: "증빙 {{count}}건",
  evidence_chain_formula:
    "{{quantity}} {{unit}} × {{factor}} = {{co2e}} kgCO2e",
  evidence_chain_total: "총 배출량",
  evidence_chain_verified: "검증됨",
  evidence_chain_unverified: "미검증",
  inventory_step_ORG_PROFILE: "단계: 기업 기본 정보(명칭/연도)",
  inventory_step_ORG_BOUNDARY: "단계: 조직 경계 설정",
  inventory_step_EMISSION_SOURCES: "단계: 배출원 식별",
  inventory_step_ACTIVITY_DATA: "단계: 활동 데이터 수집",
  inventory_step_EMISSION_FACTORS: "단계: 배출 계수 매핑",
  inventory_step_REVIEW: "단계: 대사 및 검토",
  inventory_step_COMPLETED: "인벤토리 데이터 수집 완료",
};
