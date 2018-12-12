import { Betoken } from "./betokenjs/betoken-obj.js"
import { stats, timer } from "./betokenjs/helpers.js"
import { loadMetadata, loadFundData, loadTokenPrices, loadStats } from "./betokenjs/data-controller.js"
https = require "https"

loadData = () =>
    # init betoken object
    window.betoken = new Betoken()
    await window.betoken.init()

    # load stats data from betoken
    await loadMetadata.then(loadFundData).then(loadTokenPrices).then(loadStats)


getROI = () =>
    # get betoken ROI and time range
    phase = timer.phase()
    rawROIs = stats.raw_roi_data()
    now = Math.floor(new Date().getTime() / 1000)
    phaseStart = timer.phase_start_time()
    phaseLengths = timer.phase_lengths()

    betokenROI = 0
    blxROI = 0
    startTimestamp = 0
    endTimestamp = 0
    switch phase
        when 0
            # invest & withdraw phase
            # use last cycle's data
            betokenROI = rawROIs[rawROIs.length - 1][1]
            endTimestamp = phaseStart - phaseLengths[2]
            startTimestamp = endTimestamp - phaseLengths[1]
        when 1
            # manage phase
            # use current data
            betokenROI = stats.cycle_roi()
            startTimestamp = phaseStart
            endTimestamp = now
        when 2
            # redeem commission phase
            # use data from manage phase
            betokenROI = stats.cycle_roi()
            startTimestamp = phaseStart - phaseLengths[1]
            endTimestamp = phaseStart

    # get BLX ROI in the given time range
    apiStr = "https://api.iconomi.net/v1/daa/BLX/pricehistory"
    prices = (await (new Promise((resolve, reject) ->
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
    ))).values
    # find price near start timestamp
    blxStartPrice = 0.0
    i = 0
    while i < prices.length
        timestamp = prices[i].x
        if timestamp >= startTimestamp
            blxStartPrice = prices[i].y
        i += 1
    # find price near end timestamp
    blxEndPrice = 0.0
    i = prices.length - 1
    while i >= 0
        timestamp = prices[i].x
        if timestamp <= startTimestamp
            blxEndPrice = prices[i].y
        i -= 1
    blxROI = (blxEndPrice - blxStartPrice) / blxStartPrice

    return [betokenROI, blxROI, startTimestamp, endTimestamp]

