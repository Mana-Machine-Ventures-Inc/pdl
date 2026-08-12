/** Typed sample banks (`samples Tracks { … }`) — lookup helpers for validate / evaluate / resolve. */

import type { SampleFieldDecl, SampleEntryDecl, SamplesDecl } from "./ast.js";
import type { DesignDefinition } from "./designModel.js";
import { PdlError } from "./errors.js";

/** Split `Bank.entry.field` into three segments. Longer/shorter dotted paths return `undefined`. */
export function splitSamplePath(path: string): [string, string, string] | undefined {
  const parts = path.split(".");
  if (parts.length !== 3) return undefined;
  const [bank, entry, field] = parts;
  if (!bank || !entry || !field) return undefined;
  return [bank, entry, field];
}

export function sampleBank(design: DesignDefinition, bank: string): SamplesDecl | undefined {
  return design.samples.get(bank);
}

export function sampleEntry(
  design: DesignDefinition,
  bank: string,
  entry: string,
): SampleEntryDecl | undefined {
  return sampleBank(design, bank)?.entries.find((e) => e.name === entry);
}

export function sampleField(
  design: DesignDefinition,
  bank: string,
  entry: string,
  field: string,
): SampleFieldDecl | undefined {
  return sampleEntry(design, bank, entry)?.fields.find((f) => f.name === field);
}

/** Resolve `Bank.entry.field` to the field decl, or a stable **PDL-E041** error. */
export function lookupSampleField(design: DesignDefinition, path: string): SampleFieldDecl {
  const split = splitSamplePath(path);
  if (!split) {
    throw new PdlError(
      "PDL-E041",
      `Invalid sample path \`${path}\` (expected Bank.entry.field)`,
      { path: design.entryPath },
    );
  }
  const [bank, entry, field] = split;
  if (!sampleBank(design, bank)) {
    throw new PdlError(
      "PDL-E041",
      `Unknown sample bank \`${bank}\` (path \`${path}\`)`,
      { path: design.entryPath },
    );
  }
  if (!sampleEntry(design, bank, entry)) {
    throw new PdlError(
      "PDL-E041",
      `Unknown sample entry \`${bank}.${entry}\` (path \`${path}\`)`,
      { path: design.entryPath },
    );
  }
  const f = sampleField(design, bank, entry, field);
  if (!f) {
    throw new PdlError("PDL-E041", `Unknown sample field \`${path}\``, { path: design.entryPath });
  }
  return f;
}

/** True when `path` is a three-segment path naming a known sample field. */
export function isKnownSamplePath(design: DesignDefinition, path: string): boolean {
  const split = splitSamplePath(path);
  if (!split) return false;
  const [bank, entry, field] = split;
  return sampleField(design, bank, entry, field) !== undefined;
}
