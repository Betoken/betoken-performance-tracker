// Generated by CoffeeScript 2.3.2
var callAPI, getCoinPriceAtTime, getROI, https, loadData;

import {
  Betoken
} from "./betokenjs/betoken-obj.js";

import {
  stats,
  timer
} from "./betokenjs/helpers.js";

import {
  loadMetadata,
  loadFundData,
  loadTokenPrices,
  loadStats
} from "./betokenjs/data-controller.js";

https = require("https");

callAPI = async function(apiStr) {
  return (await (new Promise(function(resolve, reject) {
    return https.get(apiStr, function(res) {
      var rawData;
      rawData = "";
      res.on("data", function(chunk) {
        return rawData += chunk;
      });
      return res.on("end", function() {
        var parsedData;
        parsedData = JSON.parse(rawData);
        return resolve(parsedData);
      });
    }).on("error", reject);
  })));
};

getCoinPriceAtTime = async function(coin, time) {
  var apiStr, price;
  apiStr = `https://min-api.cryptocompare.com/data/pricehistorical?fsym=DAI&tsyms=${coin}&ts=${time}`;
  price = 1 / ((await callAPI(apiStr))).DAI[coin];
  return price;
};

loadData = async function() {
  // init betoken object
  window.betoken = new Betoken();
  await window.betoken.init();
  // load stats data from betoken
  await loadMetadata(); //.then(loadFundData).then(loadTokenPrices).then(loadStats)
  await loadFundData();
  await loadTokenPrices();
  return (await loadStats());
};

getROI = async function() {
  var betokenROIList, btcEndPrice, btcROI, btcROIList, btcStartPrice, ethEndPrice, ethROI, ethROIList, ethStartPrice, i, j, k, l, len, len1, now, phase, phaseLengths, phaseStart, rawROIs, ref, result, timestamps, x;
  await loadData();
  // get betoken ROI and time range
  phase = timer.phase();
  rawROIs = stats.raw_roi_data();
  now = Math.floor(new Date().getTime() / 1000);
  phaseStart = timer.phase_start_time();
  phaseLengths = timer.phase_lengths();
  betokenROIList = (function() {
    var j, ref, results;
    results = [];
    for (i = j = 0, ref = rawROIs.length - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
      results.push({
        roi: rawROIs[i][1],
        timestamp: {
          start: 0,
          end: 0
        }
      });
    }
    return results;
  })();
  switch (phase) {
    case 0:
      // invest & withdraw phase
      // use last cycle's data
      betokenROI[betokenROI.length - 1].timestamp.end = phaseStart - phaseLengths[2];
      betokenROI[betokenROI.length - 1].timestamp.start = endTimestamp - phaseLengths[1];
      break;
    case 1:
      // manage phase
      // use current data
      betokenROIList.push({
        roi: stats.cycle_roi().toNumber(),
        timestamp: {
          start: phaseStart,
          end: now
        }
      });
      break;
    case 2:
      // redeem commission phase
      // use data from manage phase
      betokenROIList.push({
        roi: stats.cycle_roi().toNumber(),
        timestamp: {
          start: phaseStart - phaseLengths[1],
          end: phaseStart
        }
      });
  }
  for (i = j = ref = betokenROIList.length - 2; (ref <= 0 ? j <= 0 : j >= 0); i = ref <= 0 ? ++j : --j) {
    betokenROIList[i].timestamp.end = betokenROIList[i + 1].timestamp.start - phaseLengths[0] - phaseLengths[2];
    betokenROIList[i].timestamp.start = betokenROIList[i].timestamp.end - phaseLengths[1];
  }
  btcROIList = [];
  for (k = 0, len = betokenROIList.length; k < len; k++) {
    x = betokenROIList[k];
    btcStartPrice = (await getCoinPriceAtTime("BTC", x.timestamp.start));
    btcEndPrice = (await getCoinPriceAtTime("BTC", x.timestamp.end));
    btcROI = (btcEndPrice - btcStartPrice) / btcStartPrice * 100;
    btcROIList.push(btcROI);
  }
  ethROIList = [];
  for (l = 0, len1 = betokenROIList.length; l < len1; l++) {
    x = betokenROIList[l];
    ethStartPrice = (await getCoinPriceAtTime("ETH", x.timestamp.start));
    ethEndPrice = (await getCoinPriceAtTime("ETH", x.timestamp.end));
    ethROI = (ethEndPrice - ethStartPrice) / ethStartPrice * 100;
    ethROIList.push(ethROI);
  }
  timestamps = (function() {
    var len2, m, results;
    results = [];
    for (m = 0, len2 = betokenROIList.length; m < len2; m++) {
      x = betokenROIList[m];
      results.push(x.timestamp);
    }
    return results;
  })();
  betokenROIList = (function() {
    var len2, m, results;
    results = [];
    for (m = 0, len2 = betokenROIList.length; m < len2; m++) {
      x = betokenROIList[m];
      results.push(x.roi);
    }
    return results;
  })();
  result = {
    ROI: {
      betoken: betokenROIList,
      btc: btcROIList,
      eth: ethROIList
    },
    'timestamps': timestamps
  };
  return result;
};

window.getROI = getROI;
