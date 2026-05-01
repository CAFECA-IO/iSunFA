export const transportationCarbonFootprintCalculator = {
  "default_ai_input": "台北の国父紀念館からマンチェスター博物館へ5000キロの石板を輸送する",
  "analysis_failed": "分析失敗",
  "error": {
    "missing_input": "輸送ルートの説明を入力するか、詳細設定を展開して手動で完全なパラメータを入力してください。",
    "ai_parse_failed": "AIの解析に失敗しました",
    "missing_params": "完全なパラメータを取得できません。AIの解析結果を確認するか、手動で入力してください。"
  },
  "payment": {
    "fee_name": "カーボンフットプリント分析費用",
    "modal_label": "物流カーボンフットプリント分析",
    "modal_value": "物流分析"
  },
  "pdf": {
    "generating_title": "高品質のPDFを生成しています...",
    "generating_desc": "これには数秒かかる場合があります。お待ちください",
    "generating_title_large": "高品質のPDFレポートを生成しています",
    "generating_desc_large_1": "システムがマップルートと詳細な分析データを抽出しています...",
    "generating_desc_large_2": "高品質のレンダリングコンテンツが含まれているため、これには数秒かかる場合があります。しばらくお待ちください。",
    "error_failed": "PDFの生成に失敗しました。エラーメッセージ：",
    "error_unknown": "不明なエラー",
    "mode_land": "陸上輸送",
    "mode_sea": "海上複合一貫輸送",
    "mode_air": "航空複合一貫輸送",
    "origin": "出発地",
    "dest": "目的地",
    "footer": "ページ {{current}} / {{total}} • ルート：{{origin}} ➝ {{dest}}",
    "section_analysis": "専用セクション分析",
    "weight_label": "総重量: {{weight}} KG",
    "watermark": "iSunFA CONFIDENTIAL"
  },
  "ui": {
    "title": "物流カーボンフットプリント",
    "description": "AIによるインテリジェントな分析で輸送ルートを解析し、陸上、海上、航空セグメントを自動的に分割し、IPCC基準に基づいてマイレージと炭素排出量を推定します。",
    "not_generated": "分析レポートはまだ生成されていません",
    "config_title": "パラメータ設定と分析コントロール",
    "route_description": "輸送ルートの説明",
    "route_placeholder": "例：台北市からアメリカのニューヨークへ貨物を輸送する",
    "advanced_config": "詳細パラメータの手動設定 (オプション)",
    "origin_lat": "出発地の緯度",
    "origin_lng": "出発地の経度",
    "dest_lat": "目的地の緯度",
    "dest_lng": "目的地の経度",
    "total_weight": "総重量 (KG)",
    "land_route": "陸上輸送プラン",
    "sea_route": "海上複合一貫輸送",
    "air_route": "航空複合一貫輸送",
    "exporting": "エクスポート中...",
    "export_report": "レポートをエクスポート",
    "calculating": "計算中...",
    "generate_report": "分析レポートを生成",
    "login_to_generate": "分析レポートを生成するにはログインしてください"
  },
  "history": {
    "title": "Historical Analysis Paths"
  }
,
  "plan_section": {
    "mode_land": "陸上輸送",
    "mode_sea": "海上輸送",
    "mode_air": "航空輸送",
    "title_land": "陸上輸送プラン",
    "title_sea": "海上輸送プラン",
    "title_air": "航空輸送プラン",
    "origin_port": "出発港",
    "dest_port": "到着港",
    "origin_airport": "出発空港",
    "dest_airport": "到着空港",
    "origin": "出発地",
    "dest": "目的地",
    "total_emissions_est": "{{title}} 総炭素排出量推計",
    "total_weight": "総重量",
    "metric_ton": "トン",
    "coefficient_disclosure": "炭素排出係数と計算式の公開",
    "formula": "計算式：総走行距離(km) × (重量(kg)/1000) × 排出係数",
    "source": "データソース",
    "section_analysis": "{{title}} セグメント分析",
    "est_mileage": "推定走行距離:",
    "emission_coefficient": "排出係数:",
    "carbon_emissions": "炭素排出量"
  }
};