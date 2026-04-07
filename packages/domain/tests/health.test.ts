import { describe, expect, it } from "@jest/globals";
import { domainHealth } from "../src";

describe("domainHealth", () => {
  it("returns ok", () => {
    expect(domainHealth()).toBe("ok");
  });
});