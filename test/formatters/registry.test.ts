import { describe, it, expect } from "vitest";
import { getFormatter, getStyleNames } from "../../src/lib/citation/registry";

describe("Citation formatter registry", () => {
  it("exposes all 6 style names", () => {
    expect(getStyleNames()).toEqual([
      "apa",
      "chicago",
      "harvard",
      "ieee",
      "oscola",
      "plain",
    ]);
  });

  it("returns the correct formatter for each style", () => {
    for (const name of getStyleNames()) {
      const fmt = getFormatter(name);
      expect(fmt.styleName).toBe(name);
    }
  });

  describe("aliases", () => {
    it("resolves 'apalike' to APA", () => {
      expect(getFormatter("apalike").styleName).toBe("apa");
    });

    it("resolves 'apacite' to APA", () => {
      expect(getFormatter("apacite").styleName).toBe("apa");
    });

    it("resolves 'agsm' to Harvard", () => {
      expect(getFormatter("agsm").styleName).toBe("harvard");
    });

    it("resolves 'dcu' to Harvard", () => {
      expect(getFormatter("dcu").styleName).toBe("harvard");
    });

    it("resolves 'chicagoa' to Chicago", () => {
      expect(getFormatter("chicagoa").styleName).toBe("chicago");
    });

    it("resolves 'ieeetr' to IEEE", () => {
      expect(getFormatter("ieeetr").styleName).toBe("ieee");
    });

    it("resolves 'ieeetran' to IEEE", () => {
      expect(getFormatter("ieeetran").styleName).toBe("ieee");
    });

    it("resolves 'plainnat' to Plain", () => {
      expect(getFormatter("plainnat").styleName).toBe("plain");
    });

    it("resolves 'unsrt' to Plain", () => {
      expect(getFormatter("unsrt").styleName).toBe("plain");
    });
  });

  describe("fallback", () => {
    it("falls back to OSCOLA for unknown style", () => {
      expect(getFormatter("nonexistent").styleName).toBe("oscola");
    });

    it("is case-insensitive", () => {
      expect(getFormatter("OSCOLA").styleName).toBe("oscola");
      expect(getFormatter("APA").styleName).toBe("apa");
    });

    it("trims whitespace", () => {
      expect(getFormatter("  oscola  ").styleName).toBe("oscola");
    });
  });
});
