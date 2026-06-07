import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createAdminNavigation } from "./admin-navigation.ts";

describe("createAdminNavigation", () => {
  test("keeps the management shell navigation stable while accepting plugin entries", () => {
    const nav = createAdminNavigation([
      { href: "/tools", label: "Tools", order: 20 },
      { href: "/blog", label: "Blog", order: 10 }
    ]);

    assert.deepEqual(
      nav.map((item) => item.href),
      ["/dashboard", "/api", "/plugins", "/blog", "/tools", "/settings", "/custom-ui"]
    );
    assert.equal(nav.find((item) => item.href === "/dashboard")?.tone, "primary");
    assert.equal(nav.find((item) => item.href === "/tools")?.source, "plugin");
  });

  test("deduplicates plugin links against built-in shell links", () => {
    const nav = createAdminNavigation([
      { href: "/plugins", label: "Duplicate plugins", order: 10 },
      { href: "/storage", label: "Storage", order: 20 }
    ]);

    assert.equal(nav.filter((item) => item.href === "/plugins").length, 1);
    assert.equal(nav.find((item) => item.href === "/storage")?.label, "Storage");
  });
});
