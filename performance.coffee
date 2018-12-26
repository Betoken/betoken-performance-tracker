import { Betoken } from "./betokenjs/betoken-obj.js"
import { stats, timer } from "./betokenjs/helpers.js"
import { loadMetadata, loadTokenPrices, loadStats } from "./betokenjs/data-controller.js"
import BigNumber from "bignumber.js"
https = require "https"

BONDS_MONTHLY_INTEREST = 2.4662697e-3 # 3% annual interest rate
NUM_DECIMALS = 4

callAPI = (apiStr) ->
    return (await (new Promise((resolve, reject) ->
        https.get(apiStr, (res) ->
            rawData = ""
            res.on("data", (chunk) ->
                rawData += chunk
            )
            res.on("end", () ->
                parsedData = JSON.parse(rawData)
                resolve(parsedData)
            )
        ).on("error", reject)
    )))


getCoinPriceAtTime = (coin, time) ->
    apiStr = "https://min-api.cryptocompare.com/data/pricehistorical?fsym=DAI&tsyms=#{coin}&ts=#{time}"
    price = 1 / (await callAPI(apiStr)).DAI[coin]
    return price


loadData = () ->
    # init betoken object
    window.betoken = new Betoken()
    await window.betoken.init()

    # load stats data from betoken
    await loadMetadata()
    await loadTokenPrices()
    await loadStats()


getROI = () ->
    await loadData()

    # get betoken ROI and time range
    phase = timer.phase()
    rawROIs = stats.raw_roi_data()
    now = Math.floor(new Date().getTime() / 1000)
    phaseStart = timer.phase_start_time()
    phaseLengths = timer.phase_lengths()

    betokenROIList = ({roi: BigNumber(rawROIs[i][1]).dp(NUM_DECIMALS), timestamp: {start: 0, end: 0}} for i in [0..rawROIs.length-1])
    switch phase
        when 0
            # invest & withdraw phase
            # use last cycle's data
            betokenROIList[betokenROIList.length - 1].timestamp.end = phaseStart - phaseLengths[2]
            betokenROIList[betokenROIList.length - 1].timestamp.start = phaseStart - phaseLengths[2] - phaseLengths[1]
        when 1
            # manage phase
            # use current data
            betokenROIList.push({
                roi: stats.cycle_roi().toNumber()
                timestamp: {
                    start: phaseStart
                    end: now
                }
            })
        when 2
            # redeem commission phase
            # use data from manage phase
            betokenROIList[betokenROIList.length - 1].timestamp.start = phaseStart - phaseLengths[1]
            betokenROIList[betokenROIList.length - 1].timestamp.end = phaseStart

    betokenROIList[betokenROIList.length - 1].roi = BigNumber(betokenROIList[betokenROIList.length - 1].roi).dp(NUM_DECIMALS)

    for i in [betokenROIList.length-2..0]
        betokenROIList[i].timestamp.end = betokenROIList[i+1].timestamp.start - phaseLengths[0] - phaseLengths[2]
        betokenROIList[i].timestamp.start = betokenROIList[i].timestamp.end - phaseLengths[1]


    # get the ROI data of BTC & ETH during the same time periods
    btcROIList = []
    ethROIList = []

    await Promise.all([
        Promise.all(betokenROIList.map((x) ->
            btcStartPrice = await getCoinPriceAtTime("BTC", x.timestamp.start)
            btcEndPrice = await getCoinPriceAtTime("BTC", x.timestamp.end)
            btcROI = BigNumber((btcEndPrice - btcStartPrice) / btcStartPrice * 100).dp(NUM_DECIMALS)
            return btcROI
        )).then((result) ->
            btcROIList = result
        ),
        Promise.all(betokenROIList.map((x) ->
            ethStartPrice = await getCoinPriceAtTime("ETH", x.timestamp.start)
            ethEndPrice = await getCoinPriceAtTime("ETH", x.timestamp.end)
            ethROI = BigNumber((ethEndPrice - ethStartPrice) / ethStartPrice * 100).dp(NUM_DECIMALS)
            return ethROI
        )).then((result) ->
            ethROIList = result
        )
    ])

    # reformat data so that they're easier to use
    timestamps = (x.timestamp for x in betokenROIList)
    betokenROIList = (x.roi for x in betokenROIList)

    # calculate more stats for Betoken
    calcMean = (list) ->
        return list.reduce((accumulator, curr) -> BigNumber(accumulator).plus(curr)).div(list.length)

    calcSampleStd = (list) ->
        mean = calcMean(list)
        sampleVar = list.reduce(
            (accumulator, curr) -> 
                BigNumber(accumulator).plus(BigNumber(curr - mean).pow(2))
            , 0).div(list.length - 1)
        sampleStd = sampleVar.sqrt()

    # Sharpe Ratio (against BTC, since inception)
    meanExcessReturn = calcMean(betokenROIList).minus(BONDS_MONTHLY_INTEREST)
    excessReturnList = []
    for i in [0..betokenROIList.length-1]
        excessReturnList[i] = betokenROIList[i].minus(BONDS_MONTHLY_INTEREST)
    excessReturnStd = calcSampleStd(excessReturnList)
    sharpeRatio = meanExcessReturn.div(excessReturnStd)

    result = {
        ROI: {
            betoken: betokenROIList
            btc: btcROIList
            eth: ethROIList
        }
        'timestamps': timestamps
        betokenStats: {
            ROI: {
                oneMonth: betokenROIList[betokenROIList.length - 1]
                sinceInception: stats.avg_roi()
            }
            SharpeRatio: sharpeRatio
            Std: calcSampleStd(betokenROIList)
        }
    }

    return result

window.getROI = getROI