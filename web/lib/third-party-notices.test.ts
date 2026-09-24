import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseThirdPartyNotices } from "./third-party-notices";

describe("parseThirdPartyNotices", () => {
  const source = readFileSync(path.join(__dirname, "..", "public", "legal", "THIRD_PARTY_NOTICES.txt"), "utf8");
  const { packages, texts } = parseThirdPartyNotices(source);

  it("lists every inventoried package with its license", () => {
    const inventoryCount = (source.split("LICENSE AND NOTICE TEXTS")[0].match(/^License: /gm) ?? []).length;
    expect(packages).toHaveLength(inventoryCount);
    expect(packages).toContainEqual({ name: "tslib@2.8.1", license: "0BSD" });
  });

  it("keeps each license text with the packages it applies to", () => {
    const sectionCount = (source.match(/^Applies to:$/gm) ?? []).length;
    expect(texts).toHaveLength(sectionCount);
    expect(texts[0].appliesTo).toEqual(["@emnapi/runtime@1.11.3"]);
    expect(texts[0].text).toMatch(/^MIT License/);
    expect(texts.every((notice) => notice.text.length > 0)).toBe(true);
  });
});
