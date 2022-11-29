'use strict';

/** @type {LH.Config.Plugin} */
module.exports = {
  audits: [
    {path: 'lighthouse-plugin-ecoindex/audits/ecoindex.js'}
  ],

  category: {
    title: 'EcoIndex',
    description: 'The environment impact of the web page according to ecoindex.fr',
    auditRefs: [
      {id: 'ecoindex', weight: 1},
    ],
  },
};
