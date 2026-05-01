export const transportationCarbonFootprintCalculator = {
  "default_ai_input": "Transport 5000 kg of slate from Sun Yat-sen Memorial Hall in Taipei to the Manchester Museum",
  "analysis_failed": "Analysis failed",
  "error": {
    "missing_input": "Please enter a transportation route description, or expand the advanced settings to manually enter the complete parameters.",
    "ai_parse_failed": "AI parsing failed",
    "missing_params": "Unable to obtain complete parameters. Please confirm the AI parsing results or enter them manually."
  },
  "payment": {
    "fee_name": "Carbon Footprint Analysis Fee",
    "modal_label": "Logistics Carbon Footprint Analysis",
    "modal_value": "Logistics Analysis"
  },
  "pdf": {
    "generating_title": "Generating high-quality PDF...",
    "generating_desc": "This may take a few seconds, please wait.",
    "generating_title_large": "Generating high-quality PDF report for you",
    "generating_desc_large_1": "The system is extracting map routes and detailed analysis data...",
    "generating_desc_large_2": "Because it contains high-quality rendered content, this may take a few seconds, please wait a moment.",
    "error_failed": "Failed to generate PDF, error message: ",
    "error_unknown": "Unknown error",
    "mode_land": "Land Route",
    "mode_sea": "Sea Multimodal Transport",
    "mode_air": "Air Multimodal Transport",
    "origin": "Origin",
    "dest": "Destination",
    "footer": "Page {{current}} / {{total}} • Route: {{origin}} ➝ {{dest}}",
    "section_analysis": "Exclusive Section Analysis",
    "weight_label": "Total Weight: {{weight}} KG",
    "watermark": "iSunFA CONFIDENTIAL"
  },
  "ui": {
    "title": "Logistics Carbon Footprint",
    "description": "Intelligently analyze transportation routes with AI, automatically dividing land, sea, and air segments, and estimating mileage and carbon emissions based on IPCC standards.",
    "not_generated": "Analysis report not generated yet",
    "config_title": "Parameter Configuration & Analysis Control",
    "route_description": "Transportation Route Description",
    "route_placeholder": "e.g., Transport goods from Taipei City to New York, USA",
    "advanced_config": "Advanced Manual Parameter Configuration (Optional)",
    "origin_lat": "Origin Latitude",
    "origin_lng": "Origin Longitude",
    "dest_lat": "Destination Latitude",
    "dest_lng": "Destination Longitude",
    "total_weight": "Total Weight (KG)",
    "land_route": "Land Route Plan",
    "sea_route": "Sea Multimodal Transport",
    "air_route": "Air Multimodal Transport",
    "exporting": "Exporting...",
    "export_report": "Export Report",
    "calculating": "Calculating...",
    "generate_report": "Generate Analysis Report",
    "login_to_generate": "Please login to generate analysis report"
  }
};
