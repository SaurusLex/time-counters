const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
html = html.replace("dist/app.js", "app.js");
fs.writeFileSync(path.join(dist, "index.html"), html);

fs.copyFileSync(path.join(root, "style.css"), path.join(dist, "style.css"));
fs.copyFileSync(
  path.join(root, "design-tokens.css"),
  path.join(dist, "design-tokens.css")
);
fs.cpSync(path.join(root, "components"), path.join(dist, "components"), {
  recursive: true,
});

const assetsDir = path.join(root, "assets");
if (fs.existsSync(assetsDir)) {
  fs.cpSync(assetsDir, path.join(dist, "assets"), { recursive: true });
}

