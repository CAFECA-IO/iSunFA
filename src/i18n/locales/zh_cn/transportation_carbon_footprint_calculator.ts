export const transportationCarbonFootprintCalculator = {
  "default_ai_input": "从台北国父纪念馆运送 5000 公斤的石板到曼彻斯特博物馆",
  "analysis_failed": "分析失败",
  "error": {
    "missing_input": "请输入运输路线描述，或展开进阶设定手动输入完整参数。",
    "ai_parse_failed": "AI 解析失败",
    "missing_params": "无法取得完整参数，请确认 AI 解析结果或手动输入。"
  },
  "payment": {
    "fee_name": "碳足迹分析费用",
    "modal_label": "物流碳足迹分析",
    "modal_value": "物流分析"
  },
  "pdf": {
    "generating_title": "正在生成高画质 PDF...",
    "generating_desc": "这可能需要几秒钟的时间，请稍候",
    "generating_title_large": "正在为您产生高画质 PDF 报告",
    "generating_desc_large_1": "系统正在撷取地图路线与详细分析数据...",
    "generating_desc_large_2": "由于包含高画质渲染内容，这可能需要几秒钟的时间，请稍候片刻。",
    "error_failed": "生成 PDF 失败，错误讯息：",
    "error_unknown": "未知错误",
    "mode_land": "纯陆运",
    "mode_sea": "海运多式联运",
    "mode_air": "空运多式联运",
    "origin": "起点",
    "dest": "终点",
    "footer": "页码 {{current}} / {{total}} • 路线：{{origin}} ➝ {{dest}}",
    "section_analysis": "专属区段分析",
    "weight_label": "总重: {{weight}} KG",
    "watermark": "iSunFA CONFIDENTIAL"
  },
  "ui": {
    "title": "物流碳足迹",
    "description": "透过 AI 智能分析运输路线，自动分割陆运、海运与空运路段，并依据 IPCC 基准估算各区段里程与碳排放量。",
    "not_generated": "分析报告尚未生成",
    "config_title": "参数配置与分析控制",
    "route_description": "运输路线描述",
    "route_placeholder": "例如：从台北市运送货物到美国纽约",
    "advanced_config": "进阶参数手动配置 (可选)",
    "origin_lat": "起点纬度",
    "origin_lng": "起点经度",
    "dest_lat": "终点纬度",
    "dest_lng": "终点经度",
    "total_weight": "总重 (KG)",
    "land_route": "纯陆运方案",
    "sea_route": "海运多式联运",
    "air_route": "空运多式联运",
    "exporting": "汇出中...",
    "export_report": "汇出报告",
    "calculating": "运算中...",
    "generate_report": "产生分析报告",
    "login_to_generate": "请先登入以产生分析报告"
  }
};
