/**
 * @vitest-environment happy-dom
 *
 * Dual-bake chrome is a cold snapshot cache. Source/theme ticks must invalidate it;
 * param/emit ticks may keep IR-only.
 */
import { describe, expect, it } from "vitest";
import {
  allowIrOnlyPreviewApply,
  documentHasPointerChromeDualBake,
  pointerChromeDualBakeMissing,
  shouldInvalidateDualBakeOnSourceTick,
} from "../playground/src/dual-bake-policy.js";

function mount(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

describe("dual-bake-policy", () => {
  it("detects mounted dual-bake fragments", () => {
    const doc = mount(`
      <section class="pdl-preview">
        <div class="pdl-instance" data-pdl-instance-of="EditorBtn" data-pdl-pointer-input="1">
          <div class="pdl-inst-state" data-pdl-state="rest">idle</div>
          <div class="pdl-inst-state" data-pdl-state="hovering" hidden>hover</div>
        </div>
      </section>
    `);
    expect(documentHasPointerChromeDualBake(doc)).toBe(true);
    expect(pointerChromeDualBakeMissing(doc)).toBe(false);
  });

  it("detects pointer instances missing dual-bake", () => {
    const doc = mount(`
      <section class="pdl-preview">
        <div class="pdl-instance" data-pdl-instance-of="EditorBtn" data-pdl-pointer-input="1">
          <div>bare</div>
        </div>
      </section>
    `);
    expect(documentHasPointerChromeDualBake(doc)).toBe(false);
    expect(pointerChromeDualBakeMissing(doc)).toBe(true);
  });

  it("invalidates dual-bake on source/theme ticks only", () => {
    const doc = mount(`
      <div class="pdl-instance">
        <div class="pdl-inst-state" data-pdl-state="rest"></div>
        <div class="pdl-inst-state" data-pdl-state="hovering" hidden></div>
      </div>
    `);
    expect(
      shouldInvalidateDualBakeOnSourceTick({
        incremental: true,
        ownerOnly: false,
        doc,
      }),
    ).toBe(true);
    // Param/emit hot path keeps IR-only (hover chrome is not in parent rest IR).
    expect(
      shouldInvalidateDualBakeOnSourceTick({
        incremental: true,
        ownerOnly: true,
        doc,
      }),
    ).toBe(false);
    expect(
      shouldInvalidateDualBakeOnSourceTick({
        incremental: false,
        ownerOnly: false,
        doc,
      }),
    ).toBe(false);
  });

  it("blocks IR-only when source tick must refresh dual-bake (hover background edit)", () => {
    const doc = mount(`
      <div class="pdl-instance" data-pdl-instance-of="EditorBtn" data-pdl-pointer-input="1">
        <div class="pdl-inst-state" data-pdl-state="rest">#2563EB</div>
        <div class="pdl-inst-state" data-pdl-state="hovering" hidden>#FFFFFF</div>
      </div>
    `);
    // Editing only `if state == .hovering { background = … }` leaves rest IR equal —
    // IR-only would no-op and leave the hidden hovering snapshot stale.
    expect(
      allowIrOnlyPreviewApply({
        incremental: true,
        ownerOnly: false,
        doc,
      }),
    ).toBe(false);
    expect(
      allowIrOnlyPreviewApply({
        incremental: true,
        ownerOnly: true,
        doc,
      }),
    ).toBe(true);
  });

  it("blocks IR-only when dual-bake fragments are missing", () => {
    const doc = mount(`
      <div class="pdl-instance" data-pdl-instance-of="EditorBtn" data-pdl-pointer-input="1">
        <div>no states</div>
      </div>
    `);
    expect(
      allowIrOnlyPreviewApply({
        incremental: true,
        ownerOnly: true,
        doc,
      }),
    ).toBe(false);
  });

  it("allows IR-only when there is no pointer chrome", () => {
    const doc = mount(`
      <section class="pdl-preview">
        <div class="pdl-canvas"><div data-pdl-id="Title">Hello</div></div>
      </section>
    `);
    expect(
      allowIrOnlyPreviewApply({
        incremental: true,
        ownerOnly: false,
        doc,
      }),
    ).toBe(true);
  });
});
