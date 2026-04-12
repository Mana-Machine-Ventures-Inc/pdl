export class PdlError extends Error {
  readonly code: string;
  readonly path?: string;
  readonly line?: number;
  readonly column?: number;

  constructor(
    code: string,
    message: string,
    opts?: { path?: string; line?: number; column?: number },
  ) {
    super(message);
    this.name = "PdlError";
    this.code = code;
    this.path = opts?.path;
    this.line = opts?.line;
    this.column = opts?.column;
  }

  format(): string {
    const loc =
      this.path != null && this.line != null
        ? `${this.path}:${this.line}:${this.column ?? 0}: `
        : "";
    return `${loc}${this.code}: ${this.message}`;
  }
}
