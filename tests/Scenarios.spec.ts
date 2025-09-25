import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, Address, DictionaryValue, Dictionary, beginCell } from '@ton/core';
import { BookMinter } from '../wrappers/BookMinter';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { OrderBook, orderDictionaryValue, porderQueuesDictionaryValue, porderQueuesType } from '../wrappers/OrderBook';
import { JettonMaster } from '@ton/ton';
import { jettonData, JettonMinter } from '../wrappers/JettonMinter';
import { buildjettonMinterContentCell } from '../helpers/metadata';
import { JettonFactory } from '../wrappers/JettonFactory';
import { KeyPair, mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
import { JettonWallet, WalletData } from '../wrappers/JettonWallet';import { USDTJettonMinter } from '../wrappers/USDTJettonMinter';
import { USDTJettonWallet } from '../wrappers/USDTJettonWallet';
;

const TIMEOUT: number = 4200000;
const ORDER_QUEUES_KEY_LEN: number = 16;
const ORDER_BOOK_ADMIN_MNEMONIC = process.env.ORDER_BOOK_ADMIN_MNEMONIC as string;
// const USDT_MINTER_CODE = process.env.USDT_MINTER_CODE as string;

function getStdAddress(address: Address) {
    return (
        beginCell()
            .storeAddress(address)
        .endCell().beginParse().skip(11).loadUintBig(256))
}
describe('BookMinter', () => {
    let bookMinterCode: Cell;
    let orderBookCode: Cell
    let jettonFactoryCode: Cell
    let indexWalletCode: Cell
    let usdtWalletCode: Cell
    let indexMinterCode: Cell
    let usdtMinterCode: Cell

    let JFMnem: string[]
    let JFKeyPair: KeyPair

    let OBAMnem: string[]
    let OBAkeyPair: KeyPair

    beforeAll(async () => {
        JFMnem = await mnemonicNew();
        JFKeyPair = await mnemonicToPrivateKey(JFMnem); 
        console.log("JettonFactory Mnemonic: ", JFMnem)

        bookMinterCode = await compile('BookMinter');
        orderBookCode = await compile('OrderBook');
        jettonFactoryCode = await compile('JettonFactory');
        indexWalletCode = await compile('JettonWallet');
        usdtWalletCode = await compile('USDTJettonWallet');
        indexMinterCode = await compile('JettonMinter');
        usdtMinterCode = await compile('USDTJettonMinter');
    }, TIMEOUT);

    let blockchain: Blockchain;
    let ACTdeployer: SandboxContract<TreasuryContract>;
    let ACTALice: SandboxContract<TreasuryContract>;
    let ACTBob: SandboxContract<TreasuryContract>;
    let ACTEve: SandboxContract<TreasuryContract>;
    let ACTAdmin: SandboxContract<TreasuryContract>;

    let SCbookMinter: SandboxContract<BookMinter>;
    let SCorderBook: SandboxContract<OrderBook>;

    let SCjettonFactory: SandboxContract<JettonFactory>;
    let SCindexMinter: SandboxContract<JettonMinter>;
    let SCusdtMinter: SandboxContract<USDTJettonMinter>;

    let SCindexAliceWallet: SandboxContract<JettonWallet>;
    let SCusdtBobWallet: SandboxContract<USDTJettonWallet>;

    let SCindexBobWallet: SandboxContract<JettonWallet>;
    let SCusdtAliceWallet: SandboxContract<USDTJettonWallet>;

    let SCindexEveWallet: SandboxContract<JettonWallet>;
    let SCusdtEveWallet: SandboxContract<USDTJettonWallet>;

    let SCindexOrderBookWallet: SandboxContract<JettonWallet>;
    let SCusdtOrderBookWallet: SandboxContract<USDTJettonWallet>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        ACTdeployer = await blockchain.treasury('deployer');
        ACTAdmin = await blockchain.treasury('Minters And Factory Owner');
        ACTAdmin = await blockchain.treasury('orderBookOwner')

        OBAMnem = ORDER_BOOK_ADMIN_MNEMONIC.split(" ")
        OBAkeyPair = await mnemonicToPrivateKey(OBAMnem);

        // JETTON FACTORY ----------------------------------------------------------------------------------------------
        SCjettonFactory  = blockchain.openContract(JettonFactory.createFromConfig({
            AdminPublicKey: JFKeyPair.publicKey,
            Seqno: 0n,
            AdminAddress: ACTAdmin.address,
            MinterCode: indexMinterCode,
        }, jettonFactoryCode))
        
        // INDEX JETTON MINTER ----------------------------------------------------------------------------------------------
        SCindexMinter = blockchain.openContract(JettonMinter.createFromConfig({
            totalSupply: 0n,                                            
            managerAddress: ACTAdmin.address,
            MinterContnet: buildjettonMinterContentCell({                              
                image: "https://i.ibb.co/gr4gGrs/image.png",
                decimals: "9",
                name: "TEST INDEX Channel",
                symbol: "TTINDEX",
                description: "Test INDEX Channel Jetton description"
            }),
            adminAddress: ACTAdmin.address,          
            transferAdminAddress: ACTAdmin.address,
            jettonWalletCode: await compile('JettonWallet'),
            FactoryAddress: SCjettonFactory.address
        }, indexMinterCode))
        
        // USDT JETTON MINTER ----------------------------------------------------------------------------------------------
        SCusdtMinter = blockchain.openContract(USDTJettonMinter.createFromConfig({
            totalSupply: 0n,                                            
            adminAddress: ACTAdmin.address,          
            nextAdminAddress: ACTAdmin.address,
            jettonWalletCode: await compile('USDTJettonWallet'),
            metadataURI: 
                beginCell()
                    .storeUint(0, 8)
                    .storeStringTail("https://raw.githubusercontent.com/taiga-labs/public-gists/refs/heads/main/index_test_usdt_uri.json")
                .endCell()
        }, usdtMinterCode))

        // BOOK MINTER ----------------------------------------------------------------------------------------------
        SCbookMinter = blockchain.openContract(BookMinter.createFromConfig({
            adminAddress: ACTAdmin.address,
            usdtMasterAddres: SCusdtMinter.address,
            orderBooksAdminAddress: ACTAdmin.address,
            orderBookCode: orderBookCode,
            usdtWalletCode: usdtWalletCode,
            indexChannelWalletCode: indexWalletCode,
        }, bookMinterCode));

        // ORDER BOOK AND HIS OWNER ----------------------------------------------------------------------------------------------
        SCorderBook = blockchain.openContract(OrderBook.createFromConfig({
            ffreeze: 0,
            owner_address: ACTAdmin.address,
            admin_address: ACTAdmin.address,
            book_minter_address: SCbookMinter.address,
        }, orderBookCode));

        // ALICE AND HER INDEX and USDT WALLET ----------------------------------------------------------------------------------------------
        ACTALice = await blockchain.treasury('ALice')
        SCindexAliceWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTALice.address,
            minter: SCindexMinter.address,
            walletCode: indexWalletCode
        }, indexWalletCode));

        SCusdtAliceWallet = blockchain.openContract(USDTJettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTALice.address,
            minter: SCusdtMinter.address,
        }, usdtWalletCode));

        // EVE AND HER INDEX and USDT WALLET ----------------------------------------------------------------------------------------------
        ACTEve = await blockchain.treasury('Eve')
        SCindexEveWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTEve.address,
            minter: SCindexMinter.address,
            walletCode: indexWalletCode
        }, indexWalletCode));

        SCusdtEveWallet = blockchain.openContract(USDTJettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTEve.address,
            minter: SCusdtMinter.address,
        }, usdtWalletCode));


        // BOB AND HIS USDT and INDEX WALLET ----------------------------------------------------------------------------------------------
        ACTBob = await blockchain.treasury('Bob')
        SCusdtBobWallet = blockchain.openContract(USDTJettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTBob.address,
            minter: SCusdtMinter.address,
        }, usdtWalletCode));

        SCindexBobWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTBob.address,
            minter: SCindexMinter.address,
            walletCode: indexWalletCode
        }, indexWalletCode));

        // ORDER BOOK INDEX AND USDT WALLETS ----------------------------------------------------------------------------------------------

        SCindexOrderBookWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: SCorderBook.address,
            minter: SCindexMinter.address,
            walletCode: indexWalletCode
        }, indexWalletCode));

        SCusdtOrderBookWallet = blockchain.openContract(USDTJettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: SCorderBook.address,
            minter: SCusdtMinter.address,
        }, usdtWalletCode));
    
        await SCindexMinter.sendDeploy(ACTdeployer.getSender(), toNano('0.05'))
        await SCusdtMinter.sendDeploy(ACTdeployer.getSender(), toNano('0.05'))
        
    }, TIMEOUT);

    it('should work fine!', async () => {
        console.log("Order Book Address: ", SCorderBook.address)

        // Actiave Test Order Book ----------------------------------------------------------------------------------------------
        const orderOrderBookResult = await SCorderBook.sendDeploy(ACTAdmin.getSender(), toNano('0.5'))
        expect(orderOrderBookResult.transactions).toHaveTransaction({
            from: ACTAdmin.address,
            to: SCorderBook.address,
            success: true,
        });

        // Init Order Book ----------------------------------------------------------------------------------------------
        const deployResult = await SCbookMinter.sendDeployOrderBook(ACTAdmin.getSender(), {
            value: toNano("0.05"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            indexJettonMasterAddress: SCindexMinter.address,
            adminPbk: OBAkeyPair.publicKey,
            indexWallerAddressOB: await SCindexMinter.getWalletAddress(SCorderBook.address),
            usdtWalletAddressOB: await SCusdtMinter.getWalletAddress(SCorderBook.address),
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: ACTAdmin.address,
            to: SCbookMinter.address,
            op: 0xf4874876, // op::bm::deploy_order_book
            success: true,
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: SCbookMinter.address,
            to: SCorderBook.address,
            op: 0x9486490, // op::minter_book_init
            success: true,
        });

        const TSP_DIVIDER: bigint = 10000n;

        // Set Trading Session Price! ----------------------------------------------------------------------------------------------
        const TSPSettingResult = await SCorderBook.sendNewSession(ACTAdmin.getSender(), {
            value: toNano('0.01'),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            newTradingSessionPriceMin: 10n * TSP_DIVIDER, 
            newTradingSessionPriceMax: 20n * TSP_DIVIDER, 
        })

        expect(TSPSettingResult.transactions).toHaveTransaction({
            from: ACTAdmin.address,
            to: SCorderBook.address,
            op: 0xbb35443b, // op::ob::recv_new_session
            success: true,
        });


        const AmountToMint: bigint = 100_000n * 10n**6n;

        // MINT 100_000 USDT TO BOB ----------------------------------------------------------------------------------------------
        await SCusdtMinter.sendMint(ACTAdmin.getSender(), {
            value: toNano('5'),
            queryId: BigInt(Math.floor(Date.now() / 1000)),
            toAddress: ACTBob.address,
            tonAmount: toNano('2'),
            jettonAmountToMint: AmountToMint,
            fromAddress: SCusdtMinter.address
        })

        const usdtJettonData: jettonData = await SCusdtMinter.getJettonData();
        expect(usdtJettonData.totalSupply).toEqual(AmountToMint)

        // MINT 100_000 INDEX TO ALICE ----------------------------------------------------------------------------------------------
        await SCindexMinter.sendMint(ACTAdmin.getSender(), {
            value: toNano('0.08'),
            queryId: BigInt(Math.floor(Date.now() / 1000)),
            toAddress: ACTALice.address,
            tonAmount: toNano('0.05'),
            jettonAmountToMint: AmountToMint,
            fromAddress: SCindexMinter.address
        })
        const indexJettonData2: jettonData = await SCindexMinter.getJettonData();
        expect(indexJettonData2.totalSupply).toEqual(AmountToMint)

        // MINT 100_000 INDEX TO EVE ----------------------------------------------------------------------------------------------
        await SCindexMinter.sendMint(ACTAdmin.getSender(), {
            value: toNano('0.08'),
            queryId: BigInt(Math.floor(Date.now() / 1000)),
            toAddress: ACTEve.address,
            tonAmount: toNano('0.05'),
            jettonAmountToMint: AmountToMint,
            fromAddress: SCindexMinter.address
        })
        const indexJettonData3: jettonData = await SCindexMinter.getJettonData();
        expect(indexJettonData3.totalSupply).toEqual(AmountToMint * 2n)

        console.log("EVE INDEX BALANCE AFTER MINT:", await SCindexEveWallet.getJettonBalance())

        // BOB MAKES ASK! 50 USDT ----------------------------------------------------------------------------------------------
        const BOBS_PRIORITY: number = 1;
        const BOBS_USDT_AMOUNT_FOR_ASK: bigint = 50n * 10n**6n;

        const makeAskResult = await SCusdtBobWallet.sendTransfer(ACTBob.getSender(), {
            value: toNano("0.20"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            jettonAmount: BOBS_USDT_AMOUNT_FOR_ASK,
            recipientAddress: SCorderBook.address,
            forwardTONAmount: toNano("0.15"),
            forwardPayload: (
                beginCell()
                    .storeUint(await SCorderBook.getSeqno(), 32)
                    .storeUint(0x845746, 32)
                    .storeUint(BOBS_PRIORITY, 16) 
                    .storeUint(10n * TSP_DIVIDER, 32)
                .endCell()
            ),
            secretKey: OBAkeyPair.secretKey,

        })

        // От Боба её USDT jetton wallet
        expect(makeAskResult.transactions).toHaveTransaction({
            from: ACTBob.address,
            to: SCusdtBobWallet.address,
            op: 0xf8a7ea5, // op::transfer
            success: true,
        });

        // От INDEX JETTON WALLET Боба USDT JETTON WALLET СК OrderBook
        expect(makeAskResult.transactions).toHaveTransaction({
            from: SCusdtBobWallet.address,
            to: SCusdtOrderBookWallet.address,
            op: 0x178d4519, // op::internal_transfer 
            success: true,
        });

        // От USDT JETTON WALLET СК OrderBook СК OrderBook'у
        expect(makeAskResult.transactions).toHaveTransaction({
            from: SCusdtOrderBookWallet.address,
            to: SCorderBook.address,
            op: 0x7362d09c, // op::transfer_notification
            success: true,
        });

        // Check BOB's ASK Amount ----------------------------------------------------------------------------------------------
        const porderQueues1 = await SCorderBook.getPorderQueues()
        let porderQueuesDict1 = Dictionary.loadDirect(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), porderQueuesDictionaryValue, porderQueues1);
        const orders1: porderQueuesType = porderQueuesDict1.get(BigInt(BOBS_PRIORITY)) as porderQueuesType

        let counter1: [number, number] = await SCorderBook.getCounters()

        console.log("BOB's ASK amount:", orders1.asks.get(BigInt(counter1[0]))?.amount.toString())

        // Умножем BOBS_USDT_AMOUNT_FOR_ASK на 10**3, так как USDT в контракте хранятся с decimals 9 для унификации. Только перед отправкой сумма делится на 1000
        expect(orders1.asks.get(BigInt(counter1[0]))?.amount.toString()).toEqual((BOBS_USDT_AMOUNT_FOR_ASK * 10n**3n).toString())

        console.log("-----------[ 2 ]-----------")
        console.log("ALICE USDT BALANCE:",  await SCusdtAliceWallet.getJettonBalance())
        console.log("BOB INDEX BALANCE:", await SCindexBobWallet.getJettonBalance())
        console.log("BOB USDT BALANCE:", await SCusdtBobWallet.getJettonBalance())
        console.log("EVE USDT BALANCE:",  await SCusdtEveWallet.getJettonBalance())

        console.log("ASKS:", orders1.asks.keys(), orders1.asks.values())
        console.log("BIDS:", orders1.bids.keys(), orders1.bids.values())

        // ALICE MAKES BID! 1 INDEX ----------------------------------------------------------------------------------------------
        const ALICES_PRIORITY: number = 1;
        const ALICES_INDEX_AMOUNT_FOR_BID: bigint = 1n * 10n**9n;

        const makeBidResult = await SCindexAliceWallet.sendTransfer(ACTALice.getSender(), {
            value: toNano("0.20"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            jettonAmount: ALICES_INDEX_AMOUNT_FOR_BID,
            recipientAddress: SCorderBook.address,
            forwardTONAmount: toNano("0.15"),
            forwardPayload: (
                beginCell()
                    .storeUint(await SCorderBook.getSeqno(), 32)
                    .storeUint(0xbf4385, 32)
                    .storeUint(ALICES_PRIORITY, 16) 
                    .storeUint(10n * TSP_DIVIDER, 32)
                .endCell()
            ),
            secretKey: OBAkeyPair.secretKey,
        })

        // От Алисы её INDEX jetton wallet
        expect(makeBidResult.transactions).toHaveTransaction({
            from: ACTALice.address,
            to: SCindexAliceWallet.address,
            op: 0xf8a7ea5, // op::transfer
            success: true,
        });

        // От INDEX JETTON WALLET Алисы INDEX JETTON WALLET СК OrderBook
        expect(makeBidResult.transactions).toHaveTransaction({
            from: SCindexAliceWallet.address,
            to: SCindexOrderBookWallet.address,
            op: 0x178d4519, // op::internal_transfer 
            success: true,
        });

        // От INDEX JETTON WALLET СК OrderBook СК OrderBook'у
        expect(makeBidResult.transactions).toHaveTransaction({
            from: SCindexOrderBookWallet.address,
            to: SCorderBook.address,
            op: 0x7362d09c, // op::transfer_notification
            success: true,
        });

        console.log("SCindexOrderBookWallet:", SCindexOrderBookWallet.address.toString())
        console.log("SCusdtOrderBookWallet:", SCusdtOrderBookWallet.address.toString())

        console.log("SCindexBobWallet:", SCindexBobWallet.address.toString())
        console.log("SCusdtAliceWallet:", SCusdtAliceWallet.address.toString())

        console.log("BOB's STD ADDRESS:", getStdAddress(ACTBob.address))
        console.log("ALICES's STD ADDRESS:", getStdAddress(ACTALice.address))
        
        // ПРОВЕРКА ИСПОЛНЕНИЯ ОРДЕРА ----------------------------------------------------------------------------------------------

        // От OrderBook USDT JETTON WALLET СК OrderBook'а (перевод ALICE'е 10 USDT)
        expect(makeBidResult.transactions).toHaveTransaction({
            from: SCorderBook.address,
            to: SCusdtOrderBookWallet.address,
            op: 0xf8a7ea5, // op::transfer
            success: true,
        });

        // От OrderBook USDT JETTON WALLET СК ALICE'e (перевод ALICE'е 10 USDT)
        expect(makeBidResult.transactions).toHaveTransaction({
            from: SCusdtOrderBookWallet.address,
            to: SCusdtAliceWallet.address,
            op: 0x178d4519, // op::internal_transfer 
            success: true,
        });

        // От OrderBook INDEX JETTON WALLET СК OrderBook'а (перевод BOB'у 1 INDEX)
        expect(makeBidResult.transactions).toHaveTransaction({
            from: SCorderBook.address,
            to: SCindexOrderBookWallet.address,
            op: 0xf8a7ea5, // op::transfer
            success: true,
        });

        // INDEX JETTON WALLET СК OrderBook'а INDEX JETTON WALLET СК BOB'а (перевод BOB'у 1 INDEX)
        expect(makeBidResult.transactions).toHaveTransaction({
            from: SCindexOrderBookWallet.address,
            to: SCindexBobWallet.address,
            op: 0x178d4519, // op::internal_transfer 
            success: true,
        });

        // ПРОВЕРКА БАЛАНСОВ ALICE и BOB после исполнения ордера ----------------------------------------------------------------------------------------------
        const bobsIndexBalance = await SCindexBobWallet.getJettonBalance()
        const alicesUsdtBalance = await SCusdtAliceWallet.getJettonBalance()
        
        expect((bobsIndexBalance).toString()).toEqual((1n*10n**9n).toString())
        expect((alicesUsdtBalance).toString()).toEqual((10n*10n**6n).toString())

        // Check BOB's ASK Amount after order execution ----------------------------------------------------------------------------------------------
        const porderQueues3 = await SCorderBook.getPorderQueues()
        let porderQueuesDict3 = Dictionary.loadDirect(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), porderQueuesDictionaryValue, porderQueues3);
        const orders3: porderQueuesType = porderQueuesDict3.get(BigInt(BOBS_PRIORITY)) as porderQueuesType

        let newBobsOrderExpectedAmount: bigint = BOBS_USDT_AMOUNT_FOR_ASK - 10n * 10n**6n
        
        counter1 = await SCorderBook.getCounters()

        // Умножем BOBS_USDT_AMOUNT_FOR_ASK на 10**3, так как USDT в контракте хранятся с decimals 9 для унификации. Только перед отправкой сумма делится на 1000
        expect(orders3.asks.get(BigInt(counter1[0]))?.amount.toString()).toEqual((newBobsOrderExpectedAmount * 10n**3n).toString())

        console.log("-----------[ 3 ]-----------")
        console.log("ALICE USDT BALANCE:",  await SCusdtAliceWallet.getJettonBalance())
        console.log("BOB INDEX BALANCE:", await SCindexBobWallet.getJettonBalance())
        console.log("BOB USDT BALANCE:", await SCusdtBobWallet.getJettonBalance())
        console.log("EVE USDT BALANCE:",  await SCusdtEveWallet.getJettonBalance())

        console.log("ASKS:", orders3.asks.keys(), orders3.asks.values())
        console.log("BIDS:", orders3.bids.keys(), orders3.bids.values())

        // EVE MAKES BID! 5 INDEX ----------------------------------------------------------------------------------------------
        const EVES_PRIORITY: number = 1;
        const EVES_INDEX_AMOUNT_FOR_BID: bigint = 5n * 10n**9n;

        const makeBidResult2 = await SCindexEveWallet.sendTransfer(ACTEve.getSender(), {
            value: toNano("0.20"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            jettonAmount: EVES_INDEX_AMOUNT_FOR_BID,
            recipientAddress: SCorderBook.address,
            forwardTONAmount: toNano("0.15"),
            forwardPayload: (
                beginCell()
                    .storeUint(await SCorderBook.getSeqno(), 32)
                    .storeUint(0xbf4385, 32)
                    .storeUint(EVES_PRIORITY, 16) 
                    .storeUint(10n * TSP_DIVIDER, 32)
                .endCell()
            ),
            secretKey: OBAkeyPair.secretKey,
        })

        // ПРОВЕРКА ИСПОЛНЕНИЯ ОРДЕРА ----------------------------------------------------------------------------------------------

        // От OrderBook USDT JETTON WALLET СК OrderBook'а (перевод EVE'е 10 USDT)
        expect(makeBidResult2.transactions).toHaveTransaction({
            from: SCorderBook.address,
            to: SCusdtOrderBookWallet.address,
            op: 0xf8a7ea5, // op::transfer
            success: true,
        });

        // От OrderBook USDT JETTON WALLET СК EVE'e (перевод EVE'е 10 USDT)
        expect(makeBidResult2.transactions).toHaveTransaction({
            from: SCusdtOrderBookWallet.address,
            to: SCusdtEveWallet.address,
            op: 0x178d4519, // op::internal_transfer 
            success: true,
        });

        // От OrderBook INDEX JETTON WALLET СК OrderBook'а (перевод BOB'у 1 INDEX)
        expect(makeBidResult2.transactions).toHaveTransaction({
            from: SCorderBook.address,
            to: SCindexOrderBookWallet.address,
            op: 0xf8a7ea5, // op::transfer
            success: true,
        });

        // INDEX JETTON WALLET СК OrderBook'а INDEX JETTON WALLET СК BOB'а (перевод BOB'у 1 INDEX)
        expect(makeBidResult2.transactions).toHaveTransaction({
            from: SCindexOrderBookWallet.address,
            to: SCindexBobWallet.address,
            op: 0x178d4519, // op::internal_transfer 
            success: true,
        });

        // ПРОВЕРКА БАЛАНСОВ ALICE и BOB после исполнения ордера ----------------------------------------------------------------------------------------------
        const bobsUSDTBalance1 = await SCusdtBobWallet.getJettonBalance()
        const bobsINDEXBalance1 = await SCindexBobWallet.getJettonBalance()
        const alicesUsdtBalance1 = await SCusdtAliceWallet.getJettonBalance()
        const eveUSDTBalance1 = await SCusdtEveWallet.getJettonBalance()
        
        expect((bobsINDEXBalance1).toString()).toEqual((5n*10n**9n).toString())
        expect((alicesUsdtBalance1).toString()).toEqual((10n*10n**6n).toString())
        expect((eveUSDTBalance1).toString()).toEqual((40n*10n**6n).toString())

        // Check BOB's ASK Amount after order execution ----------------------------------------------------------------------------------------------
        const porderQueues4 = await SCorderBook.getPorderQueues()
        let porderQueuesDict4 = Dictionary.loadDirect(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), porderQueuesDictionaryValue, porderQueues4);
        const orders4: porderQueuesType = porderQueuesDict4.get(BigInt(EVES_PRIORITY)) as porderQueuesType

        counter1 = await SCorderBook.getCounters()

        expect(orders4.bids.get(BigInt(counter1[1]))?.amount.toString()).toEqual((EVES_INDEX_AMOUNT_FOR_BID - 4n*10n**9n).toString())

        console.log("EVE STD ADDR", getStdAddress(ACTEve.address))

        console.log("-----------[ 4 ]-----------")
        console.log("ALICE USDT BALANCE:",  await SCusdtAliceWallet.getJettonBalance())
        console.log("BOB INDEX BALANCE:", await SCindexBobWallet.getJettonBalance())
        console.log("BOB USDT BALANCE:", await SCusdtBobWallet.getJettonBalance())
        console.log("EVE USDT BALANCE:",  await SCusdtEveWallet.getJettonBalance())

        console.log("ASKS:", orders4.asks.keys(), orders4.asks.values())
        console.log("BIDS:", orders4.bids.keys(), orders4.bids.values())


        await SCindexEveWallet.sendTransfer(ACTEve.getSender(), {
            value: toNano("0.20"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            jettonAmount: EVES_INDEX_AMOUNT_FOR_BID / 5n,
            recipientAddress: SCorderBook.address,
            forwardTONAmount: toNano("0.15"),
            forwardPayload: (
                beginCell()
                    .storeUint(await SCorderBook.getSeqno(), 32)
                    .storeUint(0xbf4385, 32)
                    .storeUint(EVES_PRIORITY, 16)
                    .storeUint(10n * TSP_DIVIDER, 32) 
                .endCell()
            ),
            secretKey: OBAkeyPair.secretKey,
        })

        let porderQueues5 = await SCorderBook.getPorderQueues()
        let porderQueuesDict5 = Dictionary.loadDirect(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), porderQueuesDictionaryValue, porderQueues5);
        let orders5: porderQueuesType = porderQueuesDict5.get(BigInt(EVES_PRIORITY)) as porderQueuesType

        console.log("ASKS:", orders5.asks.keys(), orders5.asks.values())
        console.log("BIDS:", orders5.bids.keys(), orders5.bids.values())

        await SCusdtBobWallet.sendTransfer(ACTBob.getSender(), {
            value: toNano("0.20"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            jettonAmount: BOBS_USDT_AMOUNT_FOR_ASK,
            recipientAddress: SCorderBook.address,
            forwardTONAmount: toNano("0.15"),
            forwardPayload: (
                beginCell()
                    .storeUint(await SCorderBook.getSeqno(), 32)
                    .storeUint(0x845746, 32)
                    .storeUint(BOBS_PRIORITY, 16) 
                    .storeUint(10n * TSP_DIVIDER, 32)
                .endCell()
            ),
            secretKey: OBAkeyPair.secretKey,
        })

        let porderQueues6 = await SCorderBook.getPorderQueues()
        let porderQueuesDict6 = Dictionary.loadDirect(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), porderQueuesDictionaryValue, porderQueues6);
        let orders6 = porderQueuesDict6.get(BigInt(BOBS_PRIORITY)) as porderQueuesType

        console.log("ASKS:", orders6.asks.keys(), orders6.asks.values())
        console.log("BIDS:", orders6.bids.keys(), orders6.bids.values())

        await SCusdtBobWallet.sendTransfer(ACTBob.getSender(), {
            value: toNano("0.20"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            jettonAmount: BOBS_USDT_AMOUNT_FOR_ASK,
            recipientAddress: SCorderBook.address,
            forwardTONAmount: toNano("0.15"),
            forwardPayload: (
                beginCell()
                    .storeUint(await SCorderBook.getSeqno(), 32)
                    .storeUint(0x845746, 32)
                    .storeUint(BOBS_PRIORITY, 16) 
                    .storeUint(10n * TSP_DIVIDER, 32)
                .endCell()
            ),
            secretKey: OBAkeyPair.secretKey,
        })

        porderQueues5 = await SCorderBook.getPorderQueues()
        porderQueuesDict5 = Dictionary.loadDirect(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), porderQueuesDictionaryValue, porderQueues5);
        orders5 = porderQueuesDict5.get(BigInt(BOBS_PRIORITY)) as porderQueuesType

        console.log("ASKS:", orders5.asks.keys(), orders5.asks.values())
        console.log("BIDS:", orders5.bids.keys(), orders5.bids.values())

    }, TIMEOUT);
});