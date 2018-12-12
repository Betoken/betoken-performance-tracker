// imports
import BigNumber from "bignumber.js";
const Data = require("./data-controller");

// constants
const WRONG_NETWORK_ERR = "Please switch to Rinkeby Testnet in order to use Betoken Omen.";
const SEND_TX_ERR = "There was an error during sending your transaction to the Ethereum blockchain. Please check that your inputs are valid and try again later.";
const INPUT_ERR = "There was an error in your input. Please fix it and try again.";
const NO_WEB3_ERR = "Betoken can only be used in a Web3 enabled browser. Please install MetaMask or switch to another browser that supports Web3. You can currently view the fund's data, but cannot make any interactions.";
const METAMASK_LOCKED_ERR = "Your browser seems to be Web3 enabled, but you need to unlock your account to interact with Betoken.";
const DEPENDENCY_ERR = "Please enable MetaMask or visit this page in a Web3 browser to interact with Betoken on Rinkeby Testnet."
var error_msg = "";

// exports

export const error_notifications = {
    get_error_msg: () => error_msg,
    set_error_msg: (msg) => {
        error_msg = msg;
    },
    check_dependency: () => {
        if (typeof betoken === "undefined") {
            error_notifications.set_error_msg(DEPENDENCY_ERR);
        }
        else {
            if (network.has_web3() === false) {
                error_notifications.set_error_msg(NO_WEB3_ERR);
            } else {
                error_notifications.set_error_msg('');
            }
        }
    }
}

export const network = {
    network_prefix: () => Data.networkPrefix.get(),
    network_name: () => Data.networkName.get(),
    has_web3: () => betoken.hasWeb3
}

export const timer = {
    day: () => Data.countdownDay.get(),
    hour: () => Data.countdownHour.get(),
    minute: () => Data.countdownMin.get(),
    second: () => Data.countdownSec.get(),
    phase: () => Data.cyclePhase.get(),
    phase_start_time: () => Data.startTimeOfCyclePhase.get(),
    phase_lengths: () => Data.phaseLengths.get()
}

export const user = {
    address: () => Data.userAddress.get(),
    share_balance: () => Data.investmentBalance.get(),
    kairo_balance: () => Data.kairoBalance.get(),
    monthly_roi: () => Data.managerROI.get(),
    can_redeem_commission: () => {
        try {
            betoken.hasWeb3 && Data.cyclePhase.get() === 2 && Data.lastCommissionRedemption.get() < Data.cycleNumber.get();
        }
        catch (error) {
        }
    },
    expected_commission: function () {
        if (Data.kairoTotalSupply.get().greaterThan(0)) {
            if (Data.cyclePhase.get() === 2) {
                // Actual commission that will be redeemed
                return Data.kairoBalance.get().div(Data.kairoTotalSupply.get()).mul(Data.cycleTotalCommission.get());
            }
            // Expected commission based on previous average ROI
            var roi = Data.avgROI.get().gt(0) ? Data.avgROI.get() : BigNumber(0);
            return Data.kairoBalance.get().div(Data.kairoTotalSupply.get()).mul(Data.totalFunds.get()).mul(roi.div(100).mul(Data.commissionRate.get()).add(Data.assetFeeRate.get()));
        }
        return BigNumber(0);
    },
    transaction_history: () => Data.transactionHistory.get(),
    investment_list: () => Data.investmentList.get(),
    rank: () => {
        var entry, j, len, ref;
        ref = Data.kairoRanking.get();
        for (j = 0, len = ref.length; j < len; j++) {
            entry = ref[j];
            if (entry.address === Data.userAddress.get()) {
                return entry.rank;
            }
        }
        return "N/A";
    },
    portfolio_value: () => Data.portfolioValue.get()
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
        return Data.fundValue.get().sub(Data.totalFunds.get()).div(Data.totalFunds.get()).mul(100)
    },
    raw_roi_data: () => Data.ROIArray.get(),
    ranking: () => Data.kairoRanking.get()
}

export const tokens = {
    token_list: () => Data.TOKENS,
    token_prices: () => Data.tokenPrices.get(),
    asset_symbol_to_daily_price_change: (_symbol) => Data.assetSymbolToDailyPriceChange(_symbol),
    asset_symbol_to_weekly_price_change: (_symbol) => Data.assetSymbolToWeeklyPriceChange(_symbol),
    asset_symbol_to_monthly_price_change: (_symbol) => Data.assetSymbolToMonthlyPriceChange(_symbol),
    asset_symbol_to_price: (_symbol) => Data.assetSymbolToPrice(_symbol)
}

export const loading = {
    investments: () => Data.isLoadingInvestments.get(),
    ranking: () => Data.isLoadingRanking.get(),
    records: () => Data.isLoadingRecords.get(),
    prices: () => Data.isLoadingPrices.get()
}

export const refresh_actions = {
    investments: () => {
        Data.loadTokenPrices().then(Data.loadUserData);
    },
    ranking: () => {
        Data.loadTokenPrices().then(Data.loadRanking);
    },
    records: () => {
        Data.loadUserData().then(Data.loadTxHistory);
    },
    prices: () => {
        Data.loadTokenPrices();
    }
}

export const investor_actions = {
    deposit_button: async function (amt, tokenSymbol, pending, confirm, handledataSuccess, handledataError) {
        var amount, tokenAddr, tokenSymbol;
        try {
            amount = BigNumber(amt);
            if (!amount.gt(0)) {
                handledataError('Amount must be greater than zero.');
                return;
            }
            tokenAddr = betoken.tokenSymbolToAddress(tokenSymbol);
            handledataSuccess(betoken.depositToken(tokenAddr, amount, pending, confirm));
            return;
        } catch (error1) {
            handledataError(error1);
            return;
        }
    },
    withdraw_button: async function (amt, tokenSymbol, pending, confirm, handledataSuccess, handledataError) {
        var amount, error, tokenAddr, tokenSymbol;
        try {
            amount = BigNumber(amt);
            if (!amount.greaterThan(0)) {
                handledataError('Amount must be greater than zero.');
                return;
            }
            tokenAddr = betoken.tokenSymbolToAddress(tokenSymbol);
            handledataSuccess(betoken.withdrawToken(tokenAddr, amount, pending, confirm));
            return;
        } catch (error1) {
            handledataError(error1);
            return;
        }
    }
}

export const manager_actions = {
    sell_investment: async function (id, pending, confirm) {
        try {
            if (Data.cyclePhase.get() === 1) {
                return betoken.sellAsset(id, pending, confirm);
            }
        } catch(error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },
    new_investment: async function (tokenSymbol, amt, pending, confirm) {
        var address, error, kairoAmountInWeis, tokenSymbol;

        try {
            address = (await betoken.tokenSymbolToAddress(tokenSymbol));
            kairoAmountInWeis = BigNumber(amt).times("1e18"); 
            betoken.createInvestment(address, kairoAmountInWeis, pending, confirm);
            return;
        } catch (error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },
    redeem_commission: async function (pending, confirm) {
        try {
            return betoken.redeemCommission(pending, confirm);
        } catch(error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    },

    redeem_commission_in_shares: async function (pending, confirm) {
        try {
            return betoken.redeemCommissionInShares(pending, confirm);
        } catch (error) {
            error_notifications.set_error_msg(SEND_TX_ERR);
        }
    }
}   



