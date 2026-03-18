import { describe, it, expect } from "vitest";
import { Botflow } from "../src/core.js";
describe("Botflow", () => {
  it("init", () => { expect(new Botflow().getStats().ops).toBe(0); });
  it("op", async () => { const c = new Botflow(); await c.generate(); expect(c.getStats().ops).toBe(1); });
  it("reset", async () => { const c = new Botflow(); await c.generate(); c.reset(); expect(c.getStats().ops).toBe(0); });
});
