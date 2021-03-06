// imports
const Web3 = require('web3');

// constants
export const BETOKEN_ADDR = "0x5910d5abd4d5fd58b39957664cd9735cbfe42bf0";
export const ETH_TOKEN_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
export const NET_ID = 4; // Rinkeby

// helpers
export var ERC20 = function(_tokenAddr) {
    // add new token contract
    var erc20ABI = require("./abi/ERC20.json");
    return new web3.eth.Contract(erc20ABI, _tokenAddr);
};

// Betoken abstraction
/**
* Constructs an abstraction of Betoken contracts
*/
export var Betoken = function() {
    // Instance vars
    var self;
    self = this;
    self.contracts = {
        BetokenFund: null,
        Kairo: null,
        Shares: null,
        TokenFactory: null,
        Kyber: null
    };
    self.hasWeb3 = false;
    
    /*
    Object Initialization
    */
    self.init = async () => {
        // initialize web3
        window.web3 = new Web3(new Web3.providers.HttpProvider("https://rinkeby.infura.io/v3/3057a4979e92452bae6afaabed67a724"));
        
        // Initialize BetokenFund contract
        var betokenFundABI = require("./abi/BetokenFund.json");
        var BetokenFund = new web3.eth.Contract(betokenFundABI, BETOKEN_ADDR);
        self.contracts.BetokenFund = BetokenFund;

        var minimeABI = require("./abi/MiniMeToken.json");
        
        await Promise.all([
            BetokenFund.methods.controlTokenAddr().call().then(function(_addr) {
                // Initialize Kairo contract
                self.contracts.Kairo = new web3.eth.Contract(minimeABI, _addr);
            }),
            BetokenFund.methods.shareTokenAddr().call().then(function(_addr) {
                // Initialize Shares contract
                self.contracts.Shares = new web3.eth.Contract(minimeABI, _addr);
            }),
            BetokenFund.methods.tokenFactoryAddr().call().then(function(_addr) {
                // Initialize TestTokenFactory contract
                var factoryABI = require("./abi/TestTokenFactory.json");
                self.contracts.TokenFactory = new web3.eth.Contract(factoryABI, _addr);
            }),
            BetokenFund.methods.kyberAddr().call().then(function(_addr) {
                // Initialize TestKyberNetwork contract
                var knABI = require("./abi/TestKyberNetwork.json");
                self.contracts.Kyber = new web3.eth.Contract(knABI, _addr);
            })
        ]);
        
        window.betoken = self;
    };
    
    
    /*
    Getters
    */
    
    /**
    * Gets a primitive variable in BetokenFund
    * @param  {String} _varName the name of the primitive variable
    * @return {Promise}          .then((_value)->)
    */
    self.getPrimitiveVar = function(_varName) {
        return self.contracts.BetokenFund.methods[_varName]().call();
    };
    
    /**
    * Calls a mapping or an array in BetokenFund
    * @param  {String} _name name of the mapping/array
    * @param  {Any} _input       the input
    * @return {Promise}              .then((_value)->)
    */
    self.getMappingOrArrayItem = function(_name, _input) {
        return self.contracts.BetokenFund.methods[_name](_input).call();
    };
    
    /**
    * Calls a double mapping in BetokenFund
    * @param  {String} _mappingName name of the mapping
    * @param  {Any} _input1      the first input
    * @param  {Any} _input2      the second input
    * @return {Promise}              .then((_value)->)
    */
    self.getDoubleMapping = function(_mappingName, _input1, _input2) {
        return self.contracts.BetokenFund.methods[_mappingName](_input1, _input2).call();
    };
    
    self.getTokenSymbol = function(_tokenAddr) {
        _tokenAddr = web3.utils.toHex(_tokenAddr);
        if (_tokenAddr === ETH_TOKEN_ADDRESS) {
            return Promise.resolve().then(function() {
                return "ETH";
            });
        }
        return ERC20(_tokenAddr).methods.symbol().call();
    };
    
    self.getTokenDecimals = function(_tokenAddr) {
        _tokenAddr = web3.utils.toHex(_tokenAddr);
        if (_tokenAddr === ETH_TOKEN_ADDRESS) {
            return Promise.resolve().then(function() {
                return 18;
            });
        }
        return ERC20(_tokenAddr).methods.decimals().call();
    };
    
    // Uses TestTokenFactory to obtain a token's address from its symbol
    self.tokenSymbolToAddress = function(_symbol) {
        var symbolHash = web3.utils.soliditySha3(_symbol);
        return self.contracts.TokenFactory.methods.createdTokens(symbolHash).call();
    };
    
    self.getTokenPrice = async function(_symbol) {
        var addr = await self.tokenSymbolToAddress(_symbol);
        return self.contracts.Kyber.methods.priceInDAI(addr).call();
    };
    
    self.getTokenBalance = function(_tokenAddr, _addr) {
        return ERC20(_tokenAddr).methods.balanceOf(_addr).call();
    };
    
    /**
    * Gets the Kairo balance of an address
    * @param  {String} _address the address whose balance we're getting
    * @return {Promise}          .then((_value)->)
    */
    self.getKairoBalance = function(_address) {
        return self.contracts.Kairo.methods.balanceOf(_address).call();
    };
    
    self.getKairoTotalSupply = function() {
        return self.contracts.Kairo.methods.totalSupply().call();
    };
    
    /**
    * Gets the Share balance of an address
    * @param  {String} _address the address whose balance we're getting
    * @return {Promise}          .then((_value)->)
    */
    self.getShareBalance = function(_address) {
        return self.contracts.Shares.methods.balanceOf(_address).call();
    };
    
    self.getShareTotalSupply = function() {
        return self.contracts.Shares.methods.totalSupply().call();
    };
    
    /**
    * Gets the array of investments
    * @return {Promise} .then((investments) ->)
    */
    self.getInvestments = function(_userAddress) {
        var array = [];
        return self.getMappingOrArrayItem("investmentsCount", _userAddress).then((_count) => {
            var getAllItems, getItem, id;
            var count = +_count;
            if (count === 0) {
                return [];
            }
            array = new Array(count);
            getItem = (id) => {
                return self.getDoubleMapping("userInvestments", _userAddress, id).then((_item) => {
                    return new Promise((fullfill, reject) => {
                        if (typeof _item !== null) {
                            array[id] = _item;
                            fullfill();
                        } else {
                            reject();
                        }
                    });
                });
            };
            getAllItems = () => {
                var results = [];
                for (var i = 0; i < count; i++) {
                    results.push(getItem(i));
                }
                return results;
            };
            return Promise.all(getAllItems());
        }).then(function() {
            return array;
        });
    };
    return self;
};