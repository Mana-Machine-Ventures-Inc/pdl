import { PdlError } from "./errors.js";

/** Closed IconSystem cases (v1). */
export const ICON_SYSTEMS = ["sfSymbols", "materialSymbols"] as const;
export type IconSystem = (typeof ICON_SYSTEMS)[number];

/** Media role (PDL `kind:` on MediaSource — baked as `mediaKind` to avoid IR `kind` clash). */
export const MEDIA_KINDS = ["raster", "vector", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** Closed MediaSource `format:` cases (v1). `.jpg` normalizes to `jpeg`. */
export const MEDIA_FORMATS = ["webp", "jpeg", "png", "gif", "svg", "mp4", "webm", "pdf"] as const;
export type MediaFormat = (typeof MEDIA_FORMATS)[number];

const FILE_EXT = /\.(svg|png|pdf|webp|jpg|jpeg|gif|mp4|webm)$/i;

const FORMAT_BY_EXT: Record<string, MediaFormat> = {
  svg: "svg",
  png: "png",
  pdf: "pdf",
  webp: "webp",
  jpg: "jpeg",
  jpeg: "jpeg",
  gif: "gif",
  mp4: "mp4",
  webm: "webm",
};

const KIND_BY_FORMAT: Record<MediaFormat, MediaKind> = {
  webp: "raster",
  jpeg: "raster",
  png: "raster",
  gif: "raster",
  svg: "vector",
  pdf: "vector",
  mp4: "video",
  webm: "video",
};

/** Pack-relative file sugar: has `/` and/or a known extension; no leading `/`, no URL. */
export function isPackRelativeFilePath(s: string): boolean {
  if (typeof s !== "string" || s.length === 0) return false;
  if (s.startsWith("/") || s.includes("://") || s.includes("\\")) return false;
  if (s.includes("..")) return false;
  return s.includes("/") || FILE_EXT.test(s);
}

export function isHttpUrl(s: string): boolean {
  return typeof s === "string" && /^https?:\/\//i.test(s);
}

export function normalizeIconSystemName(raw: string): IconSystem | undefined {
  const s = raw.startsWith(".") ? raw.slice(1) : raw;
  const bare = s.includes(".") ? (s.split(".").pop() ?? s) : s;
  return (ICON_SYSTEMS as readonly string[]).includes(bare) ? (bare as IconSystem) : undefined;
}

function stripDotCase(raw: string): string {
  const s = raw.startsWith(".") ? raw.slice(1) : raw;
  return s.includes(".") ? (s.split(".").pop() ?? s) : s;
}

export function normalizeMediaKindName(raw: string): MediaKind | undefined {
  const bare = stripDotCase(raw);
  return (MEDIA_KINDS as readonly string[]).includes(bare) ? (bare as MediaKind) : undefined;
}

export function normalizeMediaFormatName(raw: string): MediaFormat | undefined {
  const bare = stripDotCase(raw).toLowerCase();
  if (bare === "jpg") return "jpeg";
  return (MEDIA_FORMATS as readonly string[]).includes(bare) ? (bare as MediaFormat) : undefined;
}

/** Infer format from a path or URL path segment when the extension is known. */
export function inferMediaFormatFromAddress(address: string): MediaFormat | undefined {
  const path = address.split(/[?#]/)[0] ?? address;
  const m = path.match(/\.([a-z0-9]+)$/i);
  if (!m) return undefined;
  return FORMAT_BY_EXT[m[1]!.toLowerCase()];
}

export function mediaKindForFormat(format: MediaFormat): MediaKind {
  return KIND_BY_FORMAT[format];
}

export type EvaluatedIconRef =
  | { kind: "iconRef"; source: "file"; path: string }
  | { kind: "iconRef"; source: "system"; system: IconSystem; name: string };

export type EvaluatedMediaSourceRef = {
  kind: "mediaSourceRef";
  source: "file" | "url";
  path?: string;
  url?: string;
  /** Author `kind:` / inferred role — IR key `mediaKind` (not `kind`, which is the tag). */
  mediaKind?: MediaKind;
  format?: MediaFormat;
};

export function isEvaluatedIconRef(v: unknown): v is EvaluatedIconRef {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    (v as { kind?: string }).kind === "iconRef"
  );
}

export function isEvaluatedMediaSourceRef(v: unknown): v is EvaluatedMediaSourceRef {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    (v as { kind?: string }).kind === "mediaSourceRef"
  );
}

function assertMediaKindFormatConsistent(
  mediaKind: MediaKind | undefined,
  format: MediaFormat | undefined,
  entryPath: string,
): void {
  if (!mediaKind || !format) return;
  const expected = mediaKindForFormat(format);
  if (mediaKind !== expected) {
    throw new PdlError(
      "PDL-E006",
      `MediaSource kind \`.${mediaKind}\` is incompatible with format \`.${format}\` (expected \`.${expected}\`)`,
      { path: entryPath },
    );
  }
}

/** Fill missing mediaKind/format from address extension; validate consistency. */
export function finalizeMediaSourceRef(
  ref: EvaluatedMediaSourceRef,
  entryPath: string,
): EvaluatedMediaSourceRef {
  const address = ref.source === "url" ? ref.url! : ref.path!;
  let mediaKind = ref.mediaKind;
  let format = ref.format;
  const inferred = inferMediaFormatFromAddress(address);
  if (!format && inferred) format = inferred;
  if (!mediaKind && format) mediaKind = mediaKindForFormat(format);
  assertMediaKindFormatConsistent(mediaKind, format, entryPath);
  return {
    kind: "mediaSourceRef",
    source: ref.source,
    ...(ref.source === "url" ? { url: ref.url } : { path: ref.path }),
    ...(mediaKind ? { mediaKind } : {}),
    ...(format ? { format } : {}),
  };
}

/** Coerce evaluated Icon token / frame values to a tagged iconRef (file string sugar → file). */
export function coerceIconValue(value: unknown, entryPath: string): EvaluatedIconRef {
  if (isEvaluatedIconRef(value)) {
    if (value.source === "file") {
      if (!isPackRelativeFilePath(value.path)) {
        throw new PdlError(
          "PDL-E005",
          `Icon file path must be pack-relative (e.g. \`icons/star.svg\`); got \`${value.path}\``,
          { path: entryPath },
        );
      }
      return value;
    }
    if (!value.name || typeof value.name !== "string") {
      throw new PdlError("PDL-E005", "Icon system ref requires a non-empty name string", {
        path: entryPath,
      });
    }
    return value;
  }
  if (typeof value === "string") {
    if (!isPackRelativeFilePath(value)) {
      throw new PdlError(
        "PDL-E005",
        `Icon string must be a pack-relative file path (e.g. \`icons/star.svg\`); bare names like \`${value}\` are ambiguous — use \`Icon(system: .sfSymbols, name: "${value}")\` or a file path`,
        { path: entryPath },
      );
    }
    return { kind: "iconRef", source: "file", path: value };
  }
  throw new PdlError(
    "PDL-E005",
    "Icon value must be Icon(file: …), Icon(system: …, name: …), a pack-relative path string, or an Icon token",
    { path: entryPath },
  );
}

/** Coerce evaluated MediaSource values (file / url string sugar → tagged ref). */
export function coerceMediaSourceValue(value: unknown, entryPath: string): EvaluatedMediaSourceRef {
  if (isEvaluatedMediaSourceRef(value)) {
    if (value.source === "file") {
      const path = value.path ?? "";
      if (!isPackRelativeFilePath(path)) {
        throw new PdlError(
          "PDL-E005",
          `MediaSource file path must be pack-relative (e.g. \`media/hero.jpg\`); got \`${path}\``,
          { path: entryPath },
        );
      }
      return finalizeMediaSourceRef({ ...value, path }, entryPath);
    }
    const url = value.url ?? "";
    if (!isHttpUrl(url)) {
      throw new PdlError(
        "PDL-E005",
        `MediaSource url must be http(s); got \`${url}\``,
        { path: entryPath },
      );
    }
    return finalizeMediaSourceRef({ ...value, url }, entryPath);
  }
  if (typeof value === "string") {
    if (isHttpUrl(value)) {
      return finalizeMediaSourceRef({ kind: "mediaSourceRef", source: "url", url: value }, entryPath);
    }
    if (isPackRelativeFilePath(value)) {
      return finalizeMediaSourceRef(
        { kind: "mediaSourceRef", source: "file", path: value },
        entryPath,
      );
    }
    throw new PdlError(
      "PDL-E005",
      `MediaSource string must be an http(s) URL or pack-relative file path; got \`${value}\``,
      { path: entryPath },
    );
  }
  throw new PdlError(
    "PDL-E005",
    "MediaSource value must be MediaSource(file: …), MediaSource(url: …), a path/URL string, or a MediaSource token",
    { path: entryPath },
  );
}

/** Display / aria label for preview chrome. */
export function iconRefLabel(ref: EvaluatedIconRef): string {
  if (ref.source === "file") return ref.path;
  return `${ref.system}:${ref.name}`;
}
