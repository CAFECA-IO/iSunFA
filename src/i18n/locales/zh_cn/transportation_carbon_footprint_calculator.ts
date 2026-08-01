export const transportationCarbonFootprintCalculator = {
  title: "物流碳足迹",
  default_ai_input: "从台北国父纪念馆运送 5000 公斤的石板到曼彻斯特博物馆",
  analysis_failed: "分析失败",
  error: {
    missing_input: "请输入运输路线描述，或展开进阶设定手动输入完整参数。",
    ai_parse_failed: "AI 解析失败",
    missing_params: "无法取得完整参数，请确认 AI 解析结果或手动输入。",
  },
  payment: {
    fee_name: "碳足迹分析费用",
    modal_label: "物流碳足迹分析",
    modal_value: "物流分析",
  },
  pdf: {
    generating_title: "正在生成高画质 PDF...",
    generating_desc: "这可能需要几秒钟的时间，请稍候",
    generating_title_large: "正在为您产生高画质 PDF 报告",
    generating_desc_large_1: "系统正在撷取地图路线与详细分析数据...",
    generating_desc_large_2:
      "由于包含高画质渲染内容，这可能需要几秒钟的时间，请稍候片刻。",
    error_failed: "生成 PDF 失败，错误讯息：",
    error_unknown: "未知错误",
    mode_land: "纯陆运",
    mode_sea: "海运多式联运",
    mode_air: "空运多式联运",
    origin: "起点",
    dest: "终点",
    footer: "页码 {{current}} / {{total}} • 路线：{{origin}} ➝ {{dest}}",
    section_analysis: "专属区段分析",
    weight_label: "总重: {{weight}} KG",
    watermark: "iSunFA CONFIDENTIAL",
    export_id_label: "导出批次",
    plan_code_label: "方案代码",
  },
  ui: {
    title: "物流碳足迹",
    description:
      "透过 AI 智能分析运输路线，自动分割陆运、海运与空运路段，并依据 IPCC 基准估算各区段里程与碳排放量。",
    not_generated: "分析报告尚未生成",
    config_title: "参数配置与分析控制",
    route_description: "运输路线描述",
    route_placeholder: "例如：从台北市运送货物到美国纽约",
    advanced_config: "进阶参数手动配置 (可选)",
    origin_lat: "起点纬度",
    origin_lng: "起点经度",
    dest_lat: "终点纬度",
    dest_lng: "终点经度",
    total_weight: "总重 (KG)",
    land_route: "纯陆运方案",
    sea_route: "海运多式联运",
    air_route: "空运多式联运",
    exporting: "汇出中...",
    export_report: "汇出报告",
    calculating: "运算中...",
    generate_report: "产生分析报告",
    login_to_generate: "请先登入以产生分析报告",
    login_to_use: "请先登录以使用物流碳足迹",
    tab_analysis: "碳排核算",
    tab_history: "历史报告",
    tab_mileage: "里程核算",
    empty_plan: "此笔历史资料无详细路线方案。请重新产生报告。",
    auto: "自动判断",
  },
  history: {
    title: "历史分析路径",
  },
  plan_section: {
    mode_land: "纯陆运",
    mode_sea: "海运",
    mode_air: "空运",
    title_custom: "自定义多段路线",
    title_sea_land_air: "海陆空联运专案",
    transit_airport: "中转机场",
    title_land: "纯陆运专案",
    title_sea: "海运专案",
    title_air: "空运专案",
    origin_port: "起运港口",
    dest_port: "目的港口",
    origin_airport: "起运机场",
    dest_airport: "目的机场",
    origin: "起点",
    dest: "终点",
    total_emissions_est: "{{title}}总碳排放量估算",
    total_weight: "总重量",
    metric_ton: "公吨",
    coefficient_disclosure: "碳排系数与公式揭露",
    formula: "公式: 总里程(km) × (重量(kg)/1000) × 碳排系数",
    source: "资料来源",
    section_analysis: "{{title}}区段分析",
    est_mileage: "预估里程:",
    emission_coefficient: "排放系数:",
    carbon_emissions: "碳排放量",
    fallback_estimate_badge: "估算值",
    fallback_estimate_hint: "路网图资未涵盖此区域,以直线距离 ×1.2 推估",
  },
  mileage_calculator: {
    title_paste: "粘贴文本自动解析",
    placeholder:
      "请粘贴包含起点与终点的物流文本，例如：'从台北出发，运送至高雄'...",
    btn_ai_parse: "AI 自动解析",
    title_manual: "手动输入与分析清单",
    origin_desc: "起点描述",
    dest_desc: "终点描述",
    btn_add: "加入清单",
    col_id: "编号",
    col_origin: "起点",
    col_dest: "终点",
    col_mileage: "里程 (KM)",
    col_status: "状态",
    col_action: "操作",
    btn_calculate: "开始核算里程",
    btn_delete: "删除",
    err_required: "起点与终点皆为必填",
    err_calc_failed: "核算失败，请稍后再试。",
    err_parse_failed: "解析失败",
    err_no_valid_routes: "无法从档案中解析出有效的起讫点。",
    err_waypoints_incomplete_title: "中继站资料不齐全",
    err_waypoints_incomplete_msg:
      "有些中继站尚未设定经纬度，请点击自动解析或手动填写经纬度后再试。",
    label_waypoints_optional: "中继站 (选填)",
    btn_setup: "设定...",
    col_waypoints: "中继站设定",
    waypoint_modal_title: "中继站设定",
    waypoint_modal_empty: "无中继站。点击下方按钮新增。",
    waypoint_modal_placeholder:
      "输入地点，例如：Singapore 或 Port of Rotterdam",
    waypoint_modal_auto_parse: "自动解析经纬度",
    waypoint_modal_auto_parse_short: "自动解析",
    waypoint_modal_lat: "纬度 (Latitude)",
    waypoint_modal_lng: "经度 (Longitude)",
    waypoint_modal_add: "新增中继站",
    waypoint_modal_confirm: "确定",
    empty_list: "目前尚无清单，请新增或贴上文本解析",
    col_mode: "运输模式",
    mode_auto: "AI 自动判断",
    mode_LAND: "纯陆运",
    mode_AIR_LAND: "空陆联运",
    mode_SEA_LAND: "海陆联运",
    mode_SEA_LAND_AIR: "海陆空联运",
    recalculate: "重新计算",
    short_land: "陆",
    short_sea: "海",
    short_air: "空",
    csv_total_dist: "总里程(km)",
    csv_land_dist: "陆运(km)",
    csv_sea_dist: "海运(km)",
    csv_air_dist: "空运(km)",
    csv_pdf_file: "PDF文件",
  },
  map: {
    maptiler_key_not_set: "MapTiler Key 尚未设定！",
    origin: "起点",
    dest: "终点",
    label: "🟢 ESG 物流碳盘查轨迹 (Powered by MapLibre)",
  },
  // Info: (20260724 - Tzuhan) 导出勾选菜单(需求二)
  methodology: {
    title: "计算方式说明",
    // Info: (20260802 - Luphia) 內文暫以英文回退：審計用詞的正確性需母語者覆核，
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
    title: "选择导出方案",
    description: "请勾选要导出的方案类型，仅列出此路线适用的方案。",
    plan_land: "纯陆运",
    plan_sea: "包含海运（海陆联运）",
    plan_air: "包含空运（空陆联运）",
    plan_custom: "自定义多式联运",
    plan_seaLandAir: "海陆空联运(陆→海→陆→空→陆)",
    include_co2e: "计算二氧化碳当量",
    include_co2e_hint:
      "取消勾选则仅导出路径与距离，PDF 与 CSV 都不会出现任何排放数值。",
    factor_set: "排放系数组",
    factor_set_moenv: "环境部产品碳足迹信息网",
    factor_set_defra: "UK DEFRA 2025",
    factor_set_default: "（默认）",
    factor_set_hint: "上列总量以本次导出的实际航段试算，换组会改变申报数值。",
    factor_set_no_estimate:
      "本次导出无法试算总量，但所选系数组仍会套用于计算。",
    split_hint: "每个方案将产出独立的 PDF 文件；多份文件将打包为 ZIP 下载。",
    confirm: "导出",
    progress: "正在生成第 {{current}} / {{total}} 份报告...",
  },
};
