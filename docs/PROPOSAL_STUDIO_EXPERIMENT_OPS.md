# Proposal: Studio experiment ops (speculative)

**Status:** speculative / deferred — **do not implement** until the language and Playground fence are stable  
**Related:** `docs/manifesto.md`, `docs/PROPOSAL_PORTABLE_CORE.md`, `docs/PROPOSAL_PDL_PLAYGROUND.md`, `docs/PLAYGROUND_OVERVIEW.md`, `docs/full-spec.md` (§16 bake, §17 core boundary)  
**Amends (future):** Playground remains the language lab; this proposal sketches **PDL Studio** working-set semantics only  
**Non-goals (now):** shipping Studio, changing bake IR as authored SoT, multiplayer CRDT in `.pdl`, language-level `detach`

---

## 1. Problem

Editors like Figma excel at rapid detach, rearrange, and visual experiment — then fold changes back into a design system mostly by hand. That loop is powerful and poorly tracked compared to git.

PDL inverts the usual stack: **`.pdl` is the long-lived source of truth**; Playground/preview are projections. That is the right SoT bet (`PROPOSAL_PORTABLE_CORE.md`), but it leaves open:

1. How can a **Studio canvas** feel freeform (insert, reorder, break tokens, invent structure) without becoming a second SoT?
2. How do experiments **rebase** when the underlying system changes (true merge of intent)?
3. How does wild exploration **promote** into minimal, kind PDL (variant case, new component, token update) with user intent — and eventually a normal git PR?

Playground today stores **source text + param knobs** in browser drafts. That is fine for a lab; it is not a rebaseable experiment ledger.

---

## 2. Decision (speculative)

**Defer Studio.** When built, treat the canvas as a **temporary projection** of:

```text
Pack (.pdl @ gitRev)     ← long-lived SoT (CI, review, releases)
        ↑ promote / ↓ rebase
Experiment (ops log)     ← short-lived working set (sync, rewind)
        ↓ apply + bake
Canvas / preview         ← ephemeral view, not the archive
```

**Hard rules:**

| Rule | Meaning |
|------|---------|
| **PDL remains SoT** | Humans and tools ship `.pdl`. Ops logs are not packs. |
| **Bake is not the ledger** | `bakedDesign` is a one-way denormalisation for pixels (`full-spec` §16d). Do not author or sync experiments as bake JSON injections. |
| **Ids address; names label** | Ops target stable studio node ids. Rename updates labels / PDL-facing refs; collision-checked. |
| **Promote is mandatory for pack impact** | Freeform play never silently mutates the system. |
| **Language stays free of detach** | No first-class “break instance into anonymous fork” in PDL. Escape hatches live in Studio; absorption is promote → PDL. |

Experimentation is primarily an **IDE/canvas** feature. The language keeps intentional override surfaces (variants, themes, slots, conditional props). Studio may later add a thin, text-diffable patch format for sharing — still not a second design language.

---

## 3. Core objects

### 3.1 Experiment

```text
Experiment {
  id, title, status          // open | promoted | discarded
  base: {
    gitRev, packEntry
    focus?                   // component name, or null for greenfield
    seedParams?
    kind: packComponent | empty | template
  }
  sceneRootId
  ops: PatchOp[]             // durable, compacted ledger
  liveOps?: PatchOp[]        // optional fine-grained undo tape
  meta: { createdAt, authors, checkpoints[] }
}
```

### 3.2 WorkingTree

Identity-preserving scene graph derived from `base` + `ops`. **Not** `bakedDesign`.

Node props keep provenance where possible:

```text
{ kind: token, ref } | { kind: param, ref } | { kind: literal, value }
```

Each node has:

- stable **studio id** (`n_ok`)
- optional **source binding** back to `.pdl` (file + path / scoped instance id)
- `instanceOf` when it is a component instance
- children as id lists

### 3.3 PatchOp (flat log)

The scene is nested; the **log stays flat**. Ops address ids, never “third child of Modal.”

| Op | Role |
|----|------|
| `setProp` | Prop change on a node |
| `overrideToken` | Escape token → literal (or local alias), with `brokeToken` |
| `insertInstance` / `insertFrame` | Allocate new id under a parent |
| `remove` | Remove node (descendants may orphan) |
| `reorderChildren` | Parent child-id list |
| `replaceInstance` | Swap `instanceOf`; retarget or orphan incompatible ops |
| `rename` | Change let/param/component label; collision check |
| `detach` / `openChildExperiment` | Boundary: local fork vs edit definition elsewhere |

**Variant tagging** — do not store `if` in the log. Case edits carry a binding:

```json
{
  "op": "setProp",
  "node": "n_root",
  "prop": "background",
  "to": { "kind": "token", "ref": "abn.color.brandSecondary" },
  "when": { "tone": "secondary" }
}
```

Base/shared edits omit `when` (or use `{}`). Multi-axis later: `"when": { "tone": "secondary", "size": "lg" }` — only combinations the user actually edited.

### 3.4 PromoteDecision

Created at promote time from user interview + op classification; drives PDL lowering and git branch/PR.

---

## 4. Pipeline

```text
DesignDef @ gitRev
  → clone / load base WorkingTree
  → apply compacted ops (filter by active `when` for preview)
  → bake(WorkingTree) → canvas pixels
```

| Mode | Use |
|------|-----|
| **Draft resolve** | Permissive: temporary literals, extra children; warnings visible |
| **Strict / promote** | Pack-valid PDL only; draft warnings become errors or explicit decisions |

Bake/param injection packs may remain an **implementation detail** of the last hop. They must not be the experiment’s persistence format.

---

## 5. Compaction & history

Treat history as two layers:

1. **Live log** — fine-grained gestures for undo/redo while hot.
2. **Compacted log** — net semantic effect for rebase, promote, share, sync.

Compaction rules (illustrative):

- Coalesce successive `setProp` on the same `(node, prop[, when])`; drop no-ops that restore base.
- Coalesce `reorderChildren` on the same parent; drop if equal to base.
- Cancel insert+remove of the same new id; fold insert + later prop sets into one insert with final props.
- **Do not compact across barriers** — checkpoints, promote attempts, rebase points, ack frontiers (multiplayer).

**Assumption:** Studio workspaces/experiments are **relatively short-lived**. That keeps compaction risk manageable. Long-lived “forever canvas files” are an anti-goal (that recreates `.fig` gravity).

Rewind = replay ops until timestamp/checkpoint → WorkingTree → bake. Recovering a “lost” subtree is replaying until before its `remove` (or restoring orphaned ops).

---

## 6. Rebase & orphans (merge of intent)

Because ops are deltas on ids against a pinned base:

```text
new WorkingTree = apply(ops, scene(focus @ newer gitRev))
```

- Untouched nodes **inherit** upstream (font size, default padding, new a11y params, etc.).
- Touched nodes keep experiment intent.
- Conflicts only when upstream **destroys or replaces** an id the log still patches → **orphans**, not silent loss.

| Parent action | Child ops |
|---------------|-----------|
| Reorder / setProp on parent | Unaffected (id-stable) |
| Remove ancestor | Ops under it → `orphaned`; surface for triage |
| Replace instance type | Retarget compatible props; orphan the rest |
| Upstream rename of source | Needs source-identity remap (see §10) |

This is the wedge vs canvas-first tools that bolt on libraries: **the system can move underneath the experiment**.

---

## 7. Instance boundaries

Deep editing must distinguish:

| Layer | Meaning |
|-------|---------|
| **Instance overlay** | This Modal’s use of Button — ops on the instance node in the Modal experiment |
| **Definition edit** | Button for everyone — linked/child experiment on `Button` |
| **Detach (Studio-only)** | Promote subtree toward a new local component stub — still ends as PDL, not anonymous bake |

Default deep-click = overlay. Explicit “Edit component” opens a child experiment. Depth budget warnings when overlays nest across many instance boundaries.

---

## 8. Variants from the canvas

Healthy path:

1. Author **base** structure + **named props** early (`title`, `icon`) → params / lets.
2. **Create variant** → name enum + cases (`tone`: primary, secondary, ghost).
3. Edit non-base cases → ops tagged with `when`.
4. Lowering diffs each `(node, prop)` against base; emit minimal `if` / `else if`.
5. **Verbosity is a smell** — large structural divergence per case suggests a new component, slot, or second axis — not a tooling failure.

Do not pretend undefined cases exist in the type system while drafting. Soft metadata (`proposedCase: "destructive"`) is fine; binding happens at promote.

Multi-axis matrices should stay **sparse and authored** (aligned with catalogue limits today): no auto-explosion of the full cross-product on the canvas.

---

## 9. Greenfield creation

Empty/`template` base + same ops machinery = drag-drop component authoring without hand boilerplate.

Guardrails:

- Prefer **insert from library** so new work is composition-heavy.
- Aggressive compaction + checkpoints.
- **Mandatory promote interview** for greenfield: name, params, tokens, slots.
- Always show **generated PDL preview** before PR — language remains system memory.

Without that interview, canvas-first creation mints frozen one-offs (detach smell in reverse).

---

## 10. Promote interview & lowering

### 10.1 Classifier hints

| Op fingerprint | Guidance |
|----------------|----------|
| Token/literal tweaks on existing nodes | Update defaults vs new variant case |
| Same structure, appearance per axis | Variant / theme modifier |
| Insert/remove/reorder / new instances | Likely new component (or optional slot if additive) |
| Mix | Split promote / partial promote |

### 10.2 Landing choices (user decides “what is this?”)

- New case on existing enum  
- New variant axis  
- New component (name required)  
- Replace existing case (rare; confirm)  
- Token create/map vs keep literals  
- Keep as shared experiment only (no pack change)

### 10.3 Lowering

Tagged `when` + compacted scene → **minimum viable PDL** (`variant` + `if` chains, params, tokens). Lowering quality is a compiler-grade problem; see §12.

### 10.4 Partial promote

Real sessions mix concerns. Studio must split one experiment into multiple landings/PRs (or sequenced promotes) without forcing a single junk commit.

---

## 11. Collaboration & sync (later)

An append-only, id-addressed, timestamped log is a good substrate for sync and rewind — **not** a free multiplayer CRDT.

Plausible v1 collab scope:

- Small sessions, few concurrent editors  
- Explicit LWW or per-op ack frontiers  
- Compact only past barriers / acked prefixes  
- Personal or branched rewind unless everyone time-travels  

Concurrent `setProp` on the same `(node, prop)` and concurrent list insert/reorder still need a real merge policy. Do not claim Figma-parity multiplayer as a prerequisite for the experiment model.

Strategic claim (aspirational): more **DS-native** collaboration than canvas-first tools — rebaseable library truth + promote to git + meaningful history — without out-competing them on infinite multiplayer polish first.

---

## 12. What is unusually hard (do not underestimate)

1. **Lowering → minimal PDL** — especially structural children differing by case, sparse multi-axis, slots vs `if`.
2. **Instance boundary UX** — overlay vs definition vs detach; most confusion and merge pain lives here.
3. **Orphans & structural rebase** — id-addressing fixes index churn; not upstream removal/replace.
4. **Greenfield contract extraction** — params/tokens/slots from literals.
5. **Draft vs strict divergence** — users will ask why promote “broke” what they saw.
6. **Source identity across pack renames** — studio ids alone are insufficient for rebase; need stable source bindings or remap tables in PDL/tooling.
7. **Non-layout language surface** — emits, interactions, fixtures, protocols, `ForEach` are awkward as pure spatial ops.
8. **Performance** — re-apply + bake on large nested trees every gesture needs incrementalism.
9. **Never-promote gravity** — if ops logs feel too good, they become a second SoT; need age/size pressure and “only `.pdl` ships.”

### Comparatively easier

Single-axis variant deltas, param knobs, token overrides, rename-by-id, aggressive `setProp` compaction.

---

## 13. Explicit non-goals

- Implementing Studio in the Playground package or blurring Playground → Studio (`PROPOSAL_PDL_PLAYGROUND.md` fence stands).
- Persisting experiments as edited `bakedDesign` / catalogue JSON.
- Language-level detach, structural `extend` of component bodies, or OO theme inheritance (see existing spec gaps).
- Making the ops log a long-lived design repository format that replaces git + `.pdl`.
- Full multiplayer CRDT as a v1 requirement.
- Auto-generating full multi-axis variant matrices.

---

## 14. Prerequisites (why this waits)

This proposal assumes:

- Language surface and resolve/bake semantics continue to stabilize (`full-spec`, Rust `pdl-core`).
- Playground remains the honest lab for packs, knobs, and variant preview — not a proto-Studio.
- Catalogue / bake / instance scoping remain trustworthy so WorkingTree bindings have something real to point at.

**Do not** start Studio experiment ops until those foundations are dull and reliable. Premature canvas work will either fork a second IR or teach detach culture with better undo.

---

## 15. Success criteria (when eventually built)

| Criterion | Signal |
|-----------|--------|
| Freeform without second SoT | Experiments never ship; packs stay `.pdl` |
| Rebase works | Upstream button type ramp appears in untouched experiment nodes |
| Promote is kind | Lowered PDL is reviewable; verbosity flags bad factoring |
| History is useful | Rewind restores deleted subtrees with identity |
| DS connection held | Instance overlays still know `instanceOf`; library updates triage as orphans/conflicts |
| Fence held | Playground ≠ Studio; bake ≠ ledger |

---

## 16. Open questions

1. On-disk format for shared experiments (`*.experiment.json` vs sidecar next to packs) — still not SoT.
2. Whether PDL gains optional **stable source ids** for rebase across renames.
3. How much lowering is deterministic codegen vs assisted (human/LLM) with mandatory review.
4. Theme modifiers vs variant cases for pure appearance axes — promote guidance matrix.
5. How child experiments link in git (monorepo branch with multiple promotes vs stacked PRs).
6. Minimal collab v1: single-writer lock vs LWW op sync.

---

## 17. Summary for agents

> **Speculative Studio model:** short-lived **Experiment** = base git pin + identity-preserving **WorkingTree** + flat **PatchOp** log (optional `when` for variant bindings). Canvas is a projection via apply→bake. Compaction yields net intent; rebase reapplies onto newer pack revisions; orphans triage structural loss. Promote interviews ask where work lands (variant case / new component / tokens) and lowers to minimal PDL + git PR. Do **not** track experiments in baked IR. Do **not** implement until the language stabilizes. Playground fence unchanged.

---

*This document is intent and architecture speculation. It does not amend `full-spec.md` and must not be treated as normative syntax or a near-term implementation plan.*
