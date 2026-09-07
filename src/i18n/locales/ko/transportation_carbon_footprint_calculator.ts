import { GUIDE_FIGURE_ID } from "@/constants/logistics_guide";

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
    load_history_failed:
      "과거 보고서를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.",
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
    intro:
      "아래 각 절에서 모든 수치가 어디서 나오는지 설명합니다. 결론을 어디까지 신뢰할 수 있는지만 알고 싶다면 제11절 「알려진 한계」로 바로 이동하세요.",
    limits_title: "이 수치를 쓰기 전에 반드시 읽어 주세요",
    read_full: "계산 방식 전문 보기",
    // Info: (20260820 - Luphia) 限制摘要同 sections 以英文回退：韓文審計用詞我無法驗證準確度，
    // Info: (20260820 - Luphia) 譯錯的限制摘要比沒有摘要更糟。用詞與 sections 一致，翻譯可一併替換。
    highlights: [
      "The scope covers **transport only**: no warehousing, loading and unloading, or packaging, and nothing from the production or disposal of the goods themselves. The result is therefore not the full life-cycle carbon footprint of the shipment.",
      "The road network **currently covers Taiwan only**: road legs outside Taiwan are estimated from straight-line distance times a tortuosity factor of {{landTortuosity}} and marked Estimated in the report. Where a route's emissions are dominated by road transport abroad, the estimation error enters the result directly.",
      "The sea and air factors have a **production region of the United States** (announced 2016 and 2017), and the air distance excludes routing detours, climb and high-altitude radiative forcing — both the actual flight distance and the climate impact exceed the figures reported here.",
    ],
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
              "The great-circle distance is multiplied by a tortuosity factor of {{landTortuosity}} and marked 「추정치」 in the report. The factor reflects how far real roads typically deviate from a straight line and is not calibrated per route.",
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
              "The great-circle distance is multiplied by a tortuosity factor of {{seaTortuosity}} and marked 「추정치」. The sea factor exceeds the road factor because lanes are constrained by landmasses and straits, producing greater deviation.",
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
  guide: {
    title: "사용 안내",
    subtitle:
      "한 문장의 경로 설명에서 납품 가능한 PDF와 CSV까지, 전체 흐름을 정리했습니다. 이어서 각 수치의 계산 방식과 알려진 한계가 나옵니다.",
    nav_title: "이 페이지 목차",
    figure_note:
      "그림은 화면 예시도입니다. 실제 화면이 사용하는 컴포넌트 스타일과 문자열로 다시 그렸기 때문에 표시 언어와 라이트／다크 테마에 따라 바뀌며, 특정 버전의 화면 캡처가 아닙니다. 그림의 번호는 그림 아래 설명과 대응합니다.",
    figure_caption: "예시도: {{title}}",
    start_cta: "탄소 회계 시작",
    empty_cta: "처음이신가요? 사용 안내 보기",
    chapters: [
      {
        id: "overview",
        title: "1. 네 개 탭의 역할",
        summary:
          "먼저 위치를 파악하세요. 이 도구는 서로 다른 네 가지 작업을 네 개 탭으로 나눠 두었고, 탭을 잘못 고르는 것이 가장 흔한 막힘 지점입니다.",
        steps: [
          {
            id: "overview_tabs",
            title: "탭별 분담",
            body: "탄소 회계는 「한 경로의 배출량」, 마일리지는 「여러 경로의 거리」, 과거 보고서는 완료된 분석이며, 사용 안내는 이 페이지입니다.",
            figure: GUIDE_FIGURE_ID.TABS,
            callouts: [
              "**탄소 회계**: 출발지·도착지·중량을 입력하면 지도, 구간별 마일리지, 배출량이 담긴 완전한 보고서가 나오고 PDF로 내보낼 수 있습니다. 생성마다 {{analysisCost}} 크레딧이 차감됩니다.",
              "**마일리지**: 텍스트 붙여넣기 또는 Excel／CSV 가져오기로 여러 경로를 한 번에 처리하며 거리만 산출합니다. 어떤 경로를 본격적으로 핵산할지 고르기 전 점검용으로 적합합니다.",
              "**과거 보고서**: 지난 분석을 나열합니다. 재계산도 추가 크레딧도 없이 다시 열어 보거나 내보낼 수 있습니다.",
              "**사용 안내**: 이 페이지입니다. 탭을 바꿔도 이미 입력한 내용은 지워지지 않습니다.",
            ],
            notes: [
              "현재 탭은 주소의 ?tab= 파라미터에 담기므로, 특정 탭의 링크를 그대로 동료에게 보낼 수 있습니다.",
            ],
          },
        ],
      },
      {
        id: "analysis",
        title: "2. 탄소 회계: 한 문장에서 한 편의 보고서까지",
        summary: "한 경로, 한 보고서, 모두 네 단계입니다.",
        steps: [
          {
            id: "analysis_describe",
            title: "경로를 설명하거나 좌표를 직접 입력",
            body: "「운송 경로 설명」에 출발지·도착지·중량을 한 문장으로 쓰고 「분석 보고서 생성」을 누릅니다. 시스템이 먼저 AI로 그 문장에서 매개변수를 추출하며, 이 단계에서는 차감되지 않습니다.",
            figure: GUIDE_FIGURE_ID.ANALYSIS_INPUT,
            callouts: [
              "**운송 경로 설명**: 한 문장이면 충분합니다(예: 타이베이 국부기념관에서 맨체스터 박물관까지 5000 kg의 석판 운송). AI는 문장을 출발지·도착지·중량으로 바꾸는 역할만 하며, 모든 거리와 배출량은 백엔드의 결정론적 규칙 엔진이 계산합니다.",
              "**고급 매개변수 수동 구성**: 정확한 좌표가 필요할 때 펼쳐 위도·경도·총중량을 입력합니다. 다섯 항목이 모두 채워지면 수동 값이 우선하며 **AI 해석은 호출되지 않습니다**.",
              "**분석 보고서 생성**: 먼저 해석하고 이어서 결제 확인이 열립니다. 해석이 끝나면 고급 패널이 자동으로 펼쳐져, 결제 전에 추출된 좌표와 중량을 확인할 수 있습니다.",
            ],
            notes: [
              "설명란에 입력하면 이미 채워진 위도·경도와 중량이 지워집니다. 「설명은 뉴욕인데 좌표는 지난번 도쿄」 같은 불일치를 막기 위한 동작입니다.",
              "해석 결과가 틀리면 고급 패널의 숫자를 바로 고치면 되고, 문장을 다시 쓸 필요는 없습니다.",
            ],
          },
          {
            id: "analysis_pay",
            title: "차감 확인",
            body: "매개변수가 모두 갖춰지면 결제 확인이 나타납니다. 크레딧이 소모되는 곳은 여기뿐이며, 그 전의 해석·탭 전환·이력 열람은 무료입니다.",
            figure: GUIDE_FIGURE_ID.ANALYSIS_PAYMENT,
            callouts: [
              "**필요 크레딧**: 이 분석은 1회당 {{analysisCost}} 크레딧입니다. 한도가 있는 팀에 속해 있으면 팀 한도가 먼저 차감되고, 실제 결제 출처와 잔액이 대화상자에 표시됩니다.",
              "**결제 후 생성**: 누르면 계산이 시작됩니다. 같은 매개변수로 다시 계산하면 다시 차감되므로, 앞 단계에서 좌표와 중량을 확인해 두는 편이 좋습니다.",
            ],
          },
          {
            id: "analysis_read",
            title: "보고서 읽기",
            body: "보고서는 「플랜」 단위입니다. 육상 단독, 해상 복합, 항공 복합, 해륙공 복합이 각각 카드로 나오며 지도, 구간별 마일리지, 배출량을 포함합니다.",
            figure: GUIDE_FIGURE_ID.ANALYSIS_REPORT,
            callouts: [
              "**플랜 전환**: 해당되는 플랜만 나타납니다. 두 항구가 {{minSeaKm}} km 미만, 두 공항이 {{minAirKm}} km 미만이거나, 육상 운송이 해당 복합 운송보다 멀지 않으면 그 플랜은 표시되지 않습니다.",
              "**플랜 코드**(예: R01-SEA)는 화면, PDF 파일명, CSV의 각 행을 관통하는 유일한 상호 대조 색인입니다.",
              "**「추정치」** 표시가 붙은 구간은 경로 탐색이 성공하지 못해 대권 거리에 우회 계수를 곱한 추정값입니다(육상 ×{{landTortuosity}}, 해상 ×{{seaTortuosity}}). 보고서를 검증할 때는 먼저 이 구간이 몇 개인지 보세요.",
              "**총 배출량**은 백엔드에서 반올림하지 않은 정밀도로 계산되므로, 구간 합계와 총계가 소수 몇 자리 어긋날 수 있습니다. 보고서는 그 차액과 원인을 공개합니다.",
              "**계수와 산식**은 항상 보고서 안에 공개됩니다: 총거리(km) × (중량(kg)/1000) × 해당 모드 계수.",
            ],
            notes: [
              "플랜이 보이지 않는 것은 계산 누락이 아닙니다. 적용성 판정은 해당되지 않는 플랜을 통째로 제거하며, 값이 0인 보고서를 내놓지 않습니다. 규칙은 아래 「9. 플랜의 적용성 판정」을 참고하세요.",
            ],
          },
          {
            id: "analysis_export",
            title: "PDF와 CSV 내보내기",
            body: "보고서나 이력 목록에서 「보고서 내보내기」를 누르면 어떤 플랜을 내보낼지, 배출 수치를 포함할지 고르는 선택 창이 먼저 열립니다.",
            figure: GUIDE_FIGURE_ID.EXPORT_MODAL,
            callouts: [
              "**플랜 선택**: 이 경로에 해당되는 플랜만 나열됩니다. 플랜마다 독립된 PDF가 생성되고, 여러 개면 ZIP으로 묶입니다.",
              "**이산화탄소 환산량 계산**: 선택을 해제하면 PDF와 CSV 모두 배출 수치를 전혀 담지 않고 경로와 거리만 남습니다.",
              "**배출 계수 세트**는 선택 항목이 아니라 공개입니다. 표시된 것이 계산에 실제로 쓰인 세트입니다. 다른 계수를 쓰려면 위 항목의 선택을 해제하고 거리만 담긴 CSV를 받아 직접 적용하세요.",
              "내보낸 summary.csv는 완전한 정밀도와 플랜 코드를 담고 있어 같은 이름의 PDF와 행 단위로 대조할 수 있습니다.",
            ],
            notes: [
              "내보내는 동안 전체 화면 진행 표시가 화면을 덮습니다. 캡처에 뒤쪽 내용이 담기지 않도록 하기 위한 것이며 멈춘 것이 아닙니다.",
            ],
          },
        ],
      },
      {
        id: "mileage",
        title: "3. 마일리지: 여러 경로를 한 번에",
        summary:
          "거리만 알고 싶을 때, 또는 수십 개 경로를 한 번에 처리해야 할 때 사용합니다.",
        steps: [
          {
            id: "mileage_run",
            title: "목록을 만들고 마일리지를 산출",
            body: "텍스트를 붙여 AI에 해석시키거나, 한 건씩 직접 추가하거나, Excel／CSV를 가져옵니다. 목록이 준비되면 「마일리지 핵산 시작」으로 한 번에 처리합니다.",
            figure: GUIDE_FIGURE_ID.MILEAGE_FLOW,
            callouts: [
              "**텍스트 붙여넣기 자동 해석**: 출하 전표나 메일 본문을 그대로 붙이고 「AI 자동 해석」을 누르면 출발지·도착지 목록으로 분해됩니다.",
              "**중계지(선택)**: 경유지를 지정할 때 여기서 설정합니다. 중계지마다 위도·경도가 필요하며 자동 해석으로 가져올 수 있습니다. 좌표가 없는 중계지가 있으면 계산이 멈추고 안내가 표시됩니다.",
              "**일괄 가져오기**: .xlsx／.xls／.csv를 지원합니다. 가져올 때 파일의 열을 출발지·도착지·중계지에 연결하므로 정해진 열 이름이 필요하지 않습니다.",
              "**운송 모드**: 기본값은 「AI 자동 판별」이며, 육상 단독·해륙 복합·공륙 복합·해륙공 복합으로 강제 지정할 수도 있습니다.",
              "**마일리지 핵산 시작**: 목록 전체를 한 번에 전송합니다. 완료 후 건별 또는 일괄로 내보낼 수 있고, 내보내기 흐름은 탄소 회계와 같습니다.",
            ],
            notes: [
              "마일리지 결과도 과거 보고서에 기록되며, 다시 불러오면 자동으로 「마일리지」 탭에서 표시됩니다.",
            ],
          },
        ],
      },
      {
        id: "history",
        title: "4. 과거 보고서: 다시 보기와 재발행",
        summary:
          "완료된 분석은 모두 여기 남습니다. 다시 보거나 내보내는 데 추가 크레딧이 들지 않습니다.",
        steps: [
          {
            id: "history_reopen",
            title: "다시 불러오기 또는 바로 내보내기",
            body: "목록은 시간순이며 상태가 COMPLETED인 행만 불러올 수 있습니다. 불러오면 해당 탭으로 전환되고 당시의 출발지·도착지·중량도 함께 복원됩니다.",
            figure: GUIDE_FIGURE_ID.HISTORY_TABLE,
            callouts: [
              "**핵산 유형**으로 탄소 회계인지 마일리지인지 구분합니다. 둘은 불러온 뒤 서로 다른 탭으로 전환됩니다. 여러 경로를 담은 마일리지 계산은 행을 펼쳐 건별로 볼 수 있습니다.",
              "**불러오기**는 당시 보고서를 다시 열어 보는 것뿐이며 재계산도 차감도 없습니다.",
              "**보고서 내보내기**는 불러온 직후 내보내기 선택 창을 바로 엽니다. PDF 한 부만 더 필요할 때 적합합니다.",
            ],
            notes: [
              "불러오면 주소에 analysisId가 붙으므로 링크를 그대로 공유할 수 있고, 브라우저 뒤로 가기로 목록에 정확히 돌아갈 수 있습니다.",
            ],
          },
        ],
      },
      {
        id: "troubleshoot",
        title: "5. 자주 있는 상황",
        summary: "아래는 모두 설계된 동작이며 결함이 아닙니다.",
        steps: [
          {
            id: "trouble_missing_plan",
            title: "특정 운송 플랜이 나타나지 않음",
            body: "적용성 판정이 해당되지 않는다고 보았습니다. 두 항구가 {{minSeaKm}} km 미만, 두 공항이 {{minAirKm}} km 미만이거나, 육상 운송이 그 복합 운송보다 멀지 않은 경우입니다. 이때 플랜은 0값 보고서가 아니라 통째로 생성되지 않습니다.",
          },
          {
            id: "trouble_estimate",
            title: "거리 옆에 「추정치」 표시가 나옴",
            body: "그 구간의 경로 탐색이 성공하지 못해 대권 거리에 우회 계수를 곱한 추정값입니다(육상 ×{{landTortuosity}}, 해상 ×{{seaTortuosity}}). 도로망은 **현재 대만만 수록**하고 있어, 대만 밖 육상 구간은 거의 모두 추정값입니다.",
          },
          {
            id: "trouble_total_mismatch",
            title: "구간 합계와 총계가 소수 몇 자리 다름",
            body: "총계는 백엔드에서 반올림하지 않은 정밀도로 계산되고 화면의 구간 값은 소수 둘째 자리로 반올림되어 있어, 합계는 당연히 어긋납니다. 보고서가 그 차액을 공개하며, 완전한 정밀도가 필요하면 내보낸 summary.csv를 보세요.",
          },
          {
            id: "trouble_no_payment",
            title: "분석 보고서 생성을 눌렀는데 결제가 열리지 않음",
            body: "매개변수가 불완전하면 결제 단계로 넘어가지 않습니다. 설명란에 내용이 있는지, 또는 고급 매개변수 다섯 항목이 모두 채워졌는지 확인하세요. 오류 메시지는 설정 카드 아래에 표시됩니다.",
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
