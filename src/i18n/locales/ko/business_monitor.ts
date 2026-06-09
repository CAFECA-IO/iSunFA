export const businessMonitor = {
  title: "기업 관측 대시보드",
  subtitle:
    "대만 상장 기업의 재무 데이터를 검색하고 공식 주주총회 연례 보고서를 다운로드하며 AI 어시스턴트로부터 심층 분석을 받으세요",
  filter: {
    ai_consult: "AI 상담",
    ai_placeholder: "예: 폭스콘의 이직률은 얼마인가요?",
    select_company: "기업 선택",
    select_industry: "산업 분류 선택",
    all_industries: "모든 산업",
    industries: {
      semiconductor: "반도체 업종",
      computer_peripherals: "컴퓨터 및 주변기기 업종",
      optoelectronics: "광전 업종",
      communications: "통신 및 네트워크 업종",
      electronic_components: "전자부품 업종",
    },
    select_year_range: "대상 기간 선택",
    all_years: "모든 연도",
    clear_filters: "검색 조건 초기화",
    search_reports: "보고서 검색",
  },
  ai_section: {
    title: "AI 답변",
    data_sources: "출처:",
    searching: "AI가 문맥을 분석하고 관련 보고서를 검색하는 중입니다...",
    no_answer:
      "기존 보고서에서 질문에 일치하는 답변이나 출처를 찾을 수 없습니다.",
  },
  reports: {
    total_count: "총 {{count}}건의 보고서를 찾았습니다",
    loading: "데이터를 불러오는 중...",
    no_reports:
      "조건에 맞는 보고서를 찾을 수 없습니다. 검색 조건을 조정해 주세요.",
    item: {
      verified_by_third_party: "제3자 검증 완료",
      report_year: "보고서 연도:",
      disclosure_period: "공시 기간:",
      industry: "산업 분류:",
      capital_range: "자본금 범위:",
      verification_agency: "검증 기관:",
      verification_standards: "적용 검증 기준:",
      assurance_agency: "확신 기관:",
      assurance_standards: "적용 확신 기준:",
      view_details: "상세 보기",
      downloading: "다운로드 중...",
      re_download: "재다운로드",
      download_original: "원본 보고서 다운로드",
      download_progress: "다운로드 진행률",
      toast_download_success: "{{company}} - 원본 보고서 다운로드 완료",
      toast_download_error:
        "{{company}} - 다운로드 실패. 잠시 후 다시 시도해 주세요",
    },
  },
};
