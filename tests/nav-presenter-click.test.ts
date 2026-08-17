/**
 * n5 Phone: pressEnd on a nested EpisodeRow must post presenterOps (push Episode).
 * Gallery Home/EpisodeRow cards have no capture — only the screen does.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { applyPresenterOps } from "../playground/src/presenter-pins.js";
import { renderBakedDesignToHtmlDocumentWithReport } from "../src/renderHtml.js";

const ENTRY = "test-fixtures/pdl/lab/nav/n5_cover.pdl";
const PDL = existsSync("target/debug/pdl")
  ? ["target/debug/pdl"]
  : ["cargo", "run", "-q", "-p", "pdl-cli", "--"];

function pdl(args: string[]) {
  const r = spawnSync(PDL[0]!, [...PDL.slice(1), ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || args.join(" "));
  return r.stdout;
}

function catalogue() {
  return JSON.parse(pdl(["catalogue", ENTRY])) as {
    components: Record<string, { interactions?: unknown; emitCaptures?: unknown }>;
  };
}

function bakePhone() {
  return JSON.parse(pdl(["bakeComponent", ENTRY, "Phone"]));
}

function bakePhoneCovered() {
  const pins = JSON.stringify({
    presenter: {
      stack: [
        { component: "Home", params: {} },
        { component: "Episode", params: { episodeId: "demo" } },
      ],
      cover: { component: "Settings", params: {} },
    },
  });
  return JSON.parse(pdl(["bakeComponent", ENTRY, "Phone", "--presenterPins", pins]));
}

async function mountPhone() {
  const cat = catalogue();
  const interactionsByComponent: Record<string, unknown> = {};
  const emitCapturesByComponent: Record<string, unknown> = {};
  for (const [name, c] of Object.entries(cat.components || {})) {
    if (c.interactions) interactionsByComponent[name] = c.interactions;
    if (c.emitCaptures) emitCapturesByComponent[name] = c.emitCaptures;
  }
  const bake = bakePhone();
  const { html } = renderBakedDesignToHtmlDocumentWithReport(bake as never, {
    title: "t",
    singleComponent: "Phone",
    interactiveHost: true,
    interactionsByComponent: interactionsByComponent as never,
    emitCapturesByComponent: emitCapturesByComponent as never,
    componentRolesByComponent: { Phone: "screen" },
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

describe("n5 Phone presenter click", () => {
  it("pressEnd on Phone's EpisodeRow posts push Episode", async () => {
    const { window, document, html, messages } = await mountPhone();
    expect(html).toContain('data-pdl-component="Phone"');
    expect(html).toContain("pdl-presenter");
    expect(html).toContain("flex:1 1 0%");
    expect(html).toContain('data-pdl-interactive="1"');

    const rows = [...document.querySelectorAll('[data-pdl-instance-of="EpisodeRow"]')];
    expect(rows.length).toBe(2);
    const late = rows.find((n) => {
      try {
        const kw = JSON.parse(n.getAttribute("data-pdl-instance-kwargs") || "{}");
        return kw.episodeId === "late" || kw.episodeId === ".late";
      } catch {
        return false;
      }
    });
    expect(late).toBeTruthy();

    late!.dispatchEvent(new window.MouseEvent("mousedown", { button: 0, bubbles: true }));
    late!.dispatchEvent(new window.MouseEvent("mouseup", { button: 0, bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));

    const ix = messages.find(
      (m) =>
        (m as { type?: string }).type === "pdl-interaction" &&
        (m as { event?: string }).event === "pressEnd" &&
        (m as { childComponent?: string }).childComponent === "EpisodeRow",
    ) as {
      presenterOps?: Array<{ name?: string; page?: { component?: string; params?: { episodeId?: string } } }>;
      unhandledAncestors?: boolean;
    };
    expect(ix).toBeTruthy();
    expect(ix.unhandledAncestors).toBeFalsy();
    expect(ix.presenterOps?.[0]?.name).toBe("push");
    expect(ix.presenterOps?.[0]?.page?.component).toBe("Episode");
    expect(String(ix.presenterOps?.[0]?.page?.params?.episodeId)).toMatch(/late/);

    const next = applyPresenterOps(
      { presenter: { stack: [{ component: "Home", params: {} }] } },
      ix.presenterOps ?? [],
    ) as { presenter: { stack: Array<{ component: string }> } };
    expect(next.presenter.stack.map((e) => e.component)).toEqual(["Home", "Episode"]);
  }, 20_000);

  it("screen preview chrome posts pdl-screen-reset", async () => {
    const { document, html, messages } = await mountPhone();
    expect(html).toContain('data-pdl-screen-reset="Phone"');
    const btn = document.querySelector('[data-pdl-screen-reset="Phone"]');
    expect(btn).toBeTruthy();
    (btn as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 10));
    expect(messages.some((m) => (m as { type?: string }).type === "pdl-screen-reset")).toBe(true);
  }, 20_000);

  it("cover HTML keeps Episode behind a centered Settings card", () => {
    const bake = bakePhoneCovered();
    const presenter = bake.components.Phone.root.children[0];
    expect(presenter.kind).toBe("presenter");
    expect(presenter.props.cover).toBe("Settings");
    expect(presenter.children[0].instanceOf).toBe("Episode");
    expect(presenter.children[1].instanceOf).toBe("Settings");

    const { html } = renderBakedDesignToHtmlDocumentWithReport(bake as never, {
      title: "t",
      singleComponent: "Phone",
    });
    expect(html).toContain("pdl-presenter__cover");
    expect(html).toContain("display:grid");
    expect(html).toContain('data-pdl-instance-of="Episode"');
    expect(html).toContain('data-pdl-instance-of="Settings"');
  }, 20_000);
});
