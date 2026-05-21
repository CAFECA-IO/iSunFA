import {
  ESG_DETERMINISTIC_RULES,
  IEmissionFactorRule,
} from "@/constants/rules/esg_deterministic_rules";

export class EmissionFactorRegistry {
  private static taxIdIndex: Map<string, IEmissionFactorRule> = new Map();

  static {
    for (const rule of ESG_DETERMINISTIC_RULES) {
      for (const taxId of rule.taxIds) {
        this.taxIdIndex.set(taxId, rule);
      }
    }
  }

  static matchCategory(
    vendorTaxIdStr?: string | null,
    vendorNameStr?: string | null,
  ): string | null {
    if (vendorTaxIdStr) {
      const matched = this.taxIdIndex.get(vendorTaxIdStr);
      if (matched) return matched.fallbackCategory;
    }

    if (vendorNameStr) {
      const normalizedVendor = vendorNameStr.toLowerCase().replace(/\s+/g, "");
      if (normalizedVendor) {
        for (const rule of ESG_DETERMINISTIC_RULES) {
          const matchFound = rule.aliases.some((alias) =>
            normalizedVendor.includes(alias.toLowerCase().replace(/\s+/g, "")),
          );
          if (matchFound) return rule.fallbackCategory;
        }
      }
    }

    return null;
  }
}
