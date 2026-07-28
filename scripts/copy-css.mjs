import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
mkdirSync(join(root, "dist"), { recursive: true });
for (const file of ["tokens.css", "widget.css"]) {
  copyFileSync(join(root, "src", file), join(root, "dist", file));
}
