// imports
import BigNumber from "bignumber.js";
const Data = require("./data-controller");

// exports
export const timer = {
    day: () => Data.countdownDay.get(),
    hour: () => Data.countdownHour.get(),
    minute: () => Data.countdownMin.get(),
    second: () => Data.countdownSec.get(),
    phase: () => Data.cyclePhase.get(),
    phase_start_time: () => Data.startTimeOfCyclePhase.get(),
    phase_lengths: () => Data.phaseLengths.get()
}

export const stats = {
    cycle_length: () => {
        if (Data.phaseLengths.get().length > 0) {
            return BigNumber(Data.phaseLengths.get().reduce(function (t, n) {
                return t + n;
            })).div(24 * 60 * 60).toDigits(3);
        }
    },
    total_funds: () => Data.totalFunds.get(),
    avg_roi: () => Data.avgROI.get(),
    fund_value: () => Data.fundValue.get(),
    cycle_roi: () => {
        if (Data.cyclePhase.get() === 2) {
            return Data.currROI.get();
        }
        return Data.fundValue.get().minus(Data.totalFunds.get()).div(Data.totalFunds.get()).times(100)
    },
    raw_roi_data: () => Data.ROIArray.get(),
    ranking: () => Data.kairoRanking.get()
}