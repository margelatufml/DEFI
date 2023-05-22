const { getWeth, amount } = require("../scripts/getWETH")
const { getNamedAccounts } = require("hardhat")

async function main() {
    //the prtocol threats everything like an ERC20 token
    await getWeth()
    const { deployer } = await getNamedAccounts()
    //abi , contract
    //0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    //Lending pool:^
    const LendingPool = await getLendingPool(deployer)
    console.log(`Lending pool address ${LendingPool.address}`)
    //deposit
    //aprove to ket the web token address
    const wethtokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    //aprove
    await aproveErc20(wethtokenAddress, LendingPool.address, amount, deployer)
    console.log("Depositing...")

    await LendingPool.deposit(wethtokenAddress, amount, deployer, 0)
    console.log("Deposited")

    let { availableBorrowsETH, totalDebtETH } = await getBorrowLendingData(
        LendingPool,
        deployer
    )
    const DAIPrice = await getDAIprice()

    const avabileBorrowsDAI =
        availableBorrowsETH.toString() * 0.95 * (1 / DAIPrice.toNumber())

    console.log(`You can borrow ${avabileBorrowsDAI} DAI`)

    const amountDAItoBorrowWEI = ethers.utils.parseEther(
        avabileBorrowsDAI.toString()
    )

    const DAITokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"

    await BorrowDAI(
        DAITokenAddress,
        LendingPool,
        amountDAItoBorrowWEI,
        deployer
    )
    await getBorrowLendingData(LendingPool, deployer)

    await repay(amountDAItoBorrowWEI, DAITokenAddress, LendingPool, deployer)
    await getBorrowLendingData(LendingPool, deployer)
}

async function repay(amount, DAIAddress, LendingPool, account) {
    await aproveErc20(DAIAddress, LendingPool.address, amount, account)
    const repayTx = await LendingPool.repay(DAIAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repaied!")
}

async function BorrowDAI(
    DAIAddress,
    leandingPool,
    amountDAIToBorrowWEI,
    account
) {
    const BorrowTx = await leandingPool.borrow(
        DAIAddress,
        amountDAIToBorrowWEI,
        1,
        0,
        account
    )
    await BorrowTx.wait(1)
    console.log(`You borrowed!`)
}
async function getDAIprice() {
    const DAIprice = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    )
    const price = (await DAIprice.latestRoundData())[1]
    console.log(`The DAI price is ${price}`)
    return price
}

async function getBorrowLendingData(lendingpool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingpool.getUserAccountData(account)
    console.log(
        `You have total collateral ETH deposited ${totalCollateralETH} `
    )
    console.log(`You have total Debt ${totalDebtETH} in ETH`)
    console.log(`You can borrow ${availableBorrowsETH} ETH`)
    return { availableBorrowsETH, totalDebtETH }
}
async function aproveErc20(
    contractaddress,
    spenderaddress,
    accountToSpend,
    account
) {
    const Erc20token = await ethers.getContractAt(
        "IERC20",
        contractaddress,
        account
    )
    const tx = await Erc20token.approve(spenderaddress, accountToSpend)
    await tx.wait(1)
    console.log("Approve")
}

async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    )
    const lendingPoolAddress =
        await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt(
        "ILendingPool",
        lendingPoolAddress,
        account
    )
    return lendingPool
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
