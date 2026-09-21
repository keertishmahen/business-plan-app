const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

const srcDir = path.join(__dirname, "arch-icons");
const outDir = path.join(__dirname, "arch-icons-png");
fs.mkdirSync(outDir, { recursive: true });

const SIZE = 256;

(async () => {
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".svg"));
  for (const file of files) {
    const svg = fs.readFileSync(path.join(srcDir, file));
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: SIZE },
      background: "rgba(0,0,0,0)",
      font: { loadSystemFonts: false },
    });
    const pngData = resvg.render();
    const png = pngData.asPng();
    const out = path.join(outDir, file.replace(/\.svg$/i, ".png"));
    fs.writeFileSync(out, png);
    console.log("ok", file, pngData.width + "x" + pngData.height);
  }
  console.log("done", files.length);
})();
