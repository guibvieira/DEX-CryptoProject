const Dex = artifacts.require("DEX");
const Link = artifacts.require("Link");
const truffleAssert = require("truffle-assertions");

contract("DEX", accounts => {

    it("Should throw an error when creating a sell market order without adequate token balance", async () => {
        let dex = await Dex.deployed();

        let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
        assert.equal(balance.toNumber(), 0, "Initial Link balance is not 0");
        await truffleAssert.reverts(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
        )
    })

    it("Should throw an error when creating a buy market order without adequate ETH balance", async () => {
        let dex = await Dex.deployed();

        let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
        assert.equal(balance.toNumber(), 0, "Initial Link balance is not 0");
        
        await truffleAssert.reverts(
            dex.createLimitOrder(0, web3.utils.fromUtf8("LINK"), 10, 10)
        )
    })

    it("Market order should be placed even with an empty order book", async () => {
        let dex = await Dex.deployed();

        dex.depositEth({value: 10000});

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0);
        assert(orderbook.length == 0, "Orderbook isn't empty");

        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10)
        )
    })

    it("Market orders should not fill more than the market order amount", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
        assert(orderbook.length == 0, "Orderbook isn't empty");

        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address);
        await dex.depositEth({value: 10000, from: accounts[0]});

        //Send Link token to accounts 1,2,3 from account0
        await link.transfer(accounts[1], 150);
        await link.transfer(accounts[2], 150);
        await link.transfer(accounts[3], 150);

        //Approve DEX for accounts 1,2,3
        await link.approve(dex.address, 500, {from: accounts[1]});
        await link.approve(dex.address, 500, {from: accounts[2]});
        await link.approve(dex.address, 500, {from: accounts[3]});

        //Deposit link into DEX for accounts 1,2,3
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[1]});
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[2]});
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[3]});

        //Fill up the sell order book
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]});
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 200, {from: accounts[2]});
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 100, {from: accounts[3]});

        //Create market order that should fill 2/3 of the order book
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10);

        let orderbookAfter = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
        assert(orderbookAfter.length == 1, "Sell side orderbook should have 1 order left");
        assert(orderbookAfter[0].filled == 0, "Sell side order should have 0 filled");
    });

    it("Market orders should be filled until the order book is empty", async () => {
        let dex = await Dex.deployed()

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 1, "Sell side Orderbook should have 1 order left");

        //Fill up the sell order book again
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 400, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 500, {from: accounts[2]})

        //check buyer link balance before link purchase
        let balanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))

        //Create market order that could fill more than the entire order book (15 link)
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 50);

        //check buyer link balance after link purchase
        let balanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))

        //Buyer should have 15 more link after, even though order was for 50. 
        assert.equal(balanceBefore.toNumber() + 15, balanceAfter.toNumber());
    })

    it("The eth balance of the buyer should decrease with the filled amount", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();

        //Seller deposits link and creates sell order or 1 link for 300 wei
        await link.approve(dex.address, 500, {from: accounts[1]});
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, {from: accounts[1]});

        //Check buyer before and after eth balance
        let balanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 1);
        let balanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));

        assert.equal(balanceBefore.toNumber() - 300, balanceAfter.toNumber());
    })

    //The token balances of the limit order sellers should decrease with the filled amounts.
    it("The token balances of the limit order sellers should decrease with the filled amounts.", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");

        //Seller Account[2] deposits link
        await link.approve(dex.address, 500, {from: accounts[2]});
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[2]});

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 400, {from: accounts[2]})

        //Check sellers Link balances before trade
        let account1balanceBefore = await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"));
        let account2balanceBefore = await dex.balances(accounts[2], web3.utils.fromUtf8("LINK"));

        //Account[0] created market order to buy up both sell orders
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 2);

        //Check sellers Link balances after trade
        let account1balanceAfter = await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"));
        let account2balanceAfter = await dex.balances(accounts[2], web3.utils.fromUtf8("LINK"));

        assert.equal(account1balanceBefore.toNumber() - 1, account1balanceAfter.toNumber());
        assert.equal(account2balanceBefore.toNumber() - 1, account2balanceAfter.toNumber());
    })

    //Filled limit orders should be removed from the orderbook
    it("Filled limit orders should be removed from the orderbook", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        //Seller deposits link and creates a sell limit order for 1 link for 300 wei
        await link.approve(dex.address, 500);
        await dex.deposit(50, web3.utils.fromUtf8("LINK"));
        
        await dex.depositEth({value: 10000});

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300)
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 1);

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty after trade");
    })

    //Partly filled limit orders should be modified to represent the filled/remaining amount
    it("Limit orders filled property should be set correctly after a trade", async () => {
        let dex = await Dex.deployed()

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 2);

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert.equal(orderbook[0].filled, 2);
        assert.equal(orderbook[0].amount, 5);
    })
    //When creating a BUY market order, the buyer needs to have enough ETH for the trade
    it("Should throw an error when creating a buy market order without adequate ETH balance", async () => {
        let dex = await Dex.deployed()
        
        let balance = await dex.balances(accounts[4], web3.utils.fromUtf8("ETH"))
        assert.equal( balance.toNumber(), 0, "Initial ETH balance is not 0" );
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})

        await truffleAssert.reverts(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 5, {from: accounts[4]})
        )
    })
})