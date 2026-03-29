import { describe, expect, it } from "vitest";
import {
  resolveRecoveredAssetNotice,
  resolveRecoveredSnippetNotice,
} from "./admin-ingestion-structure-recovery";

describe("admin ingestion structure recovery helpers", () => {
  it("formats recovered asset notices by result kind", () => {
    expect(resolveRecoveredAssetNotice(true)).toBe(
      "Recovered a native structured block from the selected crop. Review it, then save the draft.",
    );
    expect(resolveRecoveredAssetNotice(false)).toBe(
      "Recovered inline content from the selected crop. Review it, then save the draft.",
    );
  });

  it("formats recovered snippet notices for replace, append, and fallback flows", () => {
    expect(
      resolveRecoveredSnippetNotice({
        snippetAction: "replace",
        appendFallbackToInsert: false,
      }),
    ).toBe(
      "Re-read the selected snippet and replaced the block content. Review it, then save the draft.",
    );
    expect(
      resolveRecoveredSnippetNotice({
        snippetAction: "append",
        appendFallbackToInsert: false,
      }),
    ).toBe(
      "Recovered content was appended to the selected block. Review it, then save the draft.",
    );
    expect(
      resolveRecoveredSnippetNotice({
        snippetAction: "append",
        appendFallbackToInsert: true,
      }),
    ).toBe(
      "Recovered content used a different block type, so it was inserted below instead of appended.",
    );
    expect(
      resolveRecoveredSnippetNotice({
        snippetAction: "insert_below",
        appendFallbackToInsert: false,
      }),
    ).toBe(
      "Recovered content was inserted below the selected block. Review it, then save the draft.",
    );
  });
});
