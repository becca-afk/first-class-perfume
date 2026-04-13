const fs = require('fs');
const path = require('path');

const gcpHelper = `
const os = require('os');
const tmpDir = os.tmpdir();

function getDataFile(filename) {
  const isGCP = process.env.GAE_ENV || process.env.GOOGLE_CLOUD_PROJECT;
  if (!isGCP) {
    return path.join(__dirname, "data", filename);
  }
  
  const tmpFile = path.join(tmpDir, filename);
  const origFile = path.join(__dirname, "data", filename);
  
  if (!fs.existsSync(tmpFile)) {
    if (fs.existsSync(origFile)) {
      try {
        fs.copyFileSync(origFile, tmpFile);
      } catch(e) {
        console.error("GCP File copy error:", e);
      }
    } else {
      // If it doesn't exist natively, just provide the expected structure if possible
      try {
        if (filename === 'orders.json') {
          fs.writeFileSync(tmpFile, JSON.stringify({ orders: [], nextOrderId: 1 }));
        } else if (filename === 'users.json') {
          fs.writeFileSync(tmpFile, JSON.stringify({ users: [], nextUserId: 1 }));
        }
      } catch(e){}
    }
  }
  return tmpFile;
}
`;

let code = fs.readFileSync('server.js', 'utf8');

// Insert the helper after the requires
const requireRegex = /const axios = require\("axios"\);\nrequire\("dotenv"\)\.config\(\);\n/;
code = code.replace(requireRegex, (match) => match + gcpHelper);

// Replace path.join(__dirname, "data", "products.json")
code = code.replace(/path\.join\(__dirname, "data", "products\.json"\)/g, 'getDataFile("products.json")');
code = code.replace(/path\.join\(__dirname, "data", "orders\.json"\)/g, 'getDataFile("orders.json")');
code = code.replace(/path\.join\(__dirname, "data", "users\.json"\)/g, 'getDataFile("users.json")');

fs.writeFileSync('server.js', code);
console.log("Patched server.js for GCP!");
