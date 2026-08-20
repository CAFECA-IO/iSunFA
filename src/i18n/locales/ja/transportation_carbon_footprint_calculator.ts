import { GUIDE_FIGURE_ID } from "@/constants/logistics_guide";

export const transportationCarbonFootprintCalculator = {
  title: "物流カーボンフットプリント",
  default_ai_input:
    "台北の国父紀念館からマンチェスター博物館へ5000キロの石板を輸送する",
  analysis_failed: "分析失敗",
  error: {
    missing_input:
      "輸送ルートの説明を入力するか、詳細設定を展開して手動で完全なパラメータを入力してください。",
    ai_parse_failed: "AIの解析に失敗しました",
    missing_params:
      "完全なパラメータを取得できません。AIの解析結果を確認するか、手動で入力してください。",
  },
  payment: {
    fee_name: "カーボンフットプリント分析費用",
    modal_label: "物流カーボンフットプリント分析",
    modal_value: "物流分析",
  },
  pdf: {
    generating_title: "高品質のPDFを生成しています...",
    generating_desc: "これには数秒かかる場合があります。お待ちください",
    generating_title_large: "高品質のPDFレポートを生成しています",
    generating_desc_large_1:
      "システムがマップルートと詳細な分析データを抽出しています...",
    generating_desc_large_2:
      "高品質のレンダリングコンテンツが含まれているため、これには数秒かかる場合があります。しばらくお待ちください。",
    error_failed: "PDFの生成に失敗しました。エラーメッセージ：",
    error_unknown: "不明なエラー",
    mode_land: "陸上輸送",
    mode_sea: "海上複合一貫輸送",
    mode_air: "航空複合一貫輸送",
    origin: "出発地",
    dest: "目的地",
    footer: "ページ {{current}} / {{total}} • ルート：{{origin}} ➝ {{dest}}",
    section_analysis: "専用セクション分析",
    weight_label: "総重量: {{weight}} KG",
    watermark: "iSunFA CONFIDENTIAL",
    export_id_label: "エクスポートID",
    plan_code_label: "プランコード",
  },
  ui: {
    title: "物流カーボンフットプリント",
    description:
      "AIによるインテリジェントな分析で輸送ルートを解析し、陸上、海上、航空セグメントを自動的に分割し、IPCC基準に基づいてマイレージと炭素排出量を推定します。",
    not_generated: "分析レポートはまだ生成されていません",
    config_title: "パラメータ設定と分析コントロール",
    route_description: "輸送ルートの説明",
    route_placeholder: "例：台北市からアメリカのニューヨークへ貨物を輸送する",
    advanced_config: "詳細パラメータの手動設定 (オプション)",
    origin_lat: "出発地の緯度",
    origin_lng: "出発地の経度",
    dest_lat: "目的地の緯度",
    dest_lng: "目的地の経度",
    total_weight: "総重量 (KG)",
    land_route: "陸上輸送プラン",
    sea_route: "海上複合一貫輸送",
    air_route: "航空複合一貫輸送",
    exporting: "エクスポート中...",
    export_report: "レポートをエクスポート",
    calculating: "計算中...",
    generate_report: "分析レポートを生成",
    login_to_generate: "分析レポートを生成するにはログインしてください",
    login_to_use:
      "物流カーボンフットプリント機能を使用するには、まずログインしてください",
    tab_analysis: "炭素会計",
    tab_history: "履歴レポート",
    tab_mileage: "マイレージ計算",
    empty_plan:
      "この履歴データには詳細なルートプランがありません。レポートを再生成してください。",
    auto: "自動判定",
  },
  history: {
    title: "分析履歴",
  },
  plan_section: {
    mode_land: "陸上輸送",
    mode_sea: "海上輸送",
    mode_air: "航空輸送",
    title_custom: "カスタム複合一貫輸送ルート",
    title_sea_land_air: "海陸空複合一貫輸送プラン",
    transit_airport: "中継空港",
    title_land: "陸上輸送プラン",
    title_sea: "海上輸送プラン",
    title_air: "航空輸送プラン",
    origin_port: "出発港",
    dest_port: "到着港",
    origin_airport: "出発空港",
    dest_airport: "到着空港",
    origin: "出発地",
    dest: "目的地",
    total_emissions_est: "{{title}} 総炭素排出量推計",
    total_weight: "総重量",
    metric_ton: "トン",
    coefficient_disclosure: "炭素排出係数と計算式の公開",
    formula: "計算式：総走行距離(km) × (重量(kg)/1000) × 排出係数",
    source: "データソース",
    section_analysis: "{{title}} セグメント分析",
    est_mileage: "推定走行距離:",
    emission_coefficient: "排出係数:",
    carbon_emissions: "炭素排出量",
    fallback_estimate_badge: "概算値",
    fallback_estimate_hint:
      "道路ネットワークデータが未整備の地域のため、直線距離×1.2で概算",
  },
  mileage_calculator: {
    title_paste: "テキストを貼り付けてAI解析",
    placeholder:
      "出発地と目的地を含む物流テキストを貼り付けてください。例：'台北から出発し、高雄へ配送'...",
    btn_ai_parse: "AI 自動解析",
    title_manual: "手動入力と分析リスト",
    origin_desc: "出発地の説明",
    dest_desc: "目的地の説明",
    btn_add: "リストに追加",
    col_id: "ID",
    col_origin: "出発地",
    col_dest: "目的地",
    col_mileage: "マイレージ (KM)",
    col_status: "ステータス",
    col_action: "操作",
    btn_calculate: "マイレージ計算開始",
    btn_delete: "削除",
    err_required: "出発地と目的地は必須です",
    err_calc_failed: "計算に失敗しました。後でもう一度お試しください。",
    err_parse_failed: "解析失敗",
    err_no_valid_routes:
      "ファイルから有効な出発地/目的地を解析できませんでした。",
    err_waypoints_incomplete_title: "中継地のデータが不完全です",
    err_waypoints_incomplete_msg:
      "一部の中継地に緯度・経度が設定されていません。自動解析をクリックするか、手動で入力してから再試行してください。",
    label_waypoints_optional: "中継地 (任意)",
    btn_setup: "設定...",
    col_waypoints: "中継地設定",
    waypoint_modal_title: "中継地設定",
    waypoint_modal_empty:
      "中継地がありません。下のボタンをクリックして追加してください。",
    waypoint_modal_placeholder:
      "場所を入力してください（例：Singapore または Port of Rotterdam）",
    waypoint_modal_auto_parse: "緯度経度を自動解析",
    waypoint_modal_auto_parse_short: "自動解析",
    waypoint_modal_lat: "緯度 (Latitude)",
    waypoint_modal_lng: "経度 (Longitude)",
    waypoint_modal_add: "中継地を追加",
    waypoint_modal_confirm: "確定",
    empty_list:
      "リストがありません。手動で追加するかテキストを貼り付けてください。",
    col_mode: "輸送モード",
    mode_auto: "AI 自動判定",
    mode_LAND: "純陸送",
    mode_AIR_LAND: "空陸複合輸送",
    mode_SEA_LAND: "海陸複合輸送",
    mode_SEA_LAND_AIR: "海陸空複合輸送",
    recalculate: "再計算",
    short_land: "陸",
    short_sea: "海",
    short_air: "空",
    csv_total_dist: "総距離(km)",
    csv_land_dist: "陸送(km)",
    csv_sea_dist: "海運(km)",
    csv_air_dist: "空輸(km)",
    csv_pdf_file: "PDFファイル",
  },
  map: {
    maptiler_key_not_set: "MapTilerキーが設定されていません！",
    origin: "出発地",
    dest: "目的地",
    label: "🟢 ESG物流炭素排出量追跡 (Powered by MapLibre)",
  },
  // Info: (20260724 - Tzuhan) エクスポート選択モーダル(要件2)
  methodology: {
    title: "計算方法の説明",
    intro:
      "以下の各節で、それぞれの数値がどこから来ているかを説明します。結論をどこまで信頼できるかだけを知りたい場合は、第 11 節「既知の制約」へ直接お進みください。",
    limits_title: "この数値を使う前に必ずお読みください",
    read_full: "算出方法の全文を読む",
    highlights: [
      "算定範囲は**輸送プロセスのみ**です。倉庫保管・荷役・包装は含まず、貨物自体の生産や廃棄も含みません。この数値は製品のライフサイクル全体のカーボンフットプリントではありません。",
      "道路ネットワークは**現在台湾のみを収録**しています。台湾外の陸上区間は大圏距離 × {{landTortuosity}} で推定し、レポートでは「概算値」と表示されます。台湾外の陸送が主となるルートでは、その推定誤差がそのまま結果に入ります。",
      "海上と航空の係数は**生産地域が米国**（公表年 2016 年と 2017 年）であり、航空距離は迂回飛行と高高度の放射強制力を含まないため、実際の影響は本レポートの数値より大きくなります。",
    ],
    // Info: (20260802 - Luphia) 內文暫以英文回退：日文審計用詞我無法驗證準確度，
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
              "The great-circle distance is multiplied by a tortuosity factor of {{landTortuosity}} and marked 「概算値」 in the report. The factor reflects how far real roads typically deviate from a straight line and is not calibrated per route.",
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
              "The great-circle distance is multiplied by a tortuosity factor of {{seaTortuosity}} and marked 「概算値」. The sea factor exceeds the road factor because lanes are constrained by landmasses and straits, producing greater deviation.",
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
    title: "操作ガイド",
    subtitle:
      "一文のルート説明から、納品できる PDF と CSV までの一連の手順をまとめています。その後に、各数値の算出方法と既知の制約が続きます。",
    nav_title: "このページの目次",
    figure_note:
      "図は画面のイラストです。実際の画面が使っているコンポーネントと文字列で描き直しているため、表示言語やライト／ダークテーマに追従します。特定バージョンのスクリーンショットではありません。図中の番号は図の下の説明に対応します。",
    figure_caption: "図：{{title}}",
    start_cta: "炭素会計を始める",
    empty_cta: "初めてですか？操作ガイドを見る",
    chapters: [
      {
        id: "overview",
        title: "1. 4 つのタブの役割",
        summary:
          "まず位置を把握します。このツールは 4 つの異なる作業を 4 つのタブに分けており、タブを間違えることが最もよくあるつまずきです。",
        steps: [
          {
            id: "overview_tabs",
            title: "タブの分担",
            body: "炭素会計は「1 ルートの排出量」、マイレージ計算は「多数ルートの距離」、履歴レポートは完了済みの分析、操作ガイドはこのページです。",
            figure: GUIDE_FIGURE_ID.TABS,
            callouts: [
              "**炭素会計**：出発地・目的地・重量を入力すると、地図・区間別マイレージ・排出量を含む完全なレポートが得られ、PDF に出力できます。生成ごとに {{analysisCost}} クレジットを消費します。",
              "**マイレージ計算**：テキストの貼り付けまたは Excel／CSV の取り込みで複数ルートを一括処理し、距離のみを算出します。どのルートを本格的に核算するか選ぶ前の棚卸しに向いています。",
              "**履歴レポート**：過去の分析を一覧表示します。再計算もクレジット消費もなく、再表示や出力ができます。",
              "**操作ガイド**：このページです。タブを切り替えても入力済みの内容は消えません。",
            ],
            notes: [
              "表示中のタブは URL の ?tab= パラメータに保持されるため、任意のタブのリンクをそのまま同僚に共有できます。",
            ],
          },
        ],
      },
      {
        id: "analysis",
        title: "2. 炭素会計：一文から 1 本のレポートへ",
        summary: "1 ルート、1 レポート、全 4 ステップです。",
        steps: [
          {
            id: "analysis_describe",
            title: "ルートを説明する、または座標を直接入力する",
            body: "「輸送ルートの説明」に出発地・目的地・重量を一文で書き、「分析レポートを生成」を押します。まず AI がその一文からパラメータを抽出します。この段階では課金されません。",
            figure: GUIDE_FIGURE_ID.ANALYSIS_INPUT,
            callouts: [
              "**輸送ルートの説明**：一文で十分です（例：台北の国父紀念館からマンチェスター博物館へ 5000 kg の石板を輸送）。AI はテキストを出発地・目的地・重量に変換するだけで、距離と排出量はすべてバックエンドの決定論的ルールエンジンが計算します。",
              "**詳細パラメータの手動設定**：正確な座標が必要なときに展開し、緯度・経度・総重量を入力します。5 つの項目がすべて埋まると手動値が優先され、**AI 解析は呼び出されません**。",
              "**分析レポートを生成**：まず解析し、その後に支払い確認が開きます。解析後は詳細パネルが自動的に展開され、支払い前に抽出された座標と重量を確認できます。",
            ],
            notes: [
              "説明欄に入力すると、入力済みの緯度経度と重量はクリアされます。「説明にはニューヨーク、座標は前回の東京」という不整合を防ぐためです。",
              "解析結果が誤っている場合は詳細パネルの数値を直接修正すればよく、文章を書き直す必要はありません。",
            ],
          },
          {
            id: "analysis_pay",
            title: "課金を確認する",
            body: "パラメータが揃うと支払い確認が表示されます。クレジットを消費するのはここだけで、それ以前の解析・タブ切り替え・履歴閲覧は無料です。",
            figure: GUIDE_FIGURE_ID.ANALYSIS_PAYMENT,
            callouts: [
              "**必要クレジット**：この分析は 1 回あたり {{analysisCost}} クレジットです。枠を持つチームに所属している場合はチーム枠が優先され、実際の支払元と残高がダイアログに表示されます。",
              "**支払って生成**：押すと計算が始まります。同じパラメータで再実行すると再度課金されるため、前のステップで座標と重量を確認しておくことをおすすめします。",
            ],
          },
          {
            id: "analysis_read",
            title: "レポートを読む",
            body: "レポートは「プラン」単位です。陸上輸送のみ、海上複合、航空複合、海陸空複合がそれぞれカードになり、地図・区間別マイレージ・排出量を含みます。",
            figure: GUIDE_FIGURE_ID.ANALYSIS_REPORT,
            callouts: [
              "**プラン切り替え**：該当するプランのみが表示されます。2 港間が {{minSeaKm}} km 未満、2 空港間が {{minAirKm}} km 未満、または陸送がその複合輸送より遠くない場合、そのプランは表示されません。",
              "**プランコード**（例：R01-SEA）は画面・PDF のファイル名・CSV の各行を貫く唯一の相互参照キーです。",
              "**「概算値」** が付いた区間は経路探索が成功せず、大圏距離に迂回係数を掛けた推定値です（陸上 ×{{landTortuosity}}、海上 ×{{seaTortuosity}}）。レポートを検証する際はまずここを数えてください。",
              "**総排出量**はバックエンドで丸めない精度で計算されるため、区間の合計と総計が小数数桁ずれることがあります。レポートはその差額と要因を開示します。",
              "**係数と算式**は常にレポート内に開示されます：総距離(km) × (重量(kg)/1000) × 当該モードの係数。",
            ],
            notes: [
              "プランが見えないのは計算漏れではありません。適用性判定は該当しないプランを丸ごと除外します。ゼロ値のレポートを出すことはありません。規則は下記「9. プランの適用性判定」を参照してください。",
            ],
          },
          {
            id: "analysis_export",
            title: "PDF と CSV を出力する",
            body: "レポートまたは履歴一覧で「レポートをエクスポート」を押すと、出力するプランと排出量を含めるかを選ぶダイアログが開きます。",
            figure: GUIDE_FIGURE_ID.EXPORT_MODAL,
            callouts: [
              "**プランの選択**：このルートに該当するプランのみが並びます。プランごとに独立した PDF が生成され、複数ある場合は ZIP にまとめられます。",
              "**二酸化炭素換算量を計算**：チェックを外すと、PDF も CSV も排出量を一切含まず、経路と距離だけになります。",
              "**排出係数セット**は選択肢ではなく開示です。表示されているものが計算で実際に使われたセットです。別の係数を使う場合は上の項目のチェックを外し、距離のみの CSV に自分で適用してください。",
              "出力される summary.csv は完全な精度とプランコードを持つため、同名の PDF と行単位で突き合わせられます。",
            ],
            notes: [
              "出力中は全画面の進捗表示が画面を覆います。これはキャプチャに背後の内容が写らないようにするためで、停止しているわけではありません。",
            ],
          },
        ],
      },
      {
        id: "mileage",
        title: "3. マイレージ計算：多数ルートを一括処理",
        summary:
          "距離だけを知りたいとき、あるいは数十本のルートを一度に処理したいときはこちらです。",
        steps: [
          {
            id: "mileage_run",
            title: "リストを作ってマイレージを算出する",
            body: "テキストを貼り付けて AI に解析させる、手動で 1 件ずつ追加する、または Excel／CSV を取り込みます。リストができたら「マイレージ核算を開始」で一括処理します。",
            figure: GUIDE_FIGURE_ID.MILEAGE_FLOW,
            callouts: [
              "**テキストを貼り付けて自動解析**：出荷伝票やメール本文をそのまま貼り付け、「AI 自動解析」で出発地・目的地のリストに分解します。",
              "**中継地（任意）**：経由地を指定する場合はここで設定します。各中継地には緯度経度が必須で、自動解析で取得できます。座標のない中継地があると処理は停止し、その旨が表示されます。",
              "**一括インポート**：.xlsx／.xls／.csv に対応します。取り込み時にファイルの列を出発地・目的地・中継地に対応付けるため、決まった列名は必要ありません。",
              "**輸送モード**：既定は「AI 自動判定」で、陸上輸送のみ・海陸複合・空陸複合・海陸空複合を強制指定することもできます。",
              "**マイレージ核算を開始**：リスト全体を一度に送信します。完了後は 1 件ずつでも一括でも出力でき、出力の流れは炭素会計と同じです。",
            ],
            notes: [
              "マイレージの結果も履歴レポートに記録され、再読み込みすると自動的に「マイレージ計算」タブで表示されます。",
            ],
          },
        ],
      },
      {
        id: "history",
        title: "4. 履歴レポート：見直しと再出力",
        summary:
          "完了した分析はここに残ります。見直しと出力に追加のクレジットはかかりません。",
        steps: [
          {
            id: "history_reopen",
            title: "再読み込みまたは直接出力",
            body: "一覧は時系列で並び、状態が COMPLETED の行だけ読み込めます。読み込むと対応するタブに切り替わり、当時の出発地・目的地・重量も復元されます。",
            figure: GUIDE_FIGURE_ID.HISTORY_TABLE,
            callouts: [
              "**核算タイプ**で炭素会計とマイレージ計算を区別します。読み込み後に切り替わるタブが異なります。複数ルートのマイレージ計算は行を展開して個別に確認できます。",
              "**読み込み**は当時のレポートを再表示するだけで、再計算も課金もありません。",
              "**レポートをエクスポート**は読み込み後すぐに出力ダイアログを開きます。PDF をもう一部だけ用意したい場合に適しています。",
            ],
            notes: [
              "読み込むと URL に analysisId が付くため、リンクをそのまま共有でき、ブラウザの戻るボタンで一覧に正確に戻れます。",
            ],
          },
        ],
      },
      {
        id: "troubleshoot",
        title: "5. よくある状況",
        summary: "以下はいずれも設計どおりの挙動で、不具合ではありません。",
        steps: [
          {
            id: "trouble_missing_plan",
            title: "ある輸送プランが表示されない",
            body: "適用性判定が該当しないと判断しました。2 港間が {{minSeaKm}} km 未満、2 空港間が {{minAirKm}} km 未満、または陸送がその複合輸送より遠くない場合です。このときプランはゼロ値ではなく丸ごと出力されません。",
          },
          {
            id: "trouble_estimate",
            title: "距離の横に「概算値」と表示される",
            body: "その区間の経路探索が成功せず、大圏距離に迂回係数を掛けた推定値です（陸上 ×{{landTortuosity}}、海上 ×{{seaTortuosity}}）。道路ネットワークは**現在台湾のみを収録**しているため、台湾外の陸上区間はほぼ推定値になります。",
          },
          {
            id: "trouble_total_mismatch",
            title: "区間の合計と総計が小数数桁ずれる",
            body: "総計はバックエンドで丸めない精度で計算され、画面の区間値は小数第 2 位に丸められているため、合計は当然ずれます。レポートはその差額を開示します。完全な精度が必要な場合は出力された summary.csv を参照してください。",
          },
          {
            id: "trouble_no_payment",
            title: "分析レポートを生成しても支払いが開かない",
            body: "パラメータが不足している場合は支払いに進みません。説明欄に内容があるか、詳細パラメータの 5 項目がすべて埋まっているかを確認してください。エラーメッセージは設定カードの下に表示されます。",
          },
        ],
      },
    ],
  },
  export_options: {
    title: "エクスポートするプランを選択",
    description:
      "エクスポートするプランを選択してください。このルートに適用可能なプランのみ表示されます。",
    plan_land: "陸運のみ",
    plan_sea: "海運を含む（海陸複合輸送）",
    plan_air: "空運を含む（空陸複合輸送）",
    plan_custom: "カスタム複合輸送",
    plan_seaLandAir: "海陸空複合輸送(陸→海→陸→空→陸)",
    include_co2e: "CO2e を計算する",
    include_co2e_hint:
      "チェックを外すと経路と距離のみを出力します。PDF・CSV に排出量の数値は一切表示されません。",
    factor_set: "排出係数セット",
    factor_set_hint:
      "別の係数セットを使う場合は上のチェックを外してください。出力される CSV に区間ごとの距離と重量が含まれるため、ご自身の係数を適用できます。",
    split_hint:
      "各プランは個別のPDFとして出力され、複数ファイルはZIPにまとめられます。",
    confirm: "エクスポート",
    progress: "レポートを生成中 {{current}} / {{total}}...",
  },
};
