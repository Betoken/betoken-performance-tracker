// imports
import BigNumber from "bignumber.js";
const Data = require("./data-controller");

// exports
export const timer = {
    phase: () => Data.cyclePhase.get(),
    phase_start_time: () => Data.startTimeOfCyclePhase.get(),
    phase_lengths: () => Data.phaseLengths.get()
}

export const stats = {
    avg_roi: () => Data.avgROI.get(),
    fund_value: () => Data.fundValue.get(),
    cycle_roi: () => {
        if (Data.cyclePhase.get() === 2) {
            return Data.currROI.get();
        }
        return Data.fundValue.get().minus(Data.totalFunds.get()).div(Data.totalFunds.get()).times(100)
    },
    raw_roi_data: () => Data.ROIArray.get()
}