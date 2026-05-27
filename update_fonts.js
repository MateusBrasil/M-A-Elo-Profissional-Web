const fs = require('fs');
const path = require('path');
const dir = '.';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const oldLink = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;500;600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">';
const newLink = '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">';

let count = 0;
files.forEach(f => {
  let content = fs.readFileSync(path.join(dir, f), 'utf8');
  if (content.includes(oldLink)) {
    content = content.replace(oldLink, newLink);
    fs.writeFileSync(path.join(dir, f), content);
    count++;
  }
});
console.log('Replaced in ' + count + ' files.');
