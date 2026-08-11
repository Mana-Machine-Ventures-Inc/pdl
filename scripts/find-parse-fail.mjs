import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseModule } from "../src/parser.ts";

const dir = join(process.cwd(), "test-fixtures/pdl/atoms");
for (const f of readdirSync(dir).filter((x) => x.endsWith(".pdl"))) {
  try {
    parseModule(readFileSync(join(dir, f), "utf8"), f);
  } catch (e) {
    console.log(f + ":", e.message);
  }
}
