const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

fs.copyFileSync(path.join(__dirname, "source-index.html"), path.join(root, "index.html"));
fs.copyFileSync(path.join(__dirname, "explorer-source-index.html"), path.join(root, "explorerapp", "index.html"));

console.log("Restored source index files for Vite build.");
