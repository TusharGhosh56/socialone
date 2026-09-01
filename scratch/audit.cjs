const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');

function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getHtmlFiles(fullPath));
    } else if (file.endsWith('.html')) {
      results.push(fullPath);
    }
  });
  return results;
}

const htmlFiles = getHtmlFiles(distDir);
console.log('Total HTML pages audited:', htmlFiles.length);

const suspiciousKeywords = [
  'lorem', 'ipsum', 'consequence', 'sovereign solution', 'diagnostic ledger', 
  'placeholder', 'dummy text', 'sample text', 'synthetic',
  '✓ Equitable', '✓ Full regulatory', '✓ Zero dependency', '✓ Trained internal',
  '✓ Frontline decision', '✓ Partner knowledge', '✓ Grantee AI readiness',
  '✓ Complete transfer', '✓ Real-world telemetry', '✓ Third-party objectivity'
];

let flagsCount = 0;

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(distDir, file);
  suspiciousKeywords.forEach(kw => {
    if (content.toLowerCase().includes(kw.toLowerCase())) {
      console.log(`FLAG in ${relPath}: matches suspicious keyword "${kw}"`);
      flagsCount++;
    }
  });
});

console.log(`Audit scan complete. Total flags found: ${flagsCount}`);
