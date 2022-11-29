/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

// Come from https://github.com/cnumr/GreenIT-Analysis/blob/master/script/ecoIndex.js

'use strict';

const Audit = require('lighthouse').Audit;
const NetworkRecords = require('lighthouse').NetworkRecords;

const quantiles_dom = [
  0,
  47,
  75,
  159,
  233,
  298,
  358,
  417,
  476,
  537,
  603,
  674,
  753,
  843,
  949,
  1076,
  1237,
  1459,
  1801,
  2479,
  594601,
];
const quantiles_req = [0, 2, 15, 25, 34, 42, 49, 56, 63, 70, 78, 86, 95, 105, 117, 130, 147, 170, 205, 281, 3920];
const quantiles_size = [
  0,
  1.37,
  144.7,
  319.53,
  479.46,
  631.97,
  783.38,
  937.91,
  1098.62,
  1265.47,
  1448.32,
  1648.27,
  1876.08,
  2142.06,
  2465.37,
  2866.31,
  3401.59,
  4155.73,
  5400.08,
  8037.54,
  223212.26,
];

/**
Calcul ecoIndex based on formula from web site www.ecoindex.fr
**/
function computeEcoIndex(dom, req, size) {
  const q_dom = computeQuantile(quantiles_dom, dom);
  const q_req = computeQuantile(quantiles_req, req);
  const q_size = computeQuantile(quantiles_size, size);

  //return Math.round(100 - (5 * (3 * q_dom + 2 * q_req + q_size)) / 6);
  return 100 - 5 * (3*q_dom + 2*q_req + q_size)/6;
}

function computeQuantile(quantiles, value) {
  for (let i = 1; i < quantiles.length; i++) {
    if (value < quantiles[i]) return (i - 1 + (value - quantiles[i - 1]) / (quantiles[i] - quantiles[i - 1]));
  }
  return quantiles.length -1;
}

function getEcoIndexGrade(ecoIndex) {
  if (ecoIndex > 80) return "A";
  if (ecoIndex > 70) return "B";
  if (ecoIndex > 55) return "C";
  if (ecoIndex > 40) return "D";
  if (ecoIndex > 25) return "E";
  if (ecoIndex > 10) return "F";
  return "G";
}

function computeGreenhouseGasesEmissionfromEcoIndex(ecoIndex) {
  return parseFloat((2 + (2 * (50 - ecoIndex)) / 100).toFixed(2));
}

function computeWaterConsumptionfromEcoIndex(ecoIndex) {
  return parseFloat((3 + (3 * (50 - ecoIndex)) / 100).toFixed(2));
}

class EcoindexAudit extends Audit {
  static get meta() {
    return {
      id: 'ecoindex',
      title: 'Environmental impact is low',
      failureTitle: 'Environmental impact is too high',
      description: 'The ecoindex evaluates the environmental performance achieved by a website / online service with regard to objective technical parameters: number of DOM elements, number of HTTP requests, URL weight (KB transferred).',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['devtoolsLogs', 'DOMStats'],
    };
  }

  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];

    // Number of requests
    const requests = await NetworkRecords.request(devtoolsLog, context);
    let numberOfRequests = requests.length;

    // Size of requests
    let sizeOfRequests = 0;
    requests.forEach(record => {
      //if (NetworkRequest.isNonNetworkRequest(record) || !record.transferSize) return;
      if (!record.transferSize) return;
      sizeOfRequests += record.transferSize;
    });



    // Size of the page
    const stats = artifacts.DOMStats;
    let domSize = stats.totalBodyElements;

    // EcoIndex
    let ecoIndex = computeEcoIndex(domSize, numberOfRequests, Math.round(sizeOfRequests / 1000 / 1000));

    // Resulsts
    let result = {
      ecoIndex: ecoIndex,
      domSize: domSize,
      numberOfRequests: numberOfRequests,
      sizeOfRequests: sizeOfRequests,
      grade: getEcoIndexGrade(ecoIndex),
      greenhouseGasesEmission: computeGreenhouseGasesEmissionfromEcoIndex(ecoIndex),
      waterConsumption: computeWaterConsumptionfromEcoIndex(ecoIndex)
    }

    let results = [result]

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [{
        key: 'grade',
        itemType: 'text',
        text: "Grade"
      },
      {
        key: 'greenhouseGasesEmission',
        itemType: 'text',
        text: "GHG (gCO2e)"
      },
      {
        key: 'waterConsumption',
        itemType: 'text',
        text: "Water (cl)"
      },
      {
        key: 'domSize',
        itemType: 'text',
        text: "DOM size"
      },
      {
        key: 'numberOfRequests',
        itemType: 'text',
        text: "Requests number"
      },
      {
        key: 'sizeOfRequests',
        itemType: 'bytes',
        text: "Requests size"
      },
    ];

    const tableDetails = Audit.makeTableDetails(headings, results);
    /*const tableDetails = Audit.makeListDetails([
      result.grade,
      result.greenhouseGasesEmission,
      result.waterConsumption,
      result.pageSize,
      result.numberOfRequests,
      result.sizeOfRequests]);*/

    return {
      score: ecoIndex / 100,
      displayValue: '',
      details: tableDetails
    };
  }
}

module.exports = EcoindexAudit;
