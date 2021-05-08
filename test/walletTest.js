const DEX = artifacts.require("DEX");
const Link = artifacts.require("Link");
const truffleAssert = require("truffle-assertions");

contract("DEX", accounts => {
    it("should only be possible for owner to add tokens", async () => {
        let dex = await DEX.deployed()
        let link = await Link.deployed()
        await truffleAssert.passes(
            dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
        )
        await truffleAssert.reverts(
            dex.addToken(web3.utils.fromUtf8("AAVE"), link.address, {from: accounts[1]})
        )
    });
    it("should handled deposits correctly", async () => {
        let dex = await DEX.deployed()
        let link = await Link.deployed()
        await link.approve(dex.address, 500);
        await dex.deposit(100, web3.utils.fromUtf8("LINK"));
        let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
        assert.equal(balance.toNumber(), 100);
    })
    it("should handled faulty withdrawals correctly", async () => {
        let dex = await DEX.deployed();
        let link = await Link.deployed();
        await truffleAssert.reverts( dex.withdraw(5000, web3.utils.fromUtf8("LINK")) );
    })
    it("should handled correct withdrawals correctly", async () => {
        let dex = await DEX.deployed();
        let link = await Link.deployed();
        await truffleAssert.passes( dex.withdraw(100, web3.utils.fromUtf8("LINK")) );
    })
})