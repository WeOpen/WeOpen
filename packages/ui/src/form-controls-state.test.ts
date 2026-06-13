import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getSelectFieldSummary, toggleSelectFieldValue } from "./form-controls-state.ts";

const options = [
  { label: "Local", value: "local" },
  { label: "Preview", value: "preview" },
  { label: "Production", value: "production" }
];

describe("form control state helpers", () => {
  test("summarizes single and multiple select values", () => {
    assert.equal(getSelectFieldSummary(options, "", "Select an option"), "Select an option");
    assert.equal(getSelectFieldSummary(options, "preview", "Select an option"), "Preview");
    assert.equal(
      getSelectFieldSummary(options, ["local", "production"], "Select environments"),
      "Local, Production"
    );
  });

  test("toggles custom select values by selection mode", () => {
    assert.equal(toggleSelectFieldValue("local", "preview", "single"), "preview");
    assert.deepEqual(toggleSelectFieldValue(["local"], "preview", "multiple"), ["local", "preview"]);
    assert.deepEqual(toggleSelectFieldValue(["local", "preview"], "local", "multiple"), ["preview"]);
  });
});
