import { Betoken } from "./betokenjs/betoken-obj.js"
import { stats, timer } from "./betokenjs/helpers.js"
import { loadMetadata, loadFundData, loadTokenPrices, loadStats } from "./betokenjs/data-controller.js"

loadData = () =>
    # init betoken object
    window.betoken = new Betoken()
    await window.betoken.init()

    # load stats data from betoken
    await loadMetadata.then(loadFundData).then(loadTokenPrices).then(loadStats)

currentROI = () =>
    phase = timer.phase()
    rawROIs = stats.raw_roi_data()
    now = Math.floor(new Date().getTime() / 1000)
    phaseStart = timer.phase_start_time()
    phaseLengths = timer.phase_lengths()

    roi = 0
    startTimestamp = 0
    endTimestamp = 0
    switch phase
        when 0 then
            # invest & withdraw phase
            # use last cycle's data
            roi = rawROIs[rawROIs.length - 1][1]
            endTimestamp = phaseStart - phaseLengths[2]
            startTimestamp = endTimestamp - phaseLengths[1]
        when 1 then 
            # manage phase
            # use current data
            roi = stats.cycle_roi()
            startTimestamp = phaseStart
            endTimestamp = now
        when 2 then
            # redeem commission phase
            # use data from manage phase
            roi = stats.cycle_roi()
            startTimestamp = phaseStart - phaseLengths[1]
            endTimestamp = phaseStart