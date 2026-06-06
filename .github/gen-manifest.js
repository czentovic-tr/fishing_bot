// Regenerates manifest.json with SHA-256 (uppercase) hashes of every runtime file the
// TERA Toolbox keeps in sync. Run by CI on every push so the manifest is never stale.
const fs = require('fs');
const crypto = require('crypto');

function sha(p) {
    return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
}

const files = {};
for (const f of ['index.js', 'module.json', 'settings_migrator.js'])
    if (fs.existsSync(f)) files[f] = sha(f);

if (fs.existsSync('defs'))
    for (const f of fs.readdirSync('defs').filter(x => x.endsWith('.def')).sort())
        files['defs/' + f] = sha('defs/' + f);

fs.writeFileSync('manifest.json', JSON.stringify({ files }, null, 2) + '\n');
console.log('manifest.json regenerated: ' + Object.keys(files).length + ' files');
