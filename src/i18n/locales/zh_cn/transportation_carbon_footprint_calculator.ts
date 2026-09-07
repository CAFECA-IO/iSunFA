import { GUIDE_FIGURE_ID } from "@/constants/logistics_guide";

export const transportationCarbonFootprintCalculator = {
  title: "物流碳足迹",
  default_ai_input: "从台北国父纪念馆运送 5000 公斤的石板到曼彻斯特博物馆",
  analysis_failed: "分析失败",
  error: {
    missing_input: "请输入运输路线描述，或展开进阶设定手动输入完整参数。",
    ai_parse_failed: "AI 解析失败",
    missing_params: "无法取得完整参数，请确认 AI 解析结果或手动输入。",
    load_history_failed: "无法载入历史报告，请稍后再试。",
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
    intro:
      "以下逐节说明每一个数字是怎么来的。若只想知道结论的可信范围，直接看第十一节「已知限制」。",
    limits_title: "使用这份数字前必读",
    read_full: "看完整计算方式说明",
    // Info: (20260820 - Luphia) 限制摘要同 sections 以英文回退：審計用詞的正確性需母語者覆核，
    // Info: (20260820 - Luphia) 譯錯的限制摘要比沒有摘要更糟。用詞與 sections 一致，翻譯可一併替換。
    highlights: [
      "The scope covers **transport only**: no warehousing, loading and unloading, or packaging, and nothing from the production or disposal of the goods themselves. The result is therefore not the full life-cycle carbon footprint of the shipment.",
      "The road network **currently covers Taiwan only**: road legs outside Taiwan are estimated from straight-line distance times a tortuosity factor of {{landTortuosity}} and marked Estimated in the report. Where a route's emissions are dominated by road transport abroad, the estimation error enters the result directly.",
      "The sea and air factors have a **production region of the United States** (announced 2016 and 2017), and the air distance excludes routing detours, climb and high-altitude radiative forcing — both the actual flight distance and the climate impact exceed the figures reported here.",
    ],
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
              "The great-circle distance is multiplied by a tortuosity factor of {{landTortuosity}} and marked 「估算值」 in the report. The factor reflects how far real roads typically deviate from a straight line and is not calibrated per route.",
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
              "The great-circle distance is multiplied by a tortuosity factor of {{seaTortuosity}} and marked 「估算值」. The sea factor exceeds the road factor because lanes are constrained by landmasses and straits, producing greater deviation.",
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
    title: "操作说明",
    subtitle:
      "从一句话的路线描述，到可交付的 PDF 与 CSV，这里是完整流程。往下接着是每一个数字的计算方式与已知限制。",
    nav_title: "本页目录",
    figure_note:
      "图为界面示意图：以画面实际使用的组件样式与实际字串重绘，因此会随界面语言与深浅主题变化，不是某一版的画面截取。图上的编号对应图下的说明。",
    figure_caption: "示意图：{{title}}",
    start_cta: "开始碳排核算",
    empty_cta: "第一次使用？看操作说明",
    chapters: [
      {
        id: "overview",
        title: "一、四个分页各自负责什么",
        summary:
          "先认位置。这个工具把四件不同的事分在四个分页，走错分页是最常见的卡点。",
        steps: [
          {
            id: "overview_tabs",
            title: "分页的分工",
            body: "碳排核算算「一条路线的排放」，里程核算算「很多条路线的距离」，历史报告是已完成的分析，操作说明就是本页。",
            figure: GUIDE_FIGURE_ID.TABS,
            callouts: [
              "**碳排核算**：输入一组起讫点与重量，产出含地图、逐段里程与排放量的完整报告，可汇出 PDF。每次产生扣 {{analysisCost}} 点。",
              "**里程核算**：一次处理多条路线，可粘贴文本或导入 Excel／CSV，只产出各段距离。适合先盘点路线，再决定要对哪几条做完整核算。",
              "**历史报告**：列出过去的分析，可重新载入检视或直接汇出，不重算、不再扣点。",
              "**操作说明**：本页。切换分页不会清掉已经填好的内容。",
            ],
            notes: [
              "分页状态写在网址的 ?tab= 参数上，可以把某个分页的链接直接传给同事。",
            ],
          },
        ],
      },
      {
        id: "analysis",
        title: "二、碳排核算：从一句话到一份报告",
        summary: "一条路线、一份报告，共四步。",
        steps: [
          {
            id: "analysis_describe",
            title: "描述路线，或直接填座标",
            body: "在「运输路线描述」用一句话写清楚起点、迄点与重量，按下「产生分析报告」。系统会先请 AI 从这句话里萃取参数，这一步不扣点。",
            figure: GUIDE_FIGURE_ID.ANALYSIS_INPUT,
            callouts: [
              "**运输路线描述**：一句话即可，例如「从台北国父纪念馆运送 5000 公斤的石板到曼彻斯特博物馆」。AI 只负责把文字转成起讫点与重量，所有距离与排放都由后端的确定性规则引擎计算。",
              "**进阶参数手动配置**：需要精确座标时展开它，直接填经纬度与总重。五个栏位一旦填齐，系统即以手动值为准，**不再呼叫 AI 解析**。",
              "**产生分析报告**：按下后先解析、再跳出付款确认。解析完成会自动展开进阶参数，让你在付款前核对它抓到的座标与重量。",
            ],
            notes: [
              "在描述栏位打字会清空已填的经纬度与重量。这是为了避免「描述写着纽约、座标留着上一次的东京」这种前后不一致。",
              "解析结果不对就直接改进阶参数里的数字，不必重写描述。",
            ],
          },
          {
            id: "analysis_pay",
            title: "确认扣点",
            body: "参数齐全后会跳出付款确认。这是唯一会扣点的地方——在此之前的解析、切换分页、浏览历史都不扣点。",
            figure: GUIDE_FIGURE_ID.ANALYSIS_PAYMENT,
            callouts: [
              "**所需点数**：本项分析每次 {{analysisCost}} 点。若你属于某个有额度的团队，会优先扣团队额度，对话框上会显示实际扣款来源与余额。",
              "**支付并生成**：按下后开始计算。同一组参数再算一次会再扣一次点，故建议先在上一步核对座标与重量。",
            ],
          },
          {
            id: "analysis_read",
            title: "读懂报告",
            body: "报告以「方案」为单位：纯陆运、海运联运、空运联运、海陆空联运各自一张卡片，含地图、逐段里程与排放量。",
            figure: GUIDE_FIGURE_ID.ANALYSIS_REPORT,
            callouts: [
              "**方案切换**：只会出现适用的方案。两港距离不足 {{minSeaKm}} km、两机场不足 {{minAirKm}} km，或陆运本身就不比该联运方案远时，该方案不会出现。",
              "**方案代码**（如 R01-SEA）贯穿画面、PDF 档名与 CSV 每一列，是三者互相对照的唯一索引。",
              "标上 **「估算值」** 的区段代表路径规划没有成功，改以直线距离乘绕行系数推估（陆运 ×{{landTortuosity}}、海运 ×{{seaTortuosity}}）。核对报告时请先看这里有几段。",
              "**总碳排放量**由后端以未舍入的精度计算，因此逐段相加可能与总计差几分位；报告会揭露该差额及其来源。",
              "**碳排系数与公式**一律揭露在报告内：总里程(km) × (重量(kg)/1000) × 该模式系数。",
            ],
            notes: [
              "看不到某个方案不是漏算。适用性判定会把不适用的方案整个移除，而不是给你一份数值为零的报告；规则见下方「九、方案的适用性判定」。",
            ],
          },
          {
            id: "analysis_export",
            title: "汇出 PDF 与 CSV",
            body: "在报告或历史清单按下「汇出报告」，会先出现勾选选单，决定要汇出哪些方案、是否包含排放数值。",
            figure: GUIDE_FIGURE_ID.EXPORT_MODAL,
            callouts: [
              "**勾选方案**：只列出此路线适用的方案。每个方案产出独立的一份 PDF，多份会打包成 ZIP。",
              "**计算二氧化碳当量**：取消勾选则 PDF 与 CSV 都不会出现任何排放数值，只留路径与距离。",
              "**排放系数组**是揭露而非选项：显示的就是计算实际采用的那一组。想改用其他系数，请取消上一项勾选，取得距离版 CSV 后自行套用。",
              "汇出的 summary.csv 带完整精度与方案代码，可与同名 PDF 逐列对照。",
            ],
            notes: [
              "汇出期间画面会被满版的进度提示盖住。那是为了避免截图时抓到底下的内容，不是卡住。",
            ],
          },
        ],
      },
      {
        id: "mileage",
        title: "三、里程核算：一次处理很多条路线",
        summary: "只想知道距离，或一次要处理几十条路线时走这里。",
        steps: [
          {
            id: "mileage_run",
            title: "建立清单并核算里程",
            body: "粘贴一段文字让 AI 解析，或手动逐条加入，也可以直接导入 Excel／CSV。清单建好后按「开始核算里程」一次算完。",
            figure: GUIDE_FIGURE_ID.MILEAGE_FLOW,
            callouts: [
              "**粘贴文本自动解析**：把出货单或邮件内容整段粘贴进来，按「AI 自动解析」拆成起讫点清单。",
              "**中继站（选填）**：需要指定途经点时在此设定。每个中继站都必须有经纬度，可按自动解析取得；缺座标的中继站会让核算停下来并提示。",
              "**批次导入**：支援 .xlsx／.xls／.csv。导入时会让你把档案栏位对应到起点、终点与中继站，不要求固定的栏位名称。",
              "**运输模式**：预设「AI 自动判断」，也可以指定纯陆运、海陆联运、空陆联运或海陆空联运，强制以该组合计算。",
              "**开始核算里程**：整份清单一次送出。算完后可逐条或整批汇出，汇出流程与碳排核算相同。",
            ],
            notes: [
              "里程核算的结果也会进历史报告，回头载入时会自动切到「里程核算」分页呈现。",
            ],
          },
        ],
      },
      {
        id: "history",
        title: "四、历史报告：回头检视与补件",
        summary: "已完成的分析都留在这里，重新检视与汇出都不再扣点。",
        steps: [
          {
            id: "history_reopen",
            title: "重新载入或直接汇出",
            body: "清单依时间排列，状态为 COMPLETED 的才可载入。载入后会自动切到对应的分页，并把当时的起讫点与重量一并还原。",
            figure: GUIDE_FIGURE_ID.HISTORY_TABLE,
            callouts: [
              "**核算类型**分辨这笔是碳排核算还是里程核算——两者载入后会切到不同的分页。含多条路线的里程核算可以展开逐条检视。",
              "**载入**把当时的报告重新开出来检视，不重算、不扣点。",
              "**汇出报告**在载入完成后直接开启汇出勾选选单，适合只想补一份 PDF 的情形。",
            ],
            notes: [
              "载入后网址会带上 analysisId，可以把链接直接传给同事，或用浏览器的上一页精准回到清单。",
            ],
          },
        ],
      },
      {
        id: "troubleshoot",
        title: "五、常见状况",
        summary: "以下都是设计上的行为，不是故障。",
        steps: [
          {
            id: "trouble_missing_plan",
            title: "某个运输方案没有出现",
            body: "适用性判定认定它不适用：两港距离不足 {{minSeaKm}} km、两机场距离不足 {{minAirKm}} km，或陆运本身就不比该联运方案远。此时该方案整个不产出，而非产出一份零值报告。",
          },
          {
            id: "trouble_estimate",
            title: "里程旁边出现「估算值」标记",
            body: "该段的路径规划没有成功，改以直线距离乘绕行系数推估（陆运 ×{{landTortuosity}}、海运 ×{{seaTortuosity}}）。道路路网**目前仅覆盖台湾**，故境外陆运段几乎都是推估值。",
          },
          {
            id: "trouble_total_mismatch",
            title: "逐段相加与总计差了几分位",
            body: "总计由后端以未舍入的精度计算，而画面上的逐段数值已四舍五入至小数两位，两者相加自然会差。报告会揭露该差额；需要完整精度请看汇出的 summary.csv。",
          },
          {
            id: "trouble_no_payment",
            title: "按下产生分析报告却没有跳出付款",
            body: "参数不完整时不会进到付款流程。请确认描述栏位有内容，或进阶参数的五个栏位全部填齐；错误讯息会出现在参数配置卡片下方。",
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
    factor_set_hint:
      "若需采用其他系数，请取消勾选上方选项：导出的 CSV 含逐段距离与重量，可自行套用。",
    split_hint: "每个方案将产出独立的 PDF 文件；多份文件将打包为 ZIP 下载。",
    confirm: "导出",
    progress: "正在生成第 {{current}} / {{total}} 份报告...",
  },
};
