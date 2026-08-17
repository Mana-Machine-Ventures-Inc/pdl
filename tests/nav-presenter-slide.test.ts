/**
 * n8 Phone: pressEnd posts push with an evaluated PresentationMotion.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { applyPresenterOps, resolvePairMove } from "../playground/src/presenter-pins.js";
import { renderBakedDesignToHtmlDocumentWithReport } from "../src/renderHtml.js";

const ENTRY = "test-fixtures/pdl/lab/nav/n8_slide.pdl";
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

describe("n8 Phone pair slide", () => {
  it("catalogue stamps evaluated move / dismissMove on push", () => {
    const cat = catalogue();
    const caps = (cat.components.Phone.emitCaptures ?? []) as Array<{
      channel?: string;
      body?: Array<{ kind?: string; name?: string; move?: { kind?: string; incoming?: { translateX?: number } }; dismissMove?: { kind?: string; outgoing?: { translateX?: number } } }>;
    }>;
    const show = caps.find((c) => c.channel === "showEpisode");
    const verb = show?.body?.find((b) => b.kind === "presenterVerb");
    expect(verb?.name).toBe("push");
    expect(verb?.move?.kind).toBe("presentationMotion");
    expect(verb?.move?.incoming?.translateX).toBe(390);
    expect(verb?.dismissMove?.kind).toBe("presentationMotion");
    expect(verb?.dismissMove?.outgoing?.translateX).toBe(390);
  }, 20_000);

  it("pressEnd posts push with move; pop resolves dismissMove", async () => {
    const { window, document, html, messages } = await mountPhone();
    expect(html).toContain("pdl-presenter");
    const rows = [...document.querySelectorAll('[data-pdl-instance-of="EpisodeRow"]')];
    expect(rows.length).toBe(2);
    const morning = rows[0]!;
    morning.dispatchEvent(new window.MouseEvent("mousedown", { button: 0, bubbles: true }));
    morning.dispatchEvent(new window.MouseEvent("mouseup", { button: 0, bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));

    const ix = messages.find(
      (m) =>
        (m as { type?: string }).type === "pdl-interaction" &&
        (m as { event?: string }).event === "pressEnd" &&
        (m as { childComponent?: string }).childComponent === "EpisodeRow",
    ) as {
      presenterOps?: Array<{
        name?: string;
        move?: { kind?: string };
        dismissMove?: { kind?: string };
      }>;
    };
    expect(ix).toBeTruthy();
    expect(ix.presenterOps?.[0]?.name).toBe("push");
    expect(ix.presenterOps?.[0]?.move?.kind).toBe("presentationMotion");
    expect(ix.presenterOps?.[0]?.dismissMove?.kind).toBe("presentationMotion");

    const pins = applyPresenterOps(
      { presenter: { stack: [{ component: "Home", params: {} }] } },
      ix.presenterOps ?? [],
    ) as {
      presenter: {
        stack: Array<{ component: string }>;
        lastDismissMove?: { kind?: string; outgoing?: { translateX?: number } };
      };
    };
    expect(pins.presenter.stack.map((e) => e.component)).toEqual(["Home", "Episode"]);
    expect(pins.presenter.lastDismissMove?.kind).toBe("presentationMotion");
    expect(pins.presenter.lastDismissMove?.outgoing?.translateX).toBe(390);

    const popMove = resolvePairMove([{ qualifier: "presenter", name: "pop" }], pins);
    expect(popMove && typeof popMove === "object" && (popMove as { kind?: string }).kind).toBe(
      "presentationMotion",
    );
  }, 20_000);
});
