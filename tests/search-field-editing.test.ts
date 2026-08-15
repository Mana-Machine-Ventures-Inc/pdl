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

function bakeComposer(overrides: string[] = []) {
  const r = spawnSync(
    "cargo",
    ["run", "-q", "-p", "pdl-cli", "--", "bakeComponent", ENTRY, "PlaylistComposer", ...overrides],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(r.stderr || "composer bake failed");
  return JSON.parse(r.stdout);
}

describe("SearchField root editing chrome", () => {
  it("bake isEditing=true uses accent border + #000 background (no placeholder)", () => {
    const bake = bakeSearchField(["isEditing=true"]);
    const props = bake.components.SearchField.root.props;
    expect(String(props.borderColor).toUpperCase()).toMatch(/F59E0B|#F59E0B/i);
    expect(Number(props.borderWidth)).toBe(2);
    expect(String(props.background).toUpperCase()).toMatch(/#000|#000000/i);
    expect(props.content === "" || props.content == null).toBe(true);
  });

  it("click beginEditing requests parent rebake (previewHandled false)", async () => {
    const bake = bakeSearchField(["isEditing=false"]);
    const { window, document, messages, html } = await mountInteractive(bake);
    expect(html).toMatch(/Search tracks/);

    const hit =
      (document.querySelector("[data-pdl-press-activate]") as HTMLElement | null) ||
      (document.querySelector("input.pdl-text--editable") as HTMLInputElement | null);
    expect(hit).toBeTruthy();
    hit!.dispatchEvent(new window.MouseEvent("mousedown", { button: 0, bubbles: true }));
    hit!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
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
    const el = section.querySelector(".pdl-preview-params")!;
    const live = JSON.parse(
      el.getAttribute("data-json") ||
        el.querySelector(".pdl-preview-params-line")?.textContent ||
        el.textContent ||
        "{}",
    );
    expect(live.isEditing).toBe(true);
  });
});

describe("PlaylistComposer nested search session", () => {
  it("editingSearch=true paints Search writable (not readonly)", () => {
    const bake = bakeComposer(["editingSearch=true", "searchQuery=kite"]);
    const { html } = renderBakedDesignToHtmlDocumentWithReport(bake, {
      title: "t",
      singleComponent: "PlaylistComposer",
      interactiveHost: true,
      editableTypeDefaults: { SearchField: { activatesOn: "press", isEditing: false, value: "" } },
    });
    expect(html).toContain('data-pdl-instance-let="Search"');
    expect(html).toContain("pdl-text--editable");
    expect(html).toContain("#000");
    expect(html).not.toMatch(/data-pdl-instance-let="Search"[^>]*data-pdl-press-activate/);
  });
});
