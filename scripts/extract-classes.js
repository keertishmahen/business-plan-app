const fs = require("fs");
const path = require("path");

const classes = new Set();
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.jsx?$/.test(f) && !/test/.test(f)) {
      const src = fs.readFileSync(p, "utf8");
      const re = /className=\{?["'`]([^"'`}]+)["'`]/g;
      let m;
      while ((m = re.exec(src))) {
        m[1].split(/\s+/).forEach((c) => {
          if (c && !c.includes("$")) classes.add(c);
        });
      }
    }
  }
}
walk(path.join(__dirname, "..", "src"));
console.log([...classes].sort().join("\n"));
