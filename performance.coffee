import { Betoken } from "./betokenjs/betoken-obj.js"
import { stats, timer } from "./betokenjs/helpers.js"
import { loadMetadata, loadTokenPrices, loadStats } from "./betokenjs/data-controller.js"
https = require "https"

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

    betokenROIList = ({roi: rawROIs[i][1], timestamp: {start: 0, end: 0}} for i in [0..rawROIs.length-1])
    switch phase
        when 0
            # invest & withdraw phase
            # use last cycle's data
            betokenROI[betokenROI.length - 1].timestamp.end = phaseStart - phaseLengths[2]
            betokenROI[betokenROI.length - 1].timestamp.start = endTimestamp - phaseLengths[1]
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
            betokenROIList.push({
                roi: stats.cycle_roi().toNumber()
                timestamp: {
                    start: phaseStart - phaseLengths[1]
                    end: phaseStart
                }
            })

    for i in [betokenROIList.length-2..0]
        betokenROIList[i].timestamp.end = betokenROIList[i+1].timestamp.start - phaseLengths[0] - phaseLengths[2]
        betokenROIList[i].timestamp.start = betokenROIList[i].timestamp.end - phaseLengths[1]

    btcROIList = []
    ethROIList = []

    await Promise.all([
        Promise.all(betokenROIList.map((x) ->
            btcStartPrice = await getCoinPriceAtTime("BTC", x.timestamp.start)
            btcEndPrice = await getCoinPriceAtTime("BTC", x.timestamp.end)
            btcROI = (btcEndPrice - btcStartPrice) / btcStartPrice * 100
            return btcROI
        )).then((result) ->
            btcROIList = result
        ),
        Promise.all(betokenROIList.map((x) ->
            ethStartPrice = await getCoinPriceAtTime("ETH", x.timestamp.start)
            ethEndPrice = await getCoinPriceAtTime("ETH", x.timestamp.end)
            ethROI = (ethEndPrice - ethStartPrice) / ethStartPrice * 100
            return ethROI
        )).then((result) ->
            ethROIList = result
        )
    ])
    
    timestamps = (x.timestamp for x in betokenROIList)
    betokenROIList = (x.roi for x in betokenROIList)

    result = {
        ROI: {
            betoken: betokenROIList
            btc: btcROIList
            eth: ethROIList
        },
        'timestamps': timestamps,
        btk1MonthROI: stats.cycle_roi()
        btkInceptionROI: stats.avg_roi()
    }

    return result

window.getROI = getROI