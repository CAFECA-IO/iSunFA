export const esgVerify = {
  title: "Carbon Inventory",
  preview: "Voucher Preview",
  ai_confidence: "AI Conf.",
  no_image: "No Image",
  form: {
    date: "Date",
    scope: "Scope",
    scope_1: "Scope 1 (Direct)",
    scope_2: "Scope 2 (Indirect)",
    scope_3: "Scope 3 (Other)",
    activity_type: "Activity Type",
    activity_object: "Activity Object",
    vendor: "Vendor / Target",
    raw_data: "Raw Data",
    unit: "Unit",
    emissions: "Emissions (kgCO2e)",
    intensity: "Intensity",
    intensity_low: "Low",
    intensity_medium: "Medium",
    intensity_high: "High",
  },
  emissions: {
    title: "Emissions Calculation",
    raw_data: "Raw Data",
    unit: "Unit",
    total: "Total Emissions",
    intensity: "Intensity Level",
    coefficient: "Emission Coefficient",
  },
  actions: {
    cancel_edit: "Cancel Edit",
    save_only: "Save Only",
  },
  close_confirm: {
    title: "Close without saving?",
    message:
      "Review the changes you've made to the ESG records. Are you sure you want to save?",
    confirm: "Confirm Save",
    success: "Verification data saved",
  },
  save_confirm: {
    title: "Save changes?",
    message: "You are about to save the verification changes. Proceed?",
    confirm: "Save",
  },
  esg_industry_benchmarks: {
    spectrum: {
      extremely_high: "Extremely High Carbon",
      very_high: "Very High Carbon",
      high: "High Carbon",
      mid_high: "Mid-High Carbon",
      medium: "Medium",
      mid_low: "Mid-Low Carbon",
      extremely_low: "Extremely Low Carbon",
    },
    industry_1: {
      name: "Petrochemical Industry",
      desc: "Highest: Formosa Petrochemical (3,650 kg). Gap reason: Naphtha cracking and self-built coal cogeneration plants lead to unavoidable chemical fugitive emissions and fossil fuel combustion.",
    },
    industry_2: {
      name: "Cement Industry",
      desc: "Highest: Asia Cement (2,883 kg). Gap reason: High-temperature calcination of limestone directly emits CO2, vulnerable to revenue denominator shrinkage from real estate slumps.",
    },
    industry_3: {
      name: "Power & Energy",
      desc: "High: Mai-Liao Power (2,657 kg) / Low: Taipower (1,068 kg). Gap reason: Mai-Liao is 100% coal-fired; Taipower benefits from diverse energy mix (nuclear, hydro, gas) diluting emission intensity.",
    },
    industry_4: {
      name: "Steel Industry",
      desc: "High: China Steel (520 kg) / Low: Tung Ho Steel (126 kg). Gap reason: Traditional blast furnaces require coal to reduce iron ore; electric arc furnaces melt recycled scrap steel, cutting emissions by 70%.",
    },
    industry_5: {
      name: "Shipping & Transport",
      desc: "High: Ocean Container Shipping / Low: High-speed rail. Gap reason: Heavy oil-burning giant ships are huge Scope 1 emitters, heavily influenced by freight rates; electrified rail performs exceptionally well.",
    },
    industry_6: {
      name: "Telecom & Networking",
      desc: "Highest: Chunghwa Telecom (271.8 kg). Gap reason: Breaks the 'no factory means low carbon' myth. 24/7 5G base stations and IDC cooling chillers are massive power consumers.",
    },
    industry_7: {
      name: "Textiles & Chemical Fibers",
      desc: "Low: Far Eastern New Century (59.2 kg). Gap reason: Traditional dyeing is highly water and energy intensive; FENC reversed this through R-PET recycling technology and diversified holdings.",
    },
    industry_8: {
      name: "Semiconductor Manufacturing",
      desc: "Highest: TSMC (50.1 kg). Gap reason: EUV machines and clean rooms drive massive Scope 2 power consumption, but sky-high chip prices and massive green energy purchases keep intensity low.",
    },
    industry_9: {
      name: "Retail & E-commerce",
      desc: "High: Uni-President (7-11) (37.6 kg) / Low: Momo (23 kg). Gap reason: Physical stores constrained by 24/7 AC and open freezers; E-commerce avoids physical stores but bears logistics fleet & automated warehouse emissions.",
    },
    industry_10: {
      name: "Knowledge & Finance (IC/Software/Banking)",
      desc: "High: Banks (~1.5 kg) / Low: MediaTek (1.86 kg). Gap reason: Business model relies on 'brains and capital'. MediaTek outsources manufacturing; finance has low office emissions but huge uncounted 'financed emissions'.",
    },
  },
};
