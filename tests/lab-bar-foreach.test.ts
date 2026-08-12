/**
 * LabBar ForEach chips: press must rebind parent currentFilter.
 * Regression: host passed instance-let (Root_LabChip_N) while catalogue
 * qualifies ForEach captures as the list name (`chips`) — capture missed.
 */
import { spawnSync } from "node:child_process";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { renderBakedDesignToHtmlDocumentWithReport } from "../src/renderHtml.js";

const ENTRY = "test-fixtures/pdl/playground/lab_world_a.pdl";

function catalogue() {
  const cat = spawnSync("cargo", ["run", "-q", "-p", "pdl-cli", "--", "catalogue", ENTRY], {
    encoding: "utf8",
  });
  if (cat.status !== 0) throw new Error(cat.stderr || "catalogue failed");
  return JSON.parse(cat.stdout) as {
    components: Record<string, { interactions?: unknown; emitCaptures?: unknown }>;
  };
}

function bakeLabBar(overrides: string[] = []) {
  const r = spawnSync(
    "cargo",
    ["run", "-q", "-p", "pdl-cli", "--", "bakeComponent", ENTRY, "LabBar", ...overrides],
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

  // Sanity: ForEach capture is list-qualified, not instance-let.
  const labBarCaps = emitCapturesByComponent.LabBar as Array<{ qualifier?: string; channel?: string }>;
  expect(labBarCaps?.some((c) => c.channel === "select" && c.qualifier === "chips")).toBe(true);

  const { html } = renderBakedDesignToHtmlDocumentWithReport(bake as never, {
    title: "t",
    singleComponent: "LabBar",
    interactiveHost: true,
    interactionsByComponent: interactionsByComponent as never,
    emitCapturesByComponent: emitCapturesByComponent as never,
  });

  const window = new Window({ url: "http://localhost/" });
  const document = window.document;
  document.write(html);
  document.close();

  /** @type {object[]} */
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

describe("LabBar ForEach LabChip", () => {
  it("clicking Podcasts chip rebinds currentFilter via chips-qualified capture", async () => {
    const bake = bakeLabBar(["currentFilter=all"]);
    const { window, document, messages } = await mountInteractive(bake);

    const chips = [...document.querySelectorAll('[data-pdl-instance-of="LabChip"]')];
    expect(chips.length).toBeGreaterThanOrEqual(2);
    const podcasts = chips.find((n) => {
      try {
        const kw = JSON.parse(n.getAttribute("data-pdl-instance-kwargs") || "{}");
        return kw.filter === "podcasts" || kw.filter === ".podcasts";
      } catch {
        return false;
      }
    });
    expect(podcasts).toBeTruthy();
    expect(podcasts!.getAttribute("data-pdl-instance-let")).toMatch(/LabChip/);

    podcasts!.dispatchEvent(new window.MouseEvent("mousedown", { button: 0, bubbles: true }));
    podcasts!.dispatchEvent(new window.MouseEvent("mouseup", { button: 0, bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));

    const ix = messages.find(
      (m) =>
        (m as { type?: string }).type === "pdl-interaction" &&
        (m as { event?: string }).event === "pressEnd",
    ) as {
      changed?: boolean;
      previewHandled?: boolean;
      params?: { currentFilter?: string };
      childParams?: { filter?: string };
    };

    expect(ix).toBeTruthy();
    expect(ix.previewHandled).toBe(false);
    expect(ix.changed).toBe(true);
    expect(String(ix.params?.currentFilter)).toMatch(/podcasts/);
    expect(String(ix.childParams?.filter)).toMatch(/podcasts/);

    const section = document.querySelector("section.pdl-preview")!;
    const live = JSON.parse(section.querySelector(".pdl-preview-params")!.textContent || "{}");
    expect(String(live.currentFilter)).toMatch(/podcasts/);
  });
});
