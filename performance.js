// Generated by CoffeeScript 2.3.2
var BONDS_MONTHLY_INTEREST, NUM_DECIMALS, callAPI, getCoinPriceAtTime, getROI, https, loadData;

import {
  Betoken
} from "./betokenjs/betoken-obj.js";

import {
  stats,
  timer
} from "./betokenjs/helpers.js";

import {
  loadMetadata,
  loadTokenPrices,
  loadStats
} from "./betokenjs/data-controller.js";

import BigNumber from "bignumber.js";

https = require("https");

BONDS_MONTHLY_INTEREST = 2.4662697e-3; // 3% annual interest rate

NUM_DECIMALS = 4;

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
  apiStr = `https://min-api.cryptocompare.com/data/pricehistorical?fsym=${coin}&tsyms=USD&ts=${time}`;
  price = ((await callAPI(apiStr)))[coin].USD;
  return price;
};

loadData = async function() {
  // init betoken object
  window.betoken = new Betoken();
  await window.betoken.init();
  // load stats data from betoken
  await loadMetadata();
  await loadTokenPrices();
  return (await loadStats());
};

getROI = async function() {
  var betokenROIList, btcROIList, calcDownsideStd, calcMean, calcSampleStd, convertToCumulative, ethROIList, excessReturnDownsideStd, i, j, meanExcessReturn, now, oneMonthROI, phase, phaseLengths, phaseStart, rawROIs, ref, result, sortinoRatio, timestamps, x;
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
        roi: BigNumber(rawROIs[i][1]).dp(NUM_DECIMALS),
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
      betokenROIList[betokenROIList.length - 1].timestamp.end = phaseStart - phaseLengths[2];
      betokenROIList[betokenROIList.length - 1].timestamp.start = phaseStart - phaseLengths[2] - phaseLengths[1];
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
      betokenROIList[betokenROIList.length - 1].timestamp.start = phaseStart - phaseLengths[1];
      betokenROIList[betokenROIList.length - 1].timestamp.end = phaseStart;
  }
  betokenROIList[betokenROIList.length - 1].roi = BigNumber(betokenROIList[betokenROIList.length - 1].roi).dp(NUM_DECIMALS);
  for (i = j = ref = betokenROIList.length - 2; (ref <= 0 ? j <= 0 : j >= 0); i = ref <= 0 ? ++j : --j) {
    betokenROIList[i].timestamp.end = betokenROIList[i + 1].timestamp.start - phaseLengths[0] - phaseLengths[2];
    betokenROIList[i].timestamp.start = betokenROIList[i].timestamp.end - phaseLengths[1];
  }
  // get the ROI data of BTC & ETH during the same time periods
  btcROIList = [];
  ethROIList = [];
  await Promise.all([
    Promise.all(betokenROIList.map(async function(x) {
      var btcEndPrice,
    btcROI,
    btcStartPrice;
      btcStartPrice = (await getCoinPriceAtTime("BTC",
    x.timestamp.start));
      btcEndPrice = (await getCoinPriceAtTime("BTC",
    x.timestamp.end));
      btcROI = BigNumber((btcEndPrice - btcStartPrice) / btcStartPrice * 100).dp(NUM_DECIMALS);
      return btcROI;
    })).then(function(result) {
      return btcROIList = result;
    }),
    Promise.all(betokenROIList.map(async function(x) {
      var ethEndPrice,
    ethROI,
    ethStartPrice;
      ethStartPrice = (await getCoinPriceAtTime("ETH",
    x.timestamp.start));
      ethEndPrice = (await getCoinPriceAtTime("ETH",
    x.timestamp.end));
      ethROI = BigNumber((ethEndPrice - ethStartPrice) / ethStartPrice * 100).dp(NUM_DECIMALS);
      return ethROI;
    })).then(function(result) {
      return ethROIList = result;
    })
  ]);
  // reformat data so that they're easier to use
  timestamps = (function() {
    var k, len, results;
    results = [];
    for (k = 0, len = betokenROIList.length; k < len; k++) {
      x = betokenROIList[k];
      results.push(x.timestamp);
    }
    return results;
  })();
  betokenROIList = (function() {
    var k, len, results;
    results = [];
    for (k = 0, len = betokenROIList.length; k < len; k++) {
      x = betokenROIList[k];
      results.push(x.roi);
    }
    return results;
  })();
  oneMonthROI = betokenROIList[betokenROIList.length - 1];
  // calculate more stats for Betoken
  calcMean = function(list) {
    return list.reduce(function(accumulator, curr) {
      return BigNumber(accumulator).plus(curr);
    }).div(list.length);
  };
  calcSampleStd = function(list) {
    var mean, sampleStd, sampleVar;
    mean = calcMean(list);
    sampleVar = list.reduce(function(accumulator, curr) {
      return BigNumber(accumulator).plus(BigNumber(curr - mean).pow(2));
    }, 0).div(list.length - 1);
    sampleStd = sampleVar.sqrt();
    return sampleStd;
  };
  calcDownsideStd = function(list, minAcceptableRate) {
    var sampleStd, sampleVar;
    sampleVar = list.reduce(function(accumulator, curr) {
      return BigNumber(accumulator).plus(BigNumber(BigNumber.min(curr - minAcceptableRate, 0)).pow(2));
    }, 0).div(list.length - 1);
    sampleStd = sampleVar.sqrt();
    return sampleStd;
  };
  // Sharpe Ratio (against BTC, since inception)
  meanExcessReturn = calcMean(betokenROIList).minus(BONDS_MONTHLY_INTEREST);
  excessReturnDownsideStd = calcDownsideStd(betokenROIList, BONDS_MONTHLY_INTEREST);
  sortinoRatio = meanExcessReturn.div(excessReturnDownsideStd);
  convertToCumulative = function(list) {
    var k, len, roi, tmp, tmpArray;
    tmp = BigNumber(1);
    tmpArray = [BigNumber(0)];
    for (k = 0, len = list.length; k < len; k++) {
      roi = list[k];
      tmp = roi.div(100).plus(1).times(tmp);
      tmpArray.push(tmp.times(100).minus(100));
    }
    return tmpArray;
  };
  betokenROIList = convertToCumulative(betokenROIList);
  btcROIList = convertToCumulative(btcROIList);
  ethROIList = convertToCumulative(ethROIList);
  result = {
    ROI: {
      betoken: betokenROIList,
      btc: btcROIList,
      eth: ethROIList
    },
    'timestamps': timestamps,
    betokenStats: {
      ROI: {
        oneMonth: oneMonthROI,
        sinceInception: betokenROIList[betokenROIList.length - 1]
      },
      SortinoRatio: sortinoRatio,
      Std: calcSampleStd(betokenROIList)
    }
  };
  return result;
};

window.getROI = getROI;
