/**
 * PlaylistComposer multi-ForEach: chips + tracks both emit `select`.
 * Host must use data-pdl-foreach-list (not instance-let) to pick the capture.
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

function bakeComposer(overrides: string[] = []) {
  const r = spawnSync(
    "cargo",
    [
      "run",
      "-q",
      "-p",
      "pdl-cli",
      "--",
      "bakeComponent",
      ENTRY,
      "PlaylistComposer",
      ...overrides,
    ],
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

  const caps = emitCapturesByComponent.PlaylistComposer as Array<{
    qualifier?: string;
    channel?: string;
  }>;
  expect(caps?.some((c) => c.channel === "select" && c.qualifier === "chips")).toBe(true);
  expect(caps?.some((c) => c.channel === "select" && c.qualifier === "tracks")).toBe(true);

  const { html } = renderBakedDesignToHtmlDocumentWithReport(bake as never, {
    title: "t",
    singleComponent: "PlaylistComposer",
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

describe("PlaylistComposer multi-ForEach select", () => {
  it("bakes foreachList on nested chip/track instances", () => {
    const bake = bakeComposer();
    const root = bake.components.PlaylistComposer.root;
    const lists: string[] = [];
    const walk = (f: { foreachList?: string; children?: unknown[] }) => {
      if (typeof f.foreachList === "string") lists.push(f.foreachList);
      for (const ch of f.children ?? []) walk(ch as typeof f);
    };
    walk(root);
    expect(lists.filter((x) => x === "chips").length).toBe(4);
    expect(lists.filter((x) => x === "tracks").length).toBe(5);
  });

  it("clicking a track rebinds selectedTrack via tracks-qualified capture", async () => {
    const bake = bakeComposer(["selectedTrack=none", "currentMood=all"]);
    const { window, document, messages, html } = await mountInteractive(bake);

    expect(html).toContain('data-pdl-foreach-list="tracks"');
    expect(html).toContain('data-pdl-foreach-list="chips"');

    const rows = [...document.querySelectorAll('[data-pdl-instance-of="TrackRow"]')];
    expect(rows.length).toBe(5);
    const coastal = rows.find((n) => {
      try {
        const kw = JSON.parse(n.getAttribute("data-pdl-instance-kwargs") || "{}");
        return kw.trackId === "coastal" || kw.trackId === ".coastal";
      } catch {
        return false;
      }
    });
    expect(coastal).toBeTruthy();
    expect(coastal!.getAttribute("data-pdl-foreach-list")).toBe("tracks");
    // Mounted via TrackList component — instance-let is synthetic; list stamp is authoritative.
    expect(coastal!.getAttribute("data-pdl-instance-let")).toMatch(/TrackRow/);

    coastal!.dispatchEvent(new window.MouseEvent("mousedown", { button: 0, bubbles: true }));
    coastal!.dispatchEvent(new window.MouseEvent("mouseup", { button: 0, bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));

    const ix = messages.find(
      (m) =>
        (m as { type?: string }).type === "pdl-interaction" &&
        (m as { event?: string }).event === "pressEnd" &&
        (m as { childComponent?: string }).childComponent === "TrackRow",
    ) as {
      changed?: boolean;
      previewHandled?: boolean;
      params?: { selectedTrack?: string; currentMood?: string; status?: string };
    };

    expect(ix).toBeTruthy();
    expect(ix.changed).toBe(true);
    expect(ix.previewHandled).toBe(false);
    expect(String(ix.params?.selectedTrack)).toMatch(/coastal/);
    expect(String(ix.params?.currentMood)).toMatch(/all/);
    expect(String(ix.params?.status)).toMatch(/Track selected/);

    // Parent rebake owns selected chrome — do not instance-resolve pressEnd with
    // stale selected:false (that painted grey hover over the accent ring).
    const pressEndResolve = messages.find(
      (m) =>
        (m as { type?: string }).type === "pdl-resolve-instance" &&
        (m as { reason?: string }).reason === "pressEnd" &&
        (m as { childComponent?: string }).childComponent === "TrackRow",
    );
    expect(pressEndResolve).toBeUndefined();

    const section = document.querySelector("section.pdl-preview")!;
    const el = section.querySelector(".pdl-preview-params")!;
    const live = JSON.parse(
      el.getAttribute("data-json") ||
        el.querySelector(".pdl-preview-params-line")?.textContent ||
        el.textContent ||
        "{}",
    );
    expect(String(live.selectedTrack)).toMatch(/coastal/);
  });

  it("hover on a selected track keeps selected:true in instance-resolve kwargs", async () => {
    const bake = bakeComposer(["selectedTrack=coastal", "currentMood=all"]);
    const { window, document, messages } = await mountInteractive(bake);

    const coastal = [...document.querySelectorAll('[data-pdl-instance-of="TrackRow"]')].find(
      (n) => {
        try {
          const kw = JSON.parse(n.getAttribute("data-pdl-instance-kwargs") || "{}");
          return kw.trackId === "coastal" || kw.trackId === ".coastal";
        } catch {
          return false;
        }
      },
    );
    expect(coastal).toBeTruthy();
    const kw0 = JSON.parse(coastal!.getAttribute("data-pdl-instance-kwargs") || "{}");
    expect(kw0.selected).toBe(true);

    messages.length = 0;
    coastal!.dispatchEvent(new window.MouseEvent("mouseenter", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    const resolve = messages.find(
      (m) =>
        (m as { type?: string }).type === "pdl-resolve-instance" &&
        (m as { reason?: string }).reason === "hoverStart" &&
        (m as { childComponent?: string }).childComponent === "TrackRow",
    ) as { childParams?: { selected?: boolean; state?: string } } | undefined;

    expect(resolve).toBeTruthy();
    expect(resolve!.childParams?.selected).toBe(true);
    expect(String(resolve!.childParams?.state)).toMatch(/hovering/);
  });

  it("clicking a mood chip rebinds currentMood via chips-qualified capture", async () => {
    const bake = bakeComposer(["currentMood=all"]);
    const { window, document, messages } = await mountInteractive(bake);

    const chips = [...document.querySelectorAll('[data-pdl-instance-of="ComposerChip"]')];
    const drive = chips.find((n) => {
      try {
        const kw = JSON.parse(n.getAttribute("data-pdl-instance-kwargs") || "{}");
        return kw.mood === "drive" || kw.mood === ".drive";
      } catch {
        return false;
      }
    });
    expect(drive).toBeTruthy();
    expect(drive!.getAttribute("data-pdl-foreach-list")).toBe("chips");

    drive!.dispatchEvent(new window.MouseEvent("mousedown", { button: 0, bubbles: true }));
    drive!.dispatchEvent(new window.MouseEvent("mouseup", { button: 0, bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));

    const ix = messages.find(
      (m) =>
        (m as { type?: string }).type === "pdl-interaction" &&
        (m as { event?: string }).event === "pressEnd" &&
        (m as { childComponent?: string }).childComponent === "ComposerChip",
    ) as { params?: { currentMood?: string; status?: string } };

    expect(ix).toBeTruthy();
    expect(String(ix.params?.currentMood)).toMatch(/drive/);
    expect(String(ix.params?.status)).toMatch(/Mood updated/);
  });
});
