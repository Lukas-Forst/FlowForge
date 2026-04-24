import type { FxQuality } from "../scene/postfx/qualityController";

export function isChromiumBased(): boolean {
  const nav = navigator as Navigator & {
    userAgentData?: { brands: { brand: string }[] };
  };
  const brands = nav.userAgentData?.brands;
  if (brands) {
    return brands.some(
      (b) =>
        b.brand === "Chromium" ||
        b.brand === "Google Chrome" ||
        b.brand === "Microsoft Edge",
    );
  }
  return "chrome" in window || /Edg\//.test(navigator.userAgent);
}

export function getDefaultFxQuality(): FxQuality {
  const param = new URLSearchParams(location.search).get("fx");
  if (param === "full" || param === "lite") return param;
  return isChromiumBased() ? "lite" : "full";
}
