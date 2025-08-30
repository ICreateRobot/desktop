const fs = require('fs');

process.on('message', ({ hexPath, targetPath }) => {
  try {
    const hexData = fs.readFileSync(hexPath);
    fs.writeFileSync(targetPath, hexData);
    process.send({ success: true, message: '写入完成' });
  } catch (e) {
    process.send({ success: false, error: e.message });
  }
});
