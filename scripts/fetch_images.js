const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const products = require("../data/products.json");

const mappingPath = path.join(__dirname, "image-mapping.json");
let mapping = {};
if (fs.existsSync(mappingPath)) {
  mapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
}

function imgQueryFor(name) {
  const q = name.replace(/\(.*\)/, "").split(/\s|&/)[0].replace(/[^a-zA-Z0-9]/g, "") || "perfume";
  return `https://picsum.photos/seed/${encodeURIComponent(q)}/800/800`;
}

function download(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const req = protocol.get(url, { headers: { "User-Agent": "FirstClassPerfume/1.0" } }, (res) => {
      const redirect = res.statusCode >= 300 && res.statusCode < 400 && res.headers.location;
      if (redirect) {
        download(redirect).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("error", reject);
  });
}

(async () => {
  const imgDir = path.join(__dirname, "../public/images");
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

  for (const p of products) {
    const localFile = path.join(imgDir, `${p.id}.jpg`);
    if (fs.existsSync(localFile)) {
      console.log(`Skip (exists): ${p.name}`);
      continue;
    }
    const url = mapping[p.id] || imgQueryFor(p.name);
    console.log(`Downloading ${p.name} -> ${p.id}.jpg`);
    try {
      const buf = await download(url);
      fs.writeFileSync(localFile, buf);
    } catch (e) {
      console.error(`Failed ${p.id}:`, e.message);
    }
  }
  console.log("Done.");
})();
