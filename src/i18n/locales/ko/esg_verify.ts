export const esgVerify = {
  title: "탄소 인벤토리",
  preview: "미리보기",
  ai_confidence: "AI 신뢰도",
  no_image: "미리보기 이미지 없음",
  form: {
    date: "날짜",
    scope: "스코프",
    scope_1: "스코프 1 (직접 배출)",
    scope_2: "스코프 2 (간접 배출)",
    scope_3: "스코프 3 (기타 간접 배출)",
    activity_type: "활동 유형",
    activity_object: "활동 대상",
    vendor: "공급업체 / 대상",
    raw_data: "원시 활동 데이터",
    unit: "단위",
    emissions: "계산된 배출량 (kgCO2e)",
    intensity: "강도 분류",
    intensity_low: "저강도",
    intensity_medium: "중강도",
    intensity_high: "고강도",
  },
  emissions: {
    title: "배출량 계산",
    raw_data: "원시 데이터",
    unit: "단위",
    total: "총 배출량",
    intensity: "배출 강도 등급",
    coefficient: "계수",
  },
  coefficient: "계수",
  messages: {
    fetch_error: "전표를 가져오지 못했습니다",
    deleted_warning: "삭제된 전표는 편집할 수 없습니다",
  },
  sections: {
    preview: "영수증 미리보기",
    basic_info: "기본 정보",
    accounting_entries: "회계 분개",
  },
  validation: {
    empty_fields: "날짜 또는 유형이 비어 있습니다",
    unbalanced: "대차가 일치하지 않습니다",
    empty_rows: "분개가 비어 있습니다",
    incomplete_row: "비어 있는 계정이나 금액이 있습니다",
  },
  balance_check: {
    title: "대차 대조 확인",
    balanced: "일치함",
    unbalanced: "불일치",
  },
  actions: {
    cancel_edit: "편집 취소",
    save_only: "수정 내용만 저장",
  },
  close_confirm: {
    title: "저장하지 않고 닫으시겠습니까?",
    message: "저장되지 않은 변경 사항이 손실됩니다. 계속하시겠습니까?",
    confirm: "나가기",
  },
  save_confirm: {
    title: "저장하시겠습니까?",
    message:
      "수행한 ESG 기록 확인 변경 사항을 저장하려고 합니다. 데이터가 올바른지 확인하십시오.",
    confirm: "저장 확인",
    success: "검증 데이터가 저장되었습니다",
  },
  esg_industry_benchmarks: {
    spectrum: {
      extremely_high: "극도로 높은 탄소",
      very_high: "매우 높은 탄소",
      high: "고탄소",
      mid_high: "중고탄소",
      medium: "중간",
      mid_low: "중저탄소",
      extremely_low: "극도로 낮은 탄소",
    },
    industry_1: {
      name: "석유화학 공업",
      desc: "높음: 폼모사 페트로케미칼 (3,650 kg) 차이 이유: 기초 나프타 분해 및 자가 석탄 발전소로 인한 불가피한 막대한 화학 물질 누출 및 화석 연료 연소.",
    },
    industry_2: {
      name: "시멘트 공업",
      desc: "높음: 아시아 시멘트 (2,883 kg) 차이 이유: 석회석의 고온 소성(직접 CO2 방출)이 큰 비율을 차지하며, 부동산 침체로 인한 수익 분모 축소에 민감함.",
    },
    industry_3: {
      name: "전력 및 에너지",
      desc: "높음: 마일리아오 발전 (2,657 kg) / 낮음: 대만 전력 (1,068 kg) 차이 이유: 마일리아오는 100% 석탄 발전; 대만 전력은 원자력, 수력, 천연가스 등을 통해 탄소 집약도를 크게 희석함.",
    },
    industry_4: {
      name: "철강 공업",
      desc: "높음: 차이나 스틸 (520 kg) / 낮음: 텅호 스틸 (126 kg) 차이 이유: 전통 고로는 석탄 환원이 필요하지만 전기로는 재활용 고철을 전력으로 용해하여 환원 탄소를 70% 이상 절감함.",
    },
    industry_5: {
      name: "해운 및 운송업",
      desc: "높음: 원양 컨테이너 해운 / 낮음: 육상 운송 및 고속철도 차이 이유: 중유를 태우는 거대 선박은 스코프 1의 주요 배출원이며 운임 시세의 영향을 크게 받음; 철도는 전철화율이 높아 우수함.",
    },
    industry_6: {
      name: "통신 네트워크업",
      desc: "높음: 청화 텔레콤 (271.8 kg) 차이 이유: '공장이 없으면 저탄소'라는 신화를 깸. 24시간 가동되는 5G 기지국과 데이터 센터(IDC) 냉각기는 엄청난 전력 소비 괴물임.",
    },
    industry_7: {
      name: "섬유 및 화학 섬유",
      desc: "낮음: 원동 신세기 (59.2 kg) 차이 이유: 전통 염색 공장은 에너지와 물 소비가 극심하나, 페트병 재활용(R-PET) 기술과 다각적 수익으로 중공업의 숙명을 뒤집음.",
    },
    industry_8: {
      name: "반도체 제조",
      desc: "높음: TSMC (50.1 kg) 차이 이유: EUV 장비 및 클린룸의 막대한 전력 소비(스코프 2)가 배출량을 늘리지만, 초고가 칩 스펙과 방대한 친환경 전력 구매로 집약도를 낮춤.",
    },
    industry_9: {
      name: "소매 및 전자상거래",
      desc: "높음: 세븐일레븐 (37.6 kg) / 낮음: 모모 (약 23 kg) 차이 이유: 오프라인 매장은 24시간 에어컨과 개방형 냉장고로 제한됨; 이커머스는 매장이 없으나 물류 차량과 자동화 창고 배출을 부담함.",
    },
    industry_10: {
      name: "지식 및 금융 (IC설계/SW/금융)",
      desc: "높음: 은행 (약 1.5 kg) / 낮음: 미디어텍 (1.86 kg) 차이 이유: 두뇌와 자본에 의존. 미디어텍은 제조를 외주화함; 금융업은 사무실 전력만 쓰나, 매출 탄소 비율에 계산되지 않은 막대한 '금융 배출량'이 숨어 있음.",
    },
  },
};
