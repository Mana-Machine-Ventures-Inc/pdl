/**
 * @vitest-environment happy-dom
 *
 * Dual-bake is retired. Policy helpers always allow IR-only apply.
 */
import { describe, expect, it } from "vitest";
import {
  allowIrOnlyPreviewApply,
  documentHasPointerChromeDualBake,
  pointerChromeDualBakeMissing,
  shouldInvalidateDualBakeOnSourceTick,
} from "../playground/src/dual-bake-policy.js";

describe("dual-bake-policy (retired)", () => {
  it("never reports missing dual-bake as a problem", () => {
    document.body.innerHTML = `
      <div class="pdl-instance" data-pdl-instance-of="EditorBtn" data-pdl-pointer-input="1">
        <div>single tree</div>
      </div>`;
    expect(pointerChromeDualBakeMissing(document)).toBe(false);
  });

  it("can still detect leftover dual-bake fragments", () => {
    document.body.innerHTML = `
      <div class="pdl-instance">
        <div class="pdl-inst-state" data-pdl-state="rest"></div>
      </div>`;
    expect(documentHasPointerChromeDualBake(document)).toBe(true);
  });

  it("never invalidates on source ticks", () => {
    expect(
      shouldInvalidateDualBakeOnSourceTick({
        incremental: true,
        ownerOnly: false,
        doc: document,
      }),
    ).toBe(false);
  });

  it("always allows IR-only preview apply", () => {
    expect(
      allowIrOnlyPreviewApply({
        incremental: true,
        ownerOnly: false,
        doc: document,
      }),
    ).toBe(true);
  });
});
