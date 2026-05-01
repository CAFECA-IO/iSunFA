export const analysis = {
  tooltips: {
    industry_development: {
      title: "산업 발전 (Industry Development)",
      desc: "이 모듈의 분석 수준은 '거시 산업' 및 '공급망 메조'입니다. 따라서 키워드는 산업 부문, 하위 산업, 기술 동향 또는 특정 공급망을 중심으로 해야 합니다.",
      sectors_title: "주요 부문 (Sectors):",
      sectors_desc:
        "기술 (Technology), 헬스케어 (Healthcare), 금융 (Financials), 자유 소비재 (Consumer Discretionary), 에너지 (Energy).",
      sub_title: "하위 산업 / 공급망 (Sub-industries / Supply Chains):",
      sub_desc:
        "반도체 제조 (Semiconductor Manufacturing), IC 설계 (IC Design), EV 배터리 (EV Batteries), 클라우드 인프라 (Cloud Infrastructure), 생명 공학 (Biotechnology).",
      trends_title: "신흥 동향 / 개념 (Emerging Trends / Concepts):",
      trends_desc:
        "AI 서버 (AI Servers), 실리콘 포토닉스 (Silicon Photonics), 전고체 배터리 (Solid-State Batteries), 저궤도 위성 (Low Earth Orbit Satellites), ESG 친환경 에너지 (ESG Green Energy).",
    },
    smart_enterprise_rating: {
      title: "스마트 기업 평가 (Smart Enterprise Rating)",
      desc: "이 모듈의 분석 수준은 '미시적 개체'이며, 단일 회사의 재무 및 신용 상태 확인에 초점을 맞춥니다. 키워드는 정확한 회사 이름, 주식 종목 코드 또는 사업자 등록 번호여야 합니다.",
      us_tickers_title: "미국 주식 티커 / 회사 이름:",
      us_tickers_desc:
        "AAPL 또는 Apple (애플)\nNVDA 또는 NVIDIA (엔비디아)\nMSFT 또는 Microsoft (마이크로소프트)\nTSLA 또는 Tesla (테슬라)",
      tw_tickers_title: "대만 / ADR 주식 티커:",
      tw_tickers_desc:
        "TSM (TSMC ADR)\n2330 또는 Taiwan Semiconductor Manufacturing",
      fuzzy_title: "기업 속성 분류 (퍼지 검색 지원 시):",
      fuzzy_desc:
        "때로는 'Apple 공급망' 또는 'Tier 1 자동차 부품 공급업체'를 입력하여 일괄 평가를 위한 대상 회사를 필터링할 수도 있습니다.",
      analyst_view_title: "💡 애널리스트 관점:",
      analyst_view_desc:
        "실제로 경영진은 종종 여기에 '주요 경쟁사', '핵심 공급업체' 또는 '잠재적 인수 대상'의 티커를 입력하여 공급망 중단 위험을 모니터링하거나 동종 업계 회사와 재무 지표(예: ROE, 매출 총이익률)를 벤치마킹합니다.",
    },
    financial_product_rating: {
      title: "금융 상품 평가 (Financial Product Rating)",
      desc: "이 모듈은 거래 가능한 '금융 자산' 및 '투자 포트폴리오'를 대상으로 합니다. 키워드는 특정 상품 코드, 펀드 이름 또는 자산 클래스여야 합니다.",
      etf_title: "인덱스 펀드 / ETF (ETFs):",
      etf_desc:
        "SPY 또는 VOO (S&P 500 추종)\nQQQ (나스닥 100 추종)\nTLT (만기 20년 이상 미국 국채 ETF)",
      mutual_funds_title: "액티브 펀드 (Mutual Funds):",
      mutual_funds_desc:
        "특정 펀드 회사 제품 이름을 입력합니다 (예: Fidelity Global Technology Fund, AB Global High Yield).",
      bonds_title: "특정 채권 / 고정 수입 상품 (Bonds):",
      bonds_desc:
        "미국 10년물 국채 (US 10-Year Treasury), 특정 회사의 회사채 티커 (예: Apple 2030 만기 회사채), 투자 등급 (IG) 채권, 하이일드 채권 (High Yield Bonds / Junk Bonds).",
      derivatives_title: "파생 상품 또는 원자재 (Commodities / Derivatives):",
      derivatives_desc:
        "금 (Gold / GLD), 브렌트유 (Brent Crude), 비트코인 (Bitcoin / IBIT).",
      analyst_view_title: "💡 애널리스트 관점:",
      analyst_view_desc:
        "여기에 키워드를 입력하면 시스템은 일반적으로 샤프 비율 (Sharpe Ratio), 최대 손실폭 (Max Drawdown) 등의 정량적 위험 지표를 생성합니다. 이는 유휴 자금을 관리하거나 (Treasury Management) 헤지 포지션을 배치할 때 기업의 '재무 부서'에 매우 중요한 결정 요소입니다.",
    },
  },
  company_input: {
    label: "기업명 또는 사업자등록번호",
    placeholder: "전체 이름, 약어 또는 사업자등록번호 입력...",
    searching: "검색 중...",
    not_found:
      "기업을 찾을 수 없습니다. 더 완전한 이름이나 사업자등록번호를 입력해 보세요.",
    missing_tax_id_desc:
      "이 장부({{name}})에는 사업자등록번호가 설정되어 있지 않습니다. 내부 데이터 분석을 위해서는 사업자등록번호가 필요합니다. 여기서 설정해 주세요:",
  },
  title: "고문 분석",
  desc: "다분야 전문가의 기업 분석을 제공하여 경영진이 타당한 비즈니스 결정을 내리도록 지원합니다.",
  internal_analysis: "내부 데이터 분석",
  external_analysis: "외부 데이터 분석",
  addon_bookkeeper: "기장사 비자 추가",
  addon_cpa: "공인회계사 비자 추가",
  addon_third_party: "제3자 검증 기관 비자 추가",
  addons_title: "추가 항목 (복수 선택 가능)",
  history_reports: "이력 보고서",
  period_type: "시간 단위",
  select_year: "연도 선택",
  select_period: "기간 선택",
  select_account_book: "내 장부에서 선택",
  select_from_account_books: "장부 선택",
  country: "국가 선택",
  category: "카테고리 선택",
  keyword: "키워드",
  enter_keyword: "키워드 입력...",
  period: "기간",
  confirm_cost: "비용",
  generate: "보고서 생성",
  selected_period_desc: "{{value}} ({{type}})",
  insufficient_credits: {
    title: "크레딧 부족",
    message:
      "이 분석을 수행하기에 크레딧이 부족합니다. 크레딧을 구매하시겠습니까?",
    buy_btn: "크레딧 구매",
  },
  time_units: {
    yearly: "연간",
    seasonly: "분기별",
    monthly: "월별",
    weekly: "주별",
    daily: "일별",
    ac65: "AC65",
  },
  cost_hint: "비용: {{cost}} 크레딧",
  confirm_title: "분석 보고서 생성 확인",
  confirm_desc: "이 작업은 크레딧을 소비합니다. 아래 세부 정보를 확인하십시오:",
  confirm_balance: "결제 후 잔액",
  confirm_action: "결제 및 생성",
  countries: {
    tw: "대만",
    us: "미국",
    cn: "중국",
    jp: "일본",
    kr: "한국",
    eu: "유럽",
  },
  categories: {
    balance_sheet: "대차대조표",
    cash_flow: "현금흐름표",
    income_statement: "손익계산서",
    irsc: "지능형 기업 등급",
    financial_compliance: "재무 규정 준수",
    financial_health: "재무 건전성",
    market_trends: "시장 동향",
    industry_development: "산업 발전",
    financial_product_rating: "금융 상품 평가",
    carbon_health_check: "탄소 건강 검진",
    net_zero_emissions: "넷제로 배출",
    ai_consulting: "AI 컨설팅",
    journal_upload: "분개장 등록",
    certificate_analysis: "증빙 분석",
  },
  history: {
    title: "분석 기록",
    generated_at: "생성 일시",
    type: "유형",
    period: "기간",
    status: "상태",
    actions: "작업",
    view: "보기",
    download: "다운로드",
    status_types: {
      completed: "완료됨",
      processing: "처리 중",
      failed: "실패",
      paid: "결제 완료",
      executing: "실행 중",
    },
    badges: {
      external_link: "🔗 공개 링크",
      hidden_privacy: "🛡️ 금액 및 세부 정보 숨김",
      public_data: "⚠️ 기밀 금액 포함",
    },
    empty_title: "분석 보고서 없음",
    empty_description:
      "고급 AI 도구를 사용하여 첫 번째 재무 분석 보고서를 생성하고 여정을 시작하세요。",
    retry: "재시도",
    retry_confirm_title: "재시도 확인",
    retry_confirm_desc: "이 작업은 분석을 재시도합니다. 확인하시겠습니까?",
  },
  steps: {
    preparing: "거래 준비 중...",
    signing_payment: "결제 거래에 서명해 주세요",
    submitting_payment: "결제 거래를 블록체인에 제출 중...",
    payment_success: "결제 성공!",
    signing_analysis: "분석 요청에 서명해 주세요",
    analyzing: "분석 보고서 생성 중...",
  },
  success: {
    title: "분석 요청이 제출되었습니다",
    message:
      "요청이 온체인에 기록되었습니다. 보고서 생성에는 시간이 걸립니다. 기록 보고서 탭에서 진행 상황을 확인해 주세요.",
    view_tx: "트랜잭션 보기",
  },
  share: {
    button: "보고서 공유",
    modal_title: "공개 보고서 공유",
    modal_desc:
      '이 링크를 가진 사람은 누구나 이 보고서의 "익명화된 요약본"을 볼 수 있습니다. 기밀 금액 및 상세 공급업체 정보는 시스템에 의해 안전하게 숨겨집니다.',
    copy: "복사",
    copied: "클립보드에 복사되었습니다",
    revoke: "공유 링크 취소",
    revoked: "공유 링크가 성공적으로 취소되었습니다",
    done: "완료",
    public_badge: "공개 요약 보고서",
    shared_by: "{{name}} 님이 공유함",
    security_intercept: "보안 차단",
    security_desc:
      "이 유형의 보고서는 공개 공유가 지원되지 않거나 데이터 형식이 잘못되었습니다.",
    cta_title: "귀하의 기업을 위한 맞춤형 심층 분석 보고서를 생성하시겠습니까?",
    cta_desc:
      "iSunFA는 최첨단 AI 기술을 통해 탄소 건강 진단, 재무 등급 평가, 규정 준수 감사를 포함한 포괄적인 스마트 회계 솔루션을 제공합니다.",
    cta_button: "iSunFA 스마트 회계 알아보기",
  },
  share_settings: {
    title: "분석 보고서 공유 설정",
    privacy_warning_title:
      "주의: 기업 내부의 민감한 기밀 데이터가 포함되어 있습니다.",
    privacy_warning_desc:
      "외부에 공유하기 전에 적절한 권한을 얻었는지 반드시 확인하십시오. 영업 비밀 유출을 방지하기 위해 '익명화 및 금액 숨기기'를 선택하는 것을 강력히 권장합니다.",
    hide_data_title: "🛡️ 익명화 및 금액 숨기기 (권장)",
    hide_data_desc:
      "모든 특정 전표, 공급업체 세부 정보 및 절대 금액의 크기를 숨깁니다. AI가 생성한 관점 구조 및 위험 평가 결론만 공유합니다. 영업 비밀을 최대한 보호할 수 있습니다.",
    show_data_title: "⚠️ 기밀 금액을 포함하여 전체 공개",
    show_data_desc:
      "모든 회계 과목, 절대 잔액 및 관련 분석이 상세히 공개됩니다. 링크가 있는 사람은 누구나 완전한 내부 운영 데이터를 볼 수 있습니다.",
    confirm: "확인 및 링크 생성",
  },
};
