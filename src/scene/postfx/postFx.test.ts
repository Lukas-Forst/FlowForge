import { describe, expect, it } from "vitest";
import { pickFxQuality } from "./qualityController";

describe("postfx auto downgrade", () => {
  it("switches to lite when fps drops", () => {
    expect(pickFxQuality("full", 40)).toBe("lite");
  });
});
