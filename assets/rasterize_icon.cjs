/**
 * Rasterize one SVG to exact pixel size with resvg (best AA).
 * Usage: node rasterize_icon.cjs <svgPath> <sizePx> <outPng>
 */
const fs = require("fs");
const { Resvg } = require("@resvg/resvg-js");

const [, , svgPath, sizeArg, outPath] = process.argv;
const size = Number(sizeArg);
const svg = fs.readFileSync(svgPath);
const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: size },
  background: "rgba(0,0,0,0)",
  font: { loadSystemFonts: false },
});
const png = resvg.render().asPng();
fs.writeFileSync(outPath, png);
