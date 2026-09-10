import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("Worker runtime boundary", () => {
  it("serves health through the deployed Worker entrypoint in workerd", async () => {
    const response = await exports.default.fetch(new Request("https://example.com/v1/health"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("talking shit");
  });
});
