/**
 * @param {Electron.BrowserWindow} window
 */
function setupConstruct(that) {
    const wc = that.window.webContents;
    wc.setZoomLevel(0);
    wc.setVisualZoomLevelLimits(1, 1);
    that.window.on('focus', () => {
        wc.setZoomLevel(0);
    });

    wc.on('did-finish-load', () => {
        wc.setZoomLevel(0);
    });
    wc.on('select-bluetooth-device', (event, devices, callback) => {
        that.handleSelectBluetoothDevice(event, devices, callback);
    });
}

module.exports = {
  setupConstruct
};