import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesDir = path.resolve(__dirname, "..", "routes");

const routeFiles = fs
  .readdirSync(routesDir)
  .filter((fileName) => fileName.endsWith(".route.js"))
  .sort();

let hasFailure = false;

for (const routeFile of routeFiles) {
  const fileUrl = pathToFileURL(path.join(routesDir, routeFile)).href;
  try {
    await import(fileUrl);
    process.stdout.write(`OK ${routeFile}\n`);
  } catch (error) {
    hasFailure = true;
    process.stderr.write(`FAIL ${routeFile}: ${error.message}\n`);
  }
}

if (hasFailure) {
  process.exitCode = 1;
}
