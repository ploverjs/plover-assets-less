'use strict';


module.exports = function(app) {
  const handler = require('./less-handler');
  app.ploverAssetsHandler.add('css', '.less', handler);
};
