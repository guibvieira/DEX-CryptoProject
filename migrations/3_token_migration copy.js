const Link = artifacts.require("Link");
const DEX = artifacts.require("DEX");


module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(Link);
  // let link = await Link.deployed();
  // let dex = await DEX.deployed();
  // await link.approve(dex.address, 500);
  // dex.addToken(web3.utils.fromUtf8("LINK"), link.address);
  // await dex.deposit(100, web3.utils.fromUtf8("LINK"));
  // let balanceOfLink =  await dex.traderBalances(accounts[0], web3.utils.fromUtf8("LINK"));
  // console.log('balance of Link', balanceOfLink);
};
