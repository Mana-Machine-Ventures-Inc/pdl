/**
 * Root SearchField: beginEditing must rebake so `if isEditing` chrome applies.
 * Regression: dispatchSelf marked previewHandled via dual-bake "rest", so
 * isEditing flipped in the param bag but border/background/placeholder stayed idle.
 */
import { spawnSync } from "node:child_process";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { renderBakedDesignToHtmlDocumentWithReport } from "../src/renderHtml.js";

const ENTRY = "test-fixtures/pdl/systems/playlist-composer-lite/design.pdl";

function catalogue() {
  const cat = spawnSync("cargo", ["run", "-q", "-p", "pdl-cli", "--", "catalogue", ENTRY], {
    encoding: "utf8",
  });
  if (cat.status !== 0) throw new Error(cat.stderr || "catalogue failed");
  return JSON.parse(cat.stdout) as {
    components: Record<string, { interactions?: unknown; emitCaptures?: unknown }>;
  };
}

function bakeSearchField(overrides: string[] = []) {
  const r = spawnSync(
    "cargo",
    ["run", "-q", "-p", "pdl-cli", "--", "bakeComponent", ENTRY, "SearchField", ...overrides],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(r.stderr || "bake failed");
  return JSON.parse(r.stdout);
}

async function mountInteractive(bake: unknown) {
  const cat = catalogue();
  const interactionsByComponent: Record<string, unknown> = {};
  const emitCapturesByComponent: Record<string, unknown> = {};
  for (const [name, c] of Object.entries(cat.components || {})) {
    if (c.interactions) interactionsByComponent[name] = c.interactions;
    if (c.emitCaptures) emitCapturesByComponent[name] = c.emitCaptures;
  }
  const { html } = renderBakedDesignToHtmlDocumentWithReport(bake as never, {
    title: "t",
    singleComponent: "SearchField",
    interactiveHost: true,
    interactionsByComponent: interactionsByComponent as never,
    emitCapturesByComponent: emitCapturesByComponent as never,
  });
  const window = new Window({ url: "http://localhost/" });
  const document = window.document;
  document.write(html);
  document.close();
  const messages: object[] = [];
  window.parent = {
    postMessage(payload: object) {
      messages.push(payload);
    },
  } as never;
  for (const s of [...document.querySelectorAll("script")]) {
    window.eval(s.textContent || "");
  }
  await new Promise((r) => setTimeout(r, 20));
  return { window, document, html, messages };
}

describe("SearchField root editing chrome", () => {
  it("bake isEditing=true uses accent border + ink background (no placeholder)", () => {
    const bake = bakeSearchField(["isEditing=true"]);
    const props = bake.components.SearchField.root.props;
    expect(String(props.borderColor).toUpperCase()).toMatch(/F59E0B|#F59E0B/i);
    expect(Number(props.borderWidth)).toBe(2);
    expect(String(props.background).toUpperCase()).toMatch(/0B1220|#0B1220/i);
    expect(props.content === "" || props.content == null).toBe(true);
  });

  it("click beginEditing requests parent rebake (previewHandled false)", async () => {
    const bake = bakeSearchField(["isEditing=false"]);
    const { window, document, messages, html } = await mountInteractive(bake);
    expect(html).toMatch(/Search tracks/);

    const input = document.querySelector("input.pdl-text--editable") as HTMLInputElement;
    expect(input).toBeTruthy();
    input.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await new Promise((r) => setTimeout(r, 30));

    const ix = messages.find(
      (m) =>
        (m as { type?: string }).type === "pdl-interaction" &&
        (m as { event?: string }).event === "beginEditing",
    ) as {
      previewHandled?: boolean;
      changed?: boolean;
      params?: { isEditing?: boolean };
    };

    expect(ix).toBeTruthy();
    expect(ix.changed).toBe(true);
    expect(ix.previewHandled).toBe(false);
    expect(ix.params?.isEditing).toBe(true);

    const section = document.querySelector("section.pdl-preview")!;
    const live = JSON.parse(section.querySelector(".pdl-preview-params")!.textContent || "{}");
    expect(live.isEditing).toBe(true);
  });
});
