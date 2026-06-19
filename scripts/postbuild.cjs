const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');
const srcPopup = path.join(distDir, 'src/popup/index.html');
const dstPopup = path.join(distDir, 'popup.html');

if (fs.existsSync(srcPopup)) {
  fs.renameSync(srcPopup, dstPopup);
  fs.rmSync(path.join(distDir, 'src/popup'), { recursive: true });
  fs.rmSync(path.join(distDir, 'src'), { recursive: true });
  console.log('✓ popup.html moved to dist root');
}
