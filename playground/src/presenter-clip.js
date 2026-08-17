/**
 * Presenter pair-clip host: snapshot the outgoing page, keep it in the hole
 * next to the incoming bake, play PresentationMotion, then commit.
 */
import { playPresentationMotion } from "@pdl/applyMotion.ts";

/**
 * @param {Document | null | undefined} doc
 * @param {string} [owner]
 */
export function presenterHole(doc, owner) {
  if (!doc) return null;
  const root =
    owner && typeof CSS !== "undefined" && CSS.escape
      ? doc.querySelector(`section.pdl-preview[data-pdl-component="${CSS.escape(owner)}"]`)
      : null;
  return (root || doc).querySelector(".pdl-presenter");
}

/**
 * @param {Element | null} hole
 */
export function presenterStackChild(hole) {
  if (!hole) return null;
  return [...hole.children].find((ch) => !ch.classList.contains("pdl-presenter__cover")) ?? null;
}

/**
 * @param {Document | null | undefined} doc
 * @param {string} [owner]
 */
export function snapshotPresenterOutgoing(doc, owner) {
  const child = presenterStackChild(presenterHole(doc, owner));
  if (!child) return null;
  return child.cloneNode(true);
}

/**
 * @param {Document | null | undefined} doc
 * @param {Node} outgoingClone
 * @param {unknown} move
 * @param {string} [owner]
 * @returns {{ cancel: () => void } | null}
 */
const CLIP_STYLE_ID = "pdl-presenter-clip-host";
const CLIP_CSS = `
.pdl-presenter.pdl-presenter--clip { overflow: hidden; }
.pdl-presenter.pdl-presenter--clip > .pdl-presenter__lane {
  grid-area: 1 / 1 / 2 / 2;
  min-width: 0; min-height: 0; width: 100%; height: 100%;
  max-width: 100%; max-height: 100%;
  align-self: stretch; justify-self: stretch;
}
.pdl-presenter.pdl-presenter--clip > .pdl-presenter__lane.pdl-presenter__lane--front { z-index: 4 !important; }
.pdl-presenter.pdl-presenter--clip > .pdl-presenter__lane.pdl-presenter__lane--back { z-index: 1 !important; }
`;

function ensurePresenterClipStyles(doc) {
  if (doc.getElementById(CLIP_STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = CLIP_STYLE_ID;
  style.textContent = CLIP_CSS;
  doc.head?.appendChild(style);
}

export function startPresenterPairClip(doc, outgoingClone, move, owner) {
  const hole = presenterHole(doc, owner);
  if (!hole || !doc || !move || typeof move !== "object") return null;
  const incoming = presenterStackChild(hole);
  if (!incoming) return null;
  const outgoing = doc.importNode(outgoingClone, true);
  ensurePresenterClipStyles(doc);
  hole.classList.add("pdl-presenter--clip");
  incoming.classList.add("pdl-presenter__lane");
  outgoing.classList.add("pdl-presenter__lane");
  outgoing.setAttribute("data-pdl-presenter-clip", "outgoing");
  incoming.setAttribute("data-pdl-appear-hold", "1");
  outgoing.setAttribute("data-pdl-appear-hold", "1");
  incoming.after(outgoing);
  return playPresentationMotion(incoming, outgoing, move, {
    onDone: () => {
      outgoing.remove();
      hole.classList.remove("pdl-presenter--clip");
      incoming.classList.remove(
        "pdl-presenter__lane",
        "pdl-presenter__lane--front",
        "pdl-presenter__lane--back",
      );
      incoming.removeAttribute("data-pdl-appear-hold");
    },
  });
}
