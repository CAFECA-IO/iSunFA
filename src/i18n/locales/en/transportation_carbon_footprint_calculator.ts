import { GUIDE_FIGURE_ID } from "@/constants/logistics_guide";

export const transportationCarbonFootprintCalculator = {
  title: "Logistics Carbon Footprint",
  default_ai_input:
    "Transport 5000 kg of slate from Sun Yat-sen Memorial Hall in Taipei to the Manchester Museum",
  analysis_failed: "Analysis failed",
  error: {
    missing_input:
      "Please enter a transportation route description, or expand the advanced settings to manually enter the complete parameters.",
    ai_parse_failed: "AI parsing failed",
    missing_params:
      "Unable to obtain complete parameters. Please confirm the AI parsing results or enter them manually.",
  },
  payment: {
    fee_name: "Carbon Footprint Analysis Fee",
    modal_label: "Logistics Carbon Footprint Analysis",
    modal_value: "Logistics Analysis",
  },
  pdf: {
    generating_title: "Generating high-quality PDF...",
    generating_desc: "This may take a few seconds, please wait.",
    generating_title_large: "Generating high-quality PDF report for you",
    generating_desc_large_1:
      "The system is extracting map routes and detailed analysis data...",
    generating_desc_large_2:
      "Because it contains high-quality rendered content, this may take a few seconds, please wait a moment.",
    error_failed: "Failed to generate PDF, error message: ",
    error_unknown: "Unknown error",
    mode_land: "Land Route",
    mode_sea: "Sea Multimodal Transport",
    mode_air: "Air Multimodal Transport",
    origin: "Origin",
    dest: "Destination",
    footer: "Page {{current}} / {{total}} • Route: {{origin}} ➝ {{dest}}",
    section_analysis: "Exclusive Section Analysis",
    weight_label: "Total Weight: {{weight}} KG",
    watermark: "iSunFA CONFIDENTIAL",
    export_id_label: "Export ID",
    plan_code_label: "Plan Code",
  },
  ui: {
    title: "Logistics Carbon Footprint",
    description:
      "Intelligently analyze transportation routes with AI, automatically dividing land, sea, and air segments, and estimating mileage and carbon emissions based on IPCC standards.",
    not_generated: "Analysis report not generated yet",
    config_title: "Parameter Configuration & Analysis Control",
    route_description: "Transportation Route Description",
    route_placeholder:
      "e.g., Transport goods from Taipei City to New York, USA",
    advanced_config: "Advanced Manual Parameter Configuration (Optional)",
    origin_lat: "Origin Latitude",
    origin_lng: "Origin Longitude",
    dest_lat: "Destination Latitude",
    dest_lng: "Destination Longitude",
    total_weight: "Total Weight (KG)",
    land_route: "Land Route Plan",
    sea_route: "Sea Multimodal Transport",
    air_route: "Air Multimodal Transport",
    exporting: "Exporting...",
    export_report: "Export Report",
    calculating: "Calculating...",
    generate_report: "Generate Analysis Report",
    login_to_generate: "Please login to generate analysis report",
    login_to_use:
      "Please login first to use the transportation carbon footprint feature",
    tab_analysis: "Carbon Accounting",
    tab_history: "Historical Reports",
    tab_mileage: "Mileage",
    empty_plan:
      "Detailed route plan is not available for this history record. Please regenerate the report.",
    auto: "Auto Detect",
  },
  history: {
    title: "Historical Analysis Paths",
  },
  plan_section: {
    mode_land: "Land Route",
    mode_sea: "Sea Route",
    mode_air: "Air Route",
    title_custom: "Custom Multimodal Route",
    title_sea_land_air: "Sea-Land-Air Multimodal Plan",
    transit_airport: "Transit Airport",
    title_land: "Land Transport Plan",
    title_sea: "Sea Transport Plan",
    title_air: "Air Transport Plan",
    origin_port: "Origin Port",
    dest_port: "Destination Port",
    origin_airport: "Origin Airport",
    dest_airport: "Destination Airport",
    origin: "Origin",
    dest: "Destination",
    total_emissions_est: "{{title}} Total Carbon Emissions Estimate",
    total_weight: "Total Weight",
    metric_ton: "Metric Tons",
    coefficient_disclosure:
      "Carbon Emission Coefficient and Formula Disclosure",
    formula:
      "Formula: Total Mileage (km) × (Weight (kg) / 1000) × Emission Coefficient",
    source: "Data Source",
    section_analysis: "{{title}} Segment Analysis",
    est_mileage: "Estimated Mileage:",
    emission_coefficient: "Emission Coefficient:",
    carbon_emissions: "Carbon Emissions",
    fallback_estimate_badge: "Estimated",
    fallback_estimate_hint:
      "Road network data does not cover this area; estimated as straight-line distance × 1.2",
  },
  mileage_calculator: {
    title_paste: "Paste Text for AI Parsing",
    placeholder:
      "Please paste logistics text containing origin and destination, e.g., 'Departing from Taipei, delivering to Kaohsiung'...",
    btn_ai_parse: "AI Auto Parse",
    title_manual: "Manual Entry and Analysis List",
    origin_desc: "Origin Description",
    dest_desc: "Destination Description",
    btn_add: "Add to List",
    col_id: "ID",
    col_origin: "Origin",
    col_dest: "Destination",
    col_mileage: "Mileage (KM)",
    col_status: "Status",
    col_action: "Action",
    btn_calculate: "Start Calculation",
    btn_delete: "Delete",
    err_required: "Both origin and destination are required",
    err_calc_failed: "Calculation failed, please try again later.",
    err_parse_failed: "Parsing Failed",
    err_no_valid_routes: "Could not parse valid origin/destination from file.",
    err_waypoints_incomplete_title: "Incomplete Waypoint Data",
    err_waypoints_incomplete_msg:
      "Some waypoints have missing coordinates. Please use auto-parse or manually enter the coordinates before retrying.",
    label_waypoints_optional: "Waypoints (Optional)",
    btn_setup: "Setup...",
    col_waypoints: "Waypoints",
    waypoint_modal_title: "Waypoint Settings",
    waypoint_modal_empty: "No waypoints. Click the button below to add.",
    waypoint_modal_placeholder:
      "Enter location, e.g. Singapore or Port of Rotterdam",
    waypoint_modal_auto_parse: "Auto Parse Coordinates",
    waypoint_modal_auto_parse_short: "Auto Parse",
    waypoint_modal_lat: "Latitude",
    waypoint_modal_lng: "Longitude",
    waypoint_modal_add: "Add Waypoint",
    waypoint_modal_confirm: "Confirm",
    empty_list: "No items yet. Please add manually or paste text to parse.",
    col_mode: "Transport Mode",
    mode_auto: "AI Auto-Detect",
    mode_LAND: "Pure Land",
    mode_AIR_LAND: "Air-Land Intermodal",
    mode_SEA_LAND: "Sea-Land Intermodal",
    mode_SEA_LAND_AIR: "Sea-Land-Air Intermodal",
    recalculate: "Recalculate",
    short_land: "Land",
    short_sea: "Sea",
    short_air: "Air",
    csv_total_dist: "Total Distance (km)",
    csv_land_dist: "Land (km)",
    csv_sea_dist: "Sea (km)",
    csv_air_dist: "Air (km)",
    csv_pdf_file: "PDF File",
  },
  map: {
    maptiler_key_not_set: "MapTiler Key is not set!",
    origin: "Origin",
    dest: "Destination",
    label: "🟢 ESG Logistics Carbon Trace (Powered by MapLibre)",
  },
  // Info: (20260724 - Tzuhan) Export options modal (requirement 2)
  methodology: {
    title: "How the figures are calculated",
    intro:
      "The sections below explain where every number comes from. If you only need to know how far the conclusions can be trusted, go straight to section 11, Known limitations.",
    limits_title: "Read this before using these numbers",
    read_full: "Read the full calculation method",
    highlights: [
      "The scope covers **transport only**: no warehousing, handling or packaging, and nothing from the production or disposal of the goods themselves. This number is not a full product life-cycle carbon footprint.",
      "The road network **currently covers Taiwan only**: land legs elsewhere are estimated as great-circle distance x {{landTortuosity}} and marked Estimated in the report. Where a route is mostly non-Taiwan land transport, that estimation error goes straight into the result.",
      "The sea and air factors were **produced for the United States** (published 2016 and 2017), and the air distance excludes routing detours and high-altitude radiative forcing, so the real impact is higher than the figure reported here.",
    ],
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
              "The great-circle distance is multiplied by a tortuosity factor of {{landTortuosity}} and marked Estimated in the report. The factor reflects how far real roads typically deviate from a straight line and is not calibrated per route.",
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
              "The great-circle distance is multiplied by a tortuosity factor of {{seaTortuosity}} and marked Estimated. The sea factor exceeds the road factor because lanes are constrained by landmasses and straits, producing greater deviation.",
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
    title: "How to Use",
    subtitle:
      "From a one-sentence route description to a deliverable PDF and CSV — the whole workflow is here, followed by how every number is calculated and where its limits are.",
    nav_title: "On this page",
    figure_note:
      "The figures are interface illustrations: redrawn from the components and strings the screen actually uses, so they follow the interface language and the light/dark theme. They are not screen captures of one particular release. Numbers on a figure map to the notes below it.",
    figure_caption: "Illustration: {{title}}",
    start_cta: "Start carbon accounting",
    empty_cta: "First time here? Read the guide",
    chapters: [
      {
        id: "overview",
        title: "1. What each of the four tabs is for",
        summary:
          "Get oriented first. This tool splits four different jobs across four tabs, and being on the wrong tab is the most common place people get stuck.",
        steps: [
          {
            id: "overview_tabs",
            title: "Division of labour between tabs",
            body: "Carbon Accounting computes emissions for one route, Mileage computes distances for many routes, Historical Reports holds completed analyses, and How to Use is this page.",
            figure: GUIDE_FIGURE_ID.TABS,
            callouts: [
              "**Carbon Accounting**: enter one origin/destination pair and a weight to get a full report with map, per-leg mileage and emissions, exportable as PDF. Each generation costs {{analysisCost}} credits.",
              "**Mileage**: handles many routes at once from pasted text or an Excel/CSV import, and returns distances only. Useful for surveying routes before deciding which ones deserve a full accounting.",
              "**Historical Reports**: lists past analyses; reload or export them without recomputing and without spending credits again.",
              "**How to Use**: this page. Switching tabs does not clear anything you have already typed.",
            ],
            notes: [
              "The active tab lives in the ?tab= query parameter, so a link to any tab can be sent to a colleague as-is.",
            ],
          },
        ],
      },
      {
        id: "analysis",
        title: "2. Carbon Accounting: from one sentence to one report",
        summary: "One route, one report, four steps.",
        steps: [
          {
            id: "analysis_describe",
            title: "Describe the route, or enter coordinates directly",
            body: "Write the origin, destination and weight in one sentence under Transportation Route Description, then press Generate Analysis Report. The system first asks the AI to extract the parameters from that sentence; this step costs nothing.",
            figure: GUIDE_FIGURE_ID.ANALYSIS_INPUT,
            callouts: [
              "**Transportation Route Description**: one sentence is enough, e.g. transport 5000 kg of slate from Sun Yat-sen Memorial Hall in Taipei to the Manchester Museum. The AI only turns text into an origin, a destination and a weight; every distance and emission figure comes from the deterministic rule engine on the backend.",
              "**Advanced Manual Parameter Configuration**: expand it when you need exact coordinates and fill in latitude, longitude and total weight. Once all five fields are filled, the manual values win and **the AI parser is not called at all**.",
              "**Generate Analysis Report**: parses first, then opens the payment confirmation. After parsing, the advanced panel expands automatically so you can check the extracted coordinates and weight before paying.",
            ],
            notes: [
              "Typing in the description field clears any coordinates and weight already entered. This prevents the inconsistent state where the description says New York while the coordinates are still last run's Tokyo.",
              "If the parse is wrong, edit the numbers in the advanced panel — there is no need to rewrite the sentence.",
            ],
          },
          {
            id: "analysis_pay",
            title: "Confirm the charge",
            body: "Once the parameters are complete a payment confirmation appears. This is the only place credits are spent — parsing, switching tabs and browsing history are all free.",
            figure: GUIDE_FIGURE_ID.ANALYSIS_PAYMENT,
            callouts: [
              "**Credits required**: {{analysisCost}} credits per analysis. If you belong to a team with quota, the team quota is charged first; the dialog shows the actual funding source and the balance.",
              "**Pay and generate**: starts the calculation. Running the same parameters again costs another charge, which is why it is worth checking the coordinates and weight in the previous step.",
            ],
          },
          {
            id: "analysis_read",
            title: "Read the report",
            body: "The report is organised by plan: land-only, sea multimodal, air multimodal and sea-land-air multimodal each get their own card with a map, per-leg mileage and emissions.",
            figure: GUIDE_FIGURE_ID.ANALYSIS_REPORT,
            callouts: [
              "**Plan switches**: only applicable plans appear. A plan is dropped when the two ports are closer than {{minSeaKm}} km, the two airports closer than {{minAirKm}} km, or when driving is no longer than the multimodal alternative.",
              "**The plan code** (e.g. R01-SEA) runs through the screen, the PDF filename and every CSV row; it is the single index that ties the three together.",
              "A leg marked **Estimated** means routing failed and the distance is the great-circle distance times a tortuosity factor (land ×{{landTortuosity}}, sea ×{{seaTortuosity}}). When reviewing a report, count these first.",
              "**Total emissions** are computed on the backend at unrounded precision, so adding up the displayed legs can differ from the total by a few decimals; the report discloses that difference and its source.",
              "**The factor and formula** are always disclosed inside the report: total distance (km) × (weight (kg) / 1000) × the factor for that mode.",
            ],
            notes: [
              "A missing plan is not a missing calculation. The applicability check removes inapplicable plans entirely rather than handing you a report full of zeroes; the rules are in section 9 below.",
            ],
          },
          {
            id: "analysis_export",
            title: "Export PDF and CSV",
            body: "Pressing Export Report — either on the report or in the history list — opens a selection dialog for which plans to export and whether to include emission figures.",
            figure: GUIDE_FIGURE_ID.EXPORT_MODAL,
            callouts: [
              "**Plan selection**: only plans applicable to this route are listed. Each plan produces its own PDF, and multiple files are packed into a ZIP.",
              "**Calculate CO2 equivalent**: clear it and neither the PDF nor the CSV will contain any emission figure — only routes and distances.",
              "**The emission factor set** is a disclosure, not a choice: what you see is the set the calculation actually used. To apply a different set, clear the option above, take the distance-only CSV and apply your own factors.",
              "The exported summary.csv carries full precision and the plan code, so it can be reconciled row by row against the PDF of the same name.",
            ],
            notes: [
              "During export a full-screen progress overlay covers the page. That is there to keep the underlying content out of the capture, not a freeze.",
            ],
          },
        ],
      },
      {
        id: "mileage",
        title: "3. Mileage: many routes in one pass",
        summary:
          "Use this when you only need distances, or when there are dozens of routes to process at once.",
        steps: [
          {
            id: "mileage_run",
            title: "Build the list and compute mileage",
            body: "Paste text for the AI to parse, add rows manually, or import an Excel/CSV file. Once the list is ready, Start Mileage Calculation processes all of it in one go.",
            figure: GUIDE_FIGURE_ID.MILEAGE_FLOW,
            callouts: [
              "**Paste text for automatic parsing**: drop in a whole shipping note or email body and press AI Auto Parse to break it into origin/destination rows.",
              "**Waypoints (optional)**: set intermediate stops here. Every waypoint needs coordinates — auto-parse can fetch them, and a waypoint without coordinates stops the calculation with a prompt.",
              "**Batch import**: accepts .xlsx, .xls and .csv. The import maps your file's columns onto origin, destination and waypoints, so no fixed column names are required.",
              "**Transport mode**: defaults to AI Auto Detect, or force land-only, sea-land, air-land or sea-land-air.",
              "**Start Mileage Calculation**: submits the whole list at once. Results can then be exported row by row or in bulk, through the same export flow as carbon accounting.",
            ],
            notes: [
              "Mileage results are also written to Historical Reports, and reloading one switches back to the Mileage tab automatically.",
            ],
          },
        ],
      },
      {
        id: "history",
        title: "4. Historical Reports: revisit and re-export",
        summary:
          "Completed analyses stay here; reviewing and exporting them costs no further credits.",
        steps: [
          {
            id: "history_reopen",
            title: "Reload or export directly",
            body: "The list is ordered by time and only COMPLETED rows can be loaded. Loading switches to the matching tab and restores the origin, destination and weight used at the time.",
            figure: GUIDE_FIGURE_ID.HISTORY_TABLE,
            callouts: [
              "**Type** tells carbon accounting apart from mileage — the two load into different tabs. A mileage run covering several routes can be expanded row by row.",
              "**Load** reopens the original report for review, with no recomputation and no charge.",
              "**Export Report** loads the record and opens the export dialog straight away, which is what you want when all you need is another copy of the PDF.",
            ],
            notes: [
              "After loading, the URL carries analysisId, so the link can be shared as-is and the browser Back button returns precisely to the list.",
            ],
          },
        ],
      },
      {
        id: "troubleshoot",
        title: "5. Common situations",
        summary: "All of the following are by design, not faults.",
        steps: [
          {
            id: "trouble_missing_plan",
            title: "A transport plan does not appear",
            body: "The applicability check ruled it out: the two ports are closer than {{minSeaKm}} km, the two airports closer than {{minAirKm}} km, or driving is no longer than that multimodal plan. The plan is then omitted entirely rather than reported as zero.",
          },
          {
            id: "trouble_estimate",
            title: "An Estimated badge appears next to a distance",
            body: "Routing did not succeed for that leg, so the distance is the great-circle distance times a tortuosity factor (land ×{{landTortuosity}}, sea ×{{seaTortuosity}}). The road network **currently covers Taiwan only**, so land legs outside Taiwan are almost always estimates.",
          },
          {
            id: "trouble_total_mismatch",
            title: "The legs do not add up to the total",
            body: "The total is computed on the backend at unrounded precision while the displayed legs are rounded to two decimals, so their sum naturally differs. The report discloses the difference; for full precision use the exported summary.csv.",
          },
          {
            id: "trouble_no_payment",
            title: "Generate Analysis Report does not open the payment dialog",
            body: "Incomplete parameters never reach payment. Check that the description field has content, or that all five advanced fields are filled; the error message appears under the configuration card.",
          },
        ],
      },
    ],
  },
  export_options: {
    title: "Select Plans to Export",
    description:
      "Check the plan types to export. Only plans applicable to this route are listed.",
    plan_land: "Land Only",
    plan_sea: "Including Sea (Sea-Land Multimodal)",
    plan_air: "Including Air (Air-Land Multimodal)",
    plan_custom: "Custom Multimodal",
    plan_seaLandAir: "Sea-Land-Air (land→sea→land→air→land)",
    include_co2e: "Calculate CO2e",
    include_co2e_hint:
      "Uncheck to export routes and distances only. No emission figures will appear in the PDF or CSV.",
    factor_set: "Emission factor set",
    factor_set_hint:
      "To use a different factor set, uncheck the option above: the exported CSV lists each leg's distance and weight so you can apply your own.",
    split_hint:
      "Each plan is exported as a separate PDF; multiple files are bundled into a ZIP.",
    confirm: "Export",
    progress: "Generating report {{current}} / {{total}}...",
  },
};
