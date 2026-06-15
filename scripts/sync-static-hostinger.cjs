const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const explorerDist = path.join(dist, "explorerapp");
const rootAssets = path.join(root, "assets");
const explorerRoot = path.join(root, "explorerapp");
const explorerAssets = path.join(explorerRoot, "assets");

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function syncDirectory(source, target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

copyFile(path.join(dist, "index.html"), path.join(root, "index.html"));
syncDirectory(path.join(dist, "assets"), rootAssets);

copyFile(path.join(explorerDist, "index.html"), path.join(explorerRoot, "index.html"));
syncDirectory(path.join(explorerDist, "assets"), explorerAssets);

const configSource = path.join(explorerDist, "explorer-config.js");
const configTarget = path.join(explorerRoot, "explorer-config.js");

if (!fs.existsSync(configTarget) && fs.existsSync(configSource)) {
  copyFile(configSource, configTarget);
}

console.log("Synced static Hostinger files to the repository root.");
