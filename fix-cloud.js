const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');
code = code.replace(/^const isGCP = .*$/m, '');

const helper = `
const os = require('os');
const tmpDir = os.tmpdir();
function getDataFile(filename) {
  const isCloud = process.env.GAE_ENV || process.env.GOOGLE_CLOUD_PROJECT || process.env.VERCEL;
  if (!isCloud) return path.join(__dirname, 'data', filename);
  
  const tmpFile = path.join(tmpDir, filename);
  const origFile = path.join(__dirname, 'data', filename);
  
  if (!fs.existsSync(tmpFile)) {
    if (fs.existsSync(origFile)) {
      try { fs.copyFileSync(origFile, tmpFile); } catch(e){}
    } else {
      try {
        if (filename === 'orders.json') fs.writeFileSync(tmpFile, JSON.stringify({orders:[],nextOrderId:1}));
        else if (filename === 'users.json') fs.writeFileSync(tmpFile, JSON.stringify({users:[],nextUserId:1}));
      } catch(e){}
    }
  }
  return tmpFile;
}
`;

code = code.replace(/(require\(['"]dotenv['"]\)\.config\(\);)/, '$1\n' + helper);
code = code.replace(/path\.join\(__dirname,\s*['"]data['"],\s*(['"][a-z0-9.]+['"])\)/g, 'getDataFile($1)');

fs.writeFileSync('server.js', code);
console.log('Fixed server.js for Cloud providers!');
