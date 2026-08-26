/**
 * Canvas stage color-token resolution.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resolveCssColor } from "../apps/studio/src/canvas/tokens.js";
import { state } from "../apps/studio/src/state.js";

describe("canvas token resolveCssColor", () => {
  const prevCat = state.catalogue;
  const prevTheme = state.theme;

  beforeEach(() => {
    state.theme = "";
    state.catalogue = {
      tokenTables: {
        primitives: {
          "mana.color.ink": {
            name: "mana.color.ink",
            tokenType: "Color",
            definition: { kind: "hex", value: "#112233" },
          },
        },
        semantics: {
          "mana.color.label": {
            name: "mana.color.label",
            tokenType: "Color",
            definition: "primitive:mana.color.ink",
          },
        },
        themes: {
          Dark: {
            overrides: {
              "mana.color.ink": { kind: "hex", value: "#EEEEEE" },
            },
          },
        },
      },
    };
  });

  afterEach(() => {
    state.catalogue = prevCat;
    state.theme = prevTheme;
  });

  it("passes hex through", () => {
    expect(resolveCssColor("#0F6E56").css).toBe("#0F6E56");
  });

  it("resolves semantic → primitive → hex", () => {
    expect(resolveCssColor("mana.color.label").css).toBe("#112233");
  });

  it("applies opacityOf syntax", () => {
    expect(resolveCssColor("mana.color.label @ 0.5").css).toBe("rgba(17,34,51,0.5)");
  });

  it("honors theme overrides", () => {
    state.theme = "Dark";
    expect(resolveCssColor("mana.color.label").css).toBe("#EEEEEE");
  });

  it("reports unresolved names", () => {
    const r = resolveCssColor("mana.color.missing");
    expect(r.css).toBeNull();
    expect(r.unresolved).toBe("mana.color.missing");
  });
});
