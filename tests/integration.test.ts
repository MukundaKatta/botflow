import { describe, it, expect } from "vitest";
import { Botflow } from "../src/core.js";

describe("Botflow integration", () => {
  it("handles concurrent ops", async () => {
    const c = new Botflow();
    await Promise.all([c.generate({a:1}), c.generate({b:2}), c.generate({c:3})]);
    expect(c.getStats().ops).toBe(3);
  });
  it("returns service name", async () => {
    const c = new Botflow();
    const r = await c.generate();
    expect(r.service).toBe("botflow");
  });
  it("handles 100 ops", async () => {
    const c = new Botflow();
    for (let i = 0; i < 100; i++) await c.generate({i});
    expect(c.getStats().ops).toBe(100);
  });
});
