import React from 'scratch-gui/node_modules/react';
import ReactDOM from 'scratch-gui/node_modules/react-dom';
import AddonSettings from 'scratch-gui/src/addons/settings/settings.jsx';
import '../prompt/prompt.js';
import ErrorContainerHOC from '../error/error-container-hoc.jsx';

const handleExportSettings = (settings) => {
  AddonsPreload.exportSettings(JSON.stringify(settings));
};

const WrappedAddonSettings = ErrorContainerHOC(AddonSettings);

const appTarget = document.getElementById('app');
document.body.classList.add('tw-loaded');

ReactDOM.render((
  <WrappedAddonSettings
    onExportSettings={handleExportSettings}
  />
), appTarget);
