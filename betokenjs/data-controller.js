// imports
import ReactiveVar from "meteor-standalone-reactive-var";
import BigNumber from "bignumber.js";

// constants
const PRECISION = 1e18;
export const TOKENS = require("./kn_token_symbols.json");
const DEPLOYED_BLOCK = 2721413;
const DAI_ADDR = "0x6f2d6ff85efca691aad23d549771160a12f0a0fc";

// instance variables

// fund metadata
export var totalFunds = new ReactiveVar(BigNumber(0));

// fund stats
export var fundValue = new ReactiveVar(BigNumber(0));
export var currROI = new ReactiveVar(BigNumber(0));
export var avgROI = new ReactiveVar(BigNumber(0));
export var ROIArray = new ReactiveVar([]);

// cycle timekeeping
export var cycleNumber = new ReactiveVar(0);
export var cyclePhase = new ReactiveVar(0);
export var phaseLengths = new ReactiveVar([]);
export var startTimeOfCyclePhase = new ReactiveVar(0);

// token data
export var tokenPrices = new ReactiveVar([]);
export var tokenAddresses = new ReactiveVar([]);

// loading indicator
export var isLoadingPrices = new ReactiveVar(true);

// network info
export var networkName = new ReactiveVar("");
export var networkPrefix = new ReactiveVar("");

// helpers
export const assetSymbolToPrice = function(_symbol) {
    return tokenPrices.get()[TOKENS.indexOf(_symbol)];
};

export const assetAddressToSymbol = function(_addr) {
    return TOKENS[tokenAddresses.get().indexOf(_addr)];
};

export const assetSymbolToAddress = function(_symbol) {
    return tokenAddresses.get()[TOKENS.indexOf(_symbol)];
};

// data loaders
export const loadMetadata = async () => {
    return Promise.all([
        // get params
        phaseLengths.set(((await betoken.getPrimitiveVar("getPhaseLengths"))).map(x => +x)),
        tokenAddresses.set((await Promise.all(TOKENS.map(async (_token) => {
            return await betoken.tokenSymbolToAddress(_token);
        })))),
        cyclePhase.set(+((await betoken.getPrimitiveVar("cyclePhase")))), 
        startTimeOfCyclePhase.set(+((await betoken.getPrimitiveVar("startTimeOfCyclePhase")))),
        totalFunds.set(BigNumber((await betoken.getPrimitiveVar("totalFundsInDAI"))).div(PRECISION))
    ]);
};

export const loadTokenPrices = async () => {
    isLoadingPrices.set(true);

    tokenPrices.set(await Promise.all(TOKENS.map(async (_token) => {
        return betoken.getTokenPrice(_token).then((_price) => {
            return BigNumber(_price).div(PRECISION);
        });
    })));
    isLoadingPrices.set(false);
};

export const loadStats = async () => {
    // calculate fund value
    var _fundValue = BigNumber(0);
    const getTokenValue = async (i) => {
        var _token = TOKENS[i];
        var balance = BigNumber(await betoken.getTokenBalance(assetSymbolToAddress(_token), betoken.contracts.BetokenFund.options.address)).div(BigNumber(10).pow(await betoken.getTokenDecimals(assetSymbolToAddress(_token))));
        var value = balance.times(assetSymbolToPrice(_token));
        _fundValue = _fundValue.plus(value);
    };
    const getAllTokenValues = () => {
        var result = [];
        for (var i = 0; i < TOKENS.length; i++) {
            result.push(getTokenValue(i));
        }
        return result;
    }
    await Promise.all(getAllTokenValues());
    var totalDAI = BigNumber(await betoken.getTokenBalance(DAI_ADDR, betoken.contracts.BetokenFund.options.address)).minus(await betoken.getPrimitiveVar("totalCommissionLeft")).div(PRECISION);
    _fundValue = _fundValue.plus(totalDAI);
    fundValue.set(_fundValue);

    // get stats
    var rois = [];
    var totalInputFunds = BigNumber(0);
    var totalOutputFunds = BigNumber(0);
    currROI.set(BigNumber(0));
    avgROI.set(BigNumber(0));
    return Promise.all([
        betoken.contracts.BetokenFund.getPastEvents("ROI",
        {
            fromBlock: DEPLOYED_BLOCK
        }).then(function(events) {
            var ROI,
            _event,
            data,
            j,
            len;
            for (j = 0, len = events.length; j < len; j++) {
                _event = events[j];
                data = _event.returnValues;
                ROI = BigNumber(data._afterTotalFunds).minus(data._beforeTotalFunds).div(data._beforeTotalFunds).times(100);
                // Update chart data
                rois.push([+data._cycleNumber, ROI.toNumber()]);
                
                if (+data._cycleNumber === cycleNumber.get()) {
                    currROI.set(ROI);
                }

                // Update average ROI
                totalInputFunds = totalInputFunds.plus(BigNumber(data._beforeTotalFunds).div(PRECISION));
                totalOutputFunds = totalOutputFunds.plus(BigNumber(data._afterTotalFunds).div(PRECISION));
            }
            ROIArray.set(rois);
        }).then(() => {
            // Take current cycle's ROI into consideration
            if (cyclePhase.get() !== 2) {
                totalInputFunds = totalInputFunds.plus(totalFunds.get());
                totalOutputFunds = totalOutputFunds.plus(fundValue.get());
            }
            avgROI.set(totalOutputFunds.minus(totalInputFunds).div(totalInputFunds).times(100));
        })
    ]);
};