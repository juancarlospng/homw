const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "..", "explorerapp", "dist");
const target = path.join(__dirname, "..", "dist", "explorerapp");

if (!fs.existsSync(source)) {
  throw new Error("explorerapp/dist does not exist. Run the explorerapp build first.");
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(source, target, { recursive: true });

console.log("Copied explorerapp build to dist/explorerapp");
