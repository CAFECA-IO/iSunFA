export const transportationCarbonFootprintCalculator = {
  title: "물류 탄소 발자국",
  default_ai_input:
    "타이베이 국부기념관에서 맨체스터 박물관으로 5000kg의 석판 운송",
  analysis_failed: "분석 실패",
  error: {
    missing_input:
      "운송 경로 설명을 입력하거나 고급 설정을 펼쳐서 전체 매개변수를 수동으로 입력하세요.",
    ai_parse_failed: "AI 구문 분석 실패",
    missing_params:
      "전체 매개변수를 가져올 수 없습니다. AI 분석 결과를 확인하거나 수동으로 입력하세요.",
  },
  payment: {
    fee_name: "탄소 발자국 분석 비용",
    modal_label: "물류 탄소 발자국 분석",
    modal_value: "물류 분석",
  },
  pdf: {
    generating_title: "고품질 PDF 생성 중...",
    generating_desc: "몇 초 정도 걸릴 수 있습니다. 잠시 기다려주세요",
    generating_title_large: "고품질 PDF 보고서를 생성 중입니다",
    generating_desc_large_1:
      "시스템이 지도 경로와 상세 분석 데이터를 추출하고 있습니다...",
    generating_desc_large_2:
      "고품질 렌더링 콘텐츠가 포함되어 있으므로 몇 초 정도 걸릴 수 있습니다. 잠시 기다려 주십시오.",
    error_failed: "PDF 생성 실패, 오류 메시지: ",
    error_unknown: "알 수 없는 오류",
    mode_land: "육상 운송",
    mode_sea: "해상 복합 운송",
    mode_air: "항공 복합 운송",
    origin: "출발지",
    dest: "도착지",
    footer: "페이지 {{current}} / {{total}} • 경로: {{origin}} ➝ {{dest}}",
    section_analysis: "전용 섹션 분석",
    weight_label: "총 중량: {{weight}} KG",
    watermark: "iSunFA CONFIDENTIAL",
    export_id_label: "내보내기 ID",
    plan_code_label: "플랜 코드",
  },
  ui: {
    title: "물류 탄소 발자국",
    description:
      "AI로 운송 경로를 지능적으로 분석하여 육상, 해상 및 항공 구간을 자동으로 나누고 IPCC 표준에 따라 마일리지 및 탄소 배출량을 추정합니다.",
    not_generated: "분석 보고서가 아직 생성되지 않았습니다",
    config_title: "매개변수 구성 및 분석 제어",
    route_description: "운송 경로 설명",
    route_placeholder: "예: 타이베이시에서 미국 뉴욕으로 화물 운송",
    advanced_config: "고급 매개변수 수동 구성 (선택 사항)",
    origin_lat: "출발지 위도",
    origin_lng: "출발지 경도",
    dest_lat: "도착지 위도",
    dest_lng: "도착지 경도",
    total_weight: "총 중량 (KG)",
    land_route: "육상 운송 계획",
    sea_route: "해상 복합 운송",
    air_route: "항공 복합 운송",
    exporting: "내보내는 중...",
    export_report: "보고서 내보내기",
    calculating: "계산 중...",
    generate_report: "분석 보고서 생성",
    login_to_generate: "분석 보고서를 생성하려면 로그인하십시오",
    login_to_use: "물류 탄소 발자국 기능을 사용하려면 먼저 로그인하십시오",
    tab_analysis: "탄소 회계",
    tab_history: "과거 보고서",
    tab_mileage: "마일리지",
    empty_plan:
      "이 기록 데이터에는 상세 경로 플랜이 없습니다. 보고서를 다시 생성해주세요.",
    auto: "자동 판별",
  },
  history: {
    title: "분석 이력",
  },
  plan_section: {
    mode_land: "육상 운송",
    mode_sea: "해상 운송",
    mode_air: "항공 운송",
    title_custom: "맞춤형 다중 운송 경로",
    title_sea_land_air: "해상-육상-항공 복합운송 플랜",
    transit_airport: "환승 공항",
    title_land: "육상 운송 계획",
    title_sea: "해상 운송 계획",
    title_air: "항공 운송 계획",
    origin_port: "출발 항구",
    dest_port: "도착 항구",
    origin_airport: "출발 공항",
    dest_airport: "도착 공항",
    origin: "출발지",
    dest: "도착지",
    total_emissions_est: "{{title}} 총 탄소 배출량 추정치",
    total_weight: "총 중량",
    metric_ton: "톤",
    coefficient_disclosure: "탄소 배출 계수 및 공식 공개",
    formula: "공식: 총 주행 거리(km) × (중량(kg)/1000) × 배출 계수",
    source: "데이터 출처",
    section_analysis: "{{title}} 구간 분석",
    est_mileage: "예상 주행 거리:",
    emission_coefficient: "배출 계수:",
    carbon_emissions: "탄소 배출량",
    fallback_estimate_badge: "추정치",
    fallback_estimate_hint:
      "도로 네트워크 데이터가 없는 지역으로, 직선거리 ×1.2로 추정",
  },
  mileage_calculator: {
    title_paste: "AI 분석을 위해 텍스트 붙여넣기",
    placeholder:
      "출발지와 목적지가 포함된 물류 텍스트를 붙여넣으세요. 예: '타이베이에서 출발하여 가오슝으로 배송'...",
    btn_ai_parse: "AI 자동 분석",
    title_manual: "수동 입력 및 분석 목록",
    origin_desc: "출발지 설명",
    dest_desc: "목적지 설명",
    btn_add: "목록에 추가",
    col_id: "ID",
    col_origin: "출발지",
    col_dest: "목적지",
    col_mileage: "마일리지 (KM)",
    col_status: "상태",
    col_action: "작업",
    btn_calculate: "마일리지 계산 시작",
    btn_delete: "삭제",
    err_required: "출발지와 목적지 모두 필수입니다",
    err_calc_failed: "계산에 실패했습니다. 나중에 다시 시도해 주세요.",
    err_parse_failed: "분석 실패",
    err_no_valid_routes: "파일에서 유효한 출발지/도착지를 분석할 수 없습니다.",
    err_waypoints_incomplete_title: "경유지 데이터가 불완전합니다",
    err_waypoints_incomplete_msg:
      "일부 경유지에 위도/경도가 설정되지 않았습니다. 자동 분석을 클릭하거나 수동으로 위도/경도를 입력한 후 다시 시도해주세요.",
    label_waypoints_optional: "경유지 (선택 사항)",
    btn_setup: "설정...",
    col_waypoints: "경유지 설정",
    waypoint_modal_title: "경유지 설정",
    waypoint_modal_empty: "경유지가 없습니다. 아래 버튼을 클릭하여 추가하세요.",
    waypoint_modal_placeholder:
      "장소를 입력하세요 (예: Singapore 또는 Port of Rotterdam)",
    waypoint_modal_auto_parse: "위도/경도 자동 분석",
    waypoint_modal_auto_parse_short: "자동 분석",
    waypoint_modal_lat: "위도 (Latitude)",
    waypoint_modal_lng: "경도 (Longitude)",
    waypoint_modal_add: "경유지 추가",
    waypoint_modal_confirm: "확인",
    empty_list:
      "현재 목록이 없습니다. 추가하거나 텍스트를 붙여넣어 분석하세요.",
    col_mode: "운송 모드",
    mode_auto: "AI 자동 판별",
    mode_LAND: "순수 육로 운송",
    mode_AIR_LAND: "항공-육로 복합 운송",
    mode_SEA_LAND: "해상-육로 복합 운송",
    mode_SEA_LAND_AIR: "해상-육로-항공 복합 운송",
    recalculate: "다시 계산하기",
    short_land: "육로",
    short_sea: "해상",
    short_air: "항공",
    csv_total_dist: "총 거리(km)",
    csv_land_dist: "육상 운송(km)",
    csv_sea_dist: "해상 운송(km)",
    csv_air_dist: "항공 운송(km)",
    csv_pdf_file: "PDF 파일",
  },
  map: {
    maptiler_key_not_set: "MapTiler 키가 설정되지 않았습니다!",
    origin: "출발지",
    dest: "도착지",
    label: "🟢 ESG 물류 탄소 발자국 추적 (Powered by MapLibre)",
  },
  // Info: (20260724 - Tzuhan) 내보내기 선택 모달(요구사항 2)
  methodology: {
    title: "계산 방식 설명",
    // Info: (20260802 - Luphia) 內文暫以英文回退：韓文審計用詞我無法驗證準確度，
    // Info: (20260802 - Luphia) 譯錯的方法論說明比沒有說明更糟。結構與 token 已就位，翻譯可直接替換此陣列。
    sections: [
      {
        id: "scope",
        title: "1. What this tool does and does not calculate",
        paragraphs: [
          "This tool estimates greenhouse gas emissions from the transport stage of moving goods from origin to destination, expressed as carbon dioxide equivalent (CO₂e). The scope covers the transport itself only.",
          "**Excluded**: warehousing, loading and unloading, packaging, production and disposal of the goods themselves, and manufacture and maintenance of the vehicles. The result is therefore not the full life-cycle carbon footprint of the shipment and cannot on its own support a product carbon footprint claim.",
        ],
      },
      {
        id: "factors",
        title: "2. Emission factors and sources",
        paragraphs: [
          "Factors are expressed in {{factorUnit}} — emissions per tonne of goods carried one kilometre.",
        ],
        items: [
          {
            term: "Road (LAND)",
            detail: "{{landFactor}} — {{landSource}}",
          },
          {
            term: "Sea (SEA)",
            detail: "{{seaFactor}} — {{seaSource}}",
          },
          {
            term: "Air (AIR)",
            detail: "{{airFactor}} — {{airSource}}",
          },
          {
            term: "Single source of truth",
            detail:
              "The three factors are defined once as constants and referenced by the calculation, the screen, the CSV and the PDF alike; no second set of values exists. Factors are not adjusted for cargo type, vehicle tonnage, load factor or empty return legs — one route uses a single factor per mode.",
          },
        ],
      },
      {
        id: "datasets",
        title: "3. Databases and geospatial data",
        items: [
          {
            term: "Airports",
            detail:
              "A static dataset of {{airportsTotal}} records with name, IATA code, size and coordinates. Of these, {{airportsSelectable}} carry an IATA code and are eligible as transfer airports (see section 4).",
          },
          {
            term: "Seaports",
            detail:
              "A static dataset of {{seaports}} records with a UN/LOCODE-style identifier, name, country and coordinates.",
          },
          {
            term: "Shipping lanes",
            detail:
              "Line geometry for global merchant shipping lanes, {{shippingLaneFeatures}} segments, used for sea route planning (see section 6).",
          },
          {
            term: "Road network",
            detail:
              "A self-hosted OSRM routing service using an OpenStreetMap regional extract with the default car profile. **Only the Taiwan extract is loaded**, so road legs outside Taiwan are always estimated (see sections 5 and 11).",
          },
          {
            term: "Base map",
            detail:
              "Route maps use MapTiler vector tile styles rendered with MapLibre. The base map is for visual reference only and takes no part in any distance or emission calculation.",
          },
        ],
      },
      {
        id: "nodes",
        title: "4. How transfer airports and seaports are selected",
        paragraphs: [
          "The origin and destination each independently select the nearest airport and seaport, measured by great-circle distance (mean Earth radius {{earthRadiusKm}} km), comparing every record in the dataset and taking the minimum.",
        ],
        items: [
          {
            term: "Airport eligibility",
            detail:
              "An IATA code is required. This excludes military air bases, polar skiways, duplicate records and other sites that cannot carry freight.",
          },
          {
            term: "Seaport eligibility",
            detail:
              "None — the dataset contains no field indicating freight capability, so only the nearest can be taken.",
          },
          {
            term: "Not considered",
            detail:
              "Whether the site actually handles freight, whether direct services exist, and whether it lies in the same country or landmass as the origin are not assessed; customs, curfews and runway length are likewise ignored. The selected node is the geographically nearest, not necessarily the one that would be used in practice.",
          },
        ],
      },
      {
        id: "land",
        title: "5. Road distance",
        items: [
          {
            term: "Primary method",
            detail:
              "A driving route is requested from the self-hosted OSRM service and its reported route length is used. Requests time out after {{osrmTimeoutSeconds}} seconds.",
          },
          {
            term: "Grounds for rejecting a route",
            detail:
              "If the driving distance is below {{osrmMinRatioPercent}}% of the straight-line distance, or is zero while the two points differ, the coordinates are judged to have snapped to the edge of the data and the route is not used. Routes containing a ferry leg are also rejected — ferry emissions differ from road freight, so applying the road factor would distort the result.",
          },
          {
            term: "When no route is available",
            detail:
              "The great-circle distance is multiplied by a tortuosity factor of {{landTortuosity}} and marked est. in the report. The factor reflects how far real roads typically deviate from a straight line and is not calibrated per route.",
          },
        ],
      },
      {
        id: "sea",
        title: "6. Sea distance",
        paragraphs: [
          "Sea legs **do not** use port-to-port great-circle distance, nor a published port distance table; a route is actually planned over the shipping lane geometry.",
        ],
        items: [
          {
            term: "Route planning",
            detail:
              "Lane segment vertices form a graph weighted by great-circle distance between adjacent vertices; the largest connected component is taken and the shortest path found with A*. Port coordinates are first snapped to the nearest lane node.",
          },
          {
            term: "How the distance is composed",
            detail:
              "Great-circle distance from the origin to the first lane node, plus the sum of great-circle distances along the lane path, plus the distance from the final node to the destination.",
          },
          {
            term: "When no route can be planned",
            detail:
              "The great-circle distance is multiplied by a tortuosity factor of {{seaTortuosity}} and marked est. The sea factor exceeds the road factor because lanes are constrained by landmasses and straits, producing greater deviation.",
          },
        ],
      },
      {
        id: "air",
        title: "7. Air distance",
        items: [
          {
            term: "Method",
            detail:
              "The great-circle distance between the two airports (mean Earth radius {{earthRadiusKm}} km) — the shortest path over the sphere.",
          },
          {
            term: "Not added",
            detail:
              "No allowance is made for airway routing, take-off and climb, holding patterns or diversions, and no radiative forcing index (RFI) uplift is applied for high-altitude emissions. Air leg distance is therefore a lower bound on actual flight distance.",
          },
          {
            term: "The arc on the map",
            detail:
              "The air arc drawn in the report interpolates the great-circle path for display only and does not affect the distance figure.",
          },
        ],
      },
      {
        id: "plans",
        title: "8. How transport plans are composed",
        items: [
          {
            term: "Road only",
            detail: "Origin →(road)→ destination, a single leg.",
          },
          {
            term: "Sea multimodal",
            detail:
              "Origin →(road)→ export port →(sea)→ import port →(road)→ destination, three legs.",
          },
          {
            term: "Air multimodal",
            detail:
              "Origin →(road)→ export airport →(air)→ import airport →(road)→ destination, three legs.",
          },
          {
            term: "Sea-land-air multimodal",
            detail:
              "Origin →(road)→ export port →(sea)→ import port →(road)→ transfer airport →(air)→ destination airport →(road)→ destination, five legs. The transfer airport is the one nearest the import port.",
          },
          {
            term: "Custom multimodal",
            detail:
              "Built from user-specified waypoints. Each pair is attempted by road first; where no real route exists it becomes road to the nearest port, then sea, then road onward.",
          },
          {
            term: "Drayage counts as road",
            detail:
              "Airport and seaport access legs have no separate algorithm; they use the same route calculation and the same road factor as a road-only plan.",
          },
        ],
      },
      {
        id: "applicability",
        title: "9. How plan applicability is decided",
        paragraphs: [
          "Inapplicable plans produce no report rather than a report full of zeros. The decision is a pure function and the same rules run on both client and server.",
        ],
        items: [
          {
            term: "Sea",
            detail:
              "The port-to-port distance must be at least {{minSeaKm}} km — below that it is treated as the same or an adjacent port — and the sea leg must plan successfully.",
          },
          {
            term: "Air",
            detail:
              "The airport-to-airport distance must be at least {{minAirKm}} km — below that commercial air freight is not meaningful — and the air leg must plan successfully.",
          },
          {
            term: "Road wins, multimodal is dropped",
            detail:
              "If a genuinely drivable road route exists and is no longer than a multimodal plan's total distance, that multimodal plan is treated as inapplicable — there is no reason to transship for a longer journey.",
          },
          {
            term: 'What \\"genuinely drivable\\" means',
            detail:
              "The route planned successfully, is not an estimate, and returned geometry with more than two coordinates. Geometry with only the two endpoints is a straight line, not a real route.",
          },
        ],
      },
      {
        id: "formula",
        title: "10. Formula and numeric precision",
        items: [
          {
            term: "Per-leg emissions",
            detail:
              "Leg CO₂e (kg) = distance (km) × weight (tonnes) × the factor for that mode. Weight is converted from the entered kilograms by dividing by 1000.",
          },
          {
            term: "Plan total",
            detail:
              "Produced by the backend calculation engine, not by summing the printed rows. Both derive from the same per-leg values, but the total is computed at unrounded precision, so summing the rows may differ from the total by a few hundredths. The report discloses that difference and its cause.",
          },
          {
            term: "Precision handling",
            detail:
              "All multiplication and division use decimal high-precision arithmetic rather than native floating point, and results are passed as strings to avoid formatting error.",
          },
          {
            term: "Displayed precision",
            detail:
              "Distances and emissions in the report are rounded to two decimal places. Full precision is in the summary.csv exported alongside.",
          },
        ],
      },
      {
        id: "limitations",
        title: "11. Known limitations",
        paragraphs: [
          "The following limitations affect how far the figures can be relied upon, and are listed so that users can judge whether this report supports their intended use.",
        ],
        items: [
          {
            term: "The road network covers Taiwan only",
            detail:
              "Road legs outside Taiwan cannot obtain a real route and are always estimated from straight-line distance times a tortuosity factor. Where a route's emissions are dominated by road transport abroad, the estimation error enters the result directly. The report discloses how many legs are estimated and their share.",
          },
          {
            term: "Some military sites can still be selected",
            detail:
              "The IATA requirement excludes most military air bases, but joint civil-military sites and military fields that hold an IATA code still pass. Name matching is deliberately not used as a further filter, because guessing purpose from a string would wrongly exclude legitimate joint-use airports.",
          },
          {
            term: "The nearest airport is not necessarily a freight airport",
            detail:
              "An IATA code proves commercial operation, not freight capability. In practice a business-aviation airport may be selected while the genuine freight hub, being further away, is not. Correcting this needs freight throughput or freight route data, which the dataset does not contain.",
          },
          {
            term: "Seaports cannot be filtered by freight capability",
            detail:
              "The seaport dataset has no size, throughput or cargo-type field, so only the nearest can be taken; fishing harbours and ports without container facilities cannot be excluded.",
          },
          {
            term: "Sea and air factors are not Taiwan data",
            detail:
              "The default factor set comes from the MOENV product carbon footprint database, but the sea and air factors it hosts have a **production region of the United States**, announced in 2016 and 2017 respectively; only the road factor is Taiwan, announced 2022. The air factor is moreover a single value with no haul-length breakdown, unlike some international databases which separate domestic, short-haul and long-haul. The report always states the region and year of each factor so that reviewers can judge its representativeness.",
          },
          {
            term: "Changing factor set changes the result substantially",
            detail:
              "The same route can differ by nearly a factor of two between factor sets — around 93% for routes dominated by long-haul air and around 16% for road-only routes. The report header labels the factor set version so that outputs from different batches can be told apart.",
          },
          {
            term: "Air distance is a lower bound",
            detail:
              "Without allowances for routing, climb and radiative forcing, both the actual flight distance and the climate impact exceed the figures in this report.",
          },
          {
            term: "Sea estimates still count toward the result",
            detail:
              "When sea route planning fails, the estimate is still included in the emission calculation and in the applicability decision; when road routing fails, the road-only plan is instead marked unusable. The two are handled differently.",
          },
          {
            term: "The shipping lane data version is not recorded",
            detail:
              "The lane geometry is supplied as a static file and the system records no issuing body, release version or licence terms, so the data's currency cannot be traced.",
          },
        ],
      },
    ],
  },
  export_options: {
    title: "내보낼 플랜 선택",
    description:
      "내보낼 플랜 유형을 선택하세요. 이 경로에 적용 가능한 플랜만 표시됩니다.",
    plan_land: "육상 운송만",
    plan_sea: "해상 포함（해륙 복합운송）",
    plan_air: "항공 포함（공륙 복합운송）",
    plan_custom: "사용자 지정 복합운송",
    plan_seaLandAir: "해상-육상-항공 복합운송(육→해→육→공→육)",
    include_co2e: "CO2e 계산",
    include_co2e_hint:
      "선택을 해제하면 경로와 거리만 내보냅니다. PDF와 CSV에 배출량 수치가 표시되지 않습니다.",
    factor_set: "배출계수 세트",
    factor_set_hint:
      "다른 배출계수를 사용하려면 위 항목의 체크를 해제하세요. 내보낸 CSV에 구간별 거리와 중량이 들어 있어 직접 적용할 수 있습니다.",
    split_hint: "각 플랜은 개별 PDF로 출력되며, 여러 파일은 ZIP으로 묶입니다.",
    confirm: "내보내기",
    progress: "보고서 생성 중 {{current}} / {{total}}...",
  },
};
