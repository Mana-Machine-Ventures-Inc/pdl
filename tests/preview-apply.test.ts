/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import {
  applyPreviewHtml,
  capturePreviewEphemerals,
  morphElement,
  previewNodeKey,
  restorePreviewEphemerals,
} from "../playground/src/preview-apply.js";

describe("preview-apply", () => {
  it("keys instance lets before bare ids", () => {
    document.body.innerHTML = `<div data-pdl-instance-let="Input" data-pdl-id="Input"></div>`;
    const el = document.body.firstElementChild!;
    expect(previewNodeKey(el)).toBe("Input");
  });

  it("morphs children by data-pdl-instance-let without dropping siblings", () => {
    const live = document.createElement("div");
    live.innerHTML = `
      <div data-pdl-instance-let="Edit" class="old">Edit</div>
      <div data-pdl-instance-let="Status" class="old">Idle</div>
    `;
    const next = document.createElement("div");
    next.innerHTML = `
      <div data-pdl-instance-let="Cancel" class="new">Cancel</div>
      <div data-pdl-instance-let="Done" class="new">Done</div>
      <div data-pdl-instance-let="Status" class="new">Saved</div>
    `;
    morphElement(live, next);
    const lets = [...live.children].map((c) => c.getAttribute("data-pdl-instance-let"));
    expect(lets).toEqual(["Cancel", "Done", "Status"]);
    const status = live.querySelector('[data-pdl-instance-let="Status"]');
    expect(status?.textContent?.trim()).toBe("Saved");
  });

  it("applyPreviewHtml updates gallery sections in place", () => {
    document.body.innerHTML = `
      <div class="pdl-gallery">
        <section class="pdl-preview" data-pdl-component="NoteEditor">
          <p class="pdl-preview-params">{"editing":false}</p>
          <div class="pdl-canvas">
            <div data-pdl-instance-let="Edit">Edit</div>
            <div data-pdl-instance-let="Status">Idle</div>
          </div>
        </section>
      </div>
    `;
    const nextHtml = `<!DOCTYPE html><html><body>
      <div class="pdl-gallery">
        <section class="pdl-preview" data-pdl-component="NoteEditor">
          <p class="pdl-preview-params">{"editing":true}</p>
          <div class="pdl-canvas">
            <div data-pdl-instance-let="Cancel">Cancel</div>
            <div data-pdl-instance-let="Done">Done</div>
            <div data-pdl-instance-let="Status">Editing</div>
          </div>
        </section>
      </div>
    </body></html>`;
    const canvas = document.querySelector(".pdl-canvas")!;
    const statusBefore = canvas.querySelector('[data-pdl-instance-let="Status"]')!;
    expect(applyPreviewHtml(document, nextHtml)).toBe(true);
    const paramsEl = document.querySelector(".pdl-preview-params");
    const paramsJson =
      paramsEl?.getAttribute("data-json") ||
      paramsEl?.querySelector(".pdl-preview-params-line")?.textContent ||
      paramsEl?.textContent ||
      "";
    expect(paramsJson).toContain("editing\":true");
    expect(canvas.querySelector('[data-pdl-instance-let="Done"]')).toBeTruthy();
    expect(canvas.querySelector('[data-pdl-instance-let="Edit"]')).toBeFalsy();
    // Same Status node identity preserved when keyed
    expect(canvas.querySelector('[data-pdl-instance-let="Status"]')).toBe(statusBefore);
    expect(statusBefore.textContent?.trim()).toBe("Editing");
  });

  it("captures and restores scroll + session bags", () => {
    document.body.innerHTML = `
      <div data-pdl-instance-let="Input" data-pdl-session-params='{"value":"x","isEditing":true}'></div>
    `;
    window.scrollTo(0, 40);
    const ephem = capturePreviewEphemerals(document);
    expect(ephem.sessions.Input).toContain("isEditing");
    document.body.innerHTML = `
      <div data-pdl-instance-let="Input" data-pdl-session-params='{"value":"","isEditing":true}'></div>
    `;
    restorePreviewEphemerals(document, ephem);
    const raw = document.querySelector("[data-pdl-instance-let]")?.getAttribute("data-pdl-session-params");
    expect(raw).toContain("x");
  });
});
