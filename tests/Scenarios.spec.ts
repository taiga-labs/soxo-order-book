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
import { JettonWallet, WalletData } from '../wrappers/JettonWallet';;

const TIMEOUT: number = 4200000;
const ORDER_QUEUES_KEY_LEN: number = 16;
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
    let soxoWalletCode: Cell
    let usdtWalletCode: Cell
    let soxoMinterCode: Cell
    let usdtMinterCode: Cell

    let mnemonics: string[]
    let keyPair: KeyPair

    beforeAll(async () => {
        mnemonics = await mnemonicNew();
        keyPair = await mnemonicToPrivateKey(mnemonics); 
        console.log("JettonFactory Mnemonic: ", mnemonics)

        bookMinterCode = await compile('BookMinter');
        orderBookCode = await compile('OrderBook');
        jettonFactoryCode = await compile('JettonFactory');
        soxoWalletCode = await compile('JettonWallet');
        usdtWalletCode = await compile('JettonWallet'); // Cell.fromHex(USDT_WALLET_CODE)
        soxoMinterCode = await compile('JettonMinter');
        usdtMinterCode = await compile('JettonMinter'); // Cell.fromHex(USDT_MINTER_CODE)
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
    let SCsoxoMinter: SandboxContract<JettonMinter>;
    let SCusdtMinter: SandboxContract<JettonMinter>;

    let SCsoxoAliceWallet: SandboxContract<JettonWallet>;
    let SCusdtBobWallet: SandboxContract<JettonWallet>;

    let SCsoxoBobWallet: SandboxContract<JettonWallet>;
    let SCusdtAliceWallet: SandboxContract<JettonWallet>;

    let SCsoxoEveWallet: SandboxContract<JettonWallet>;
    let SCusdtEveWallet: SandboxContract<JettonWallet>;

    let SCsoxoOrderBookWallet: SandboxContract<JettonWallet>;
    let SCusdtOrderBookWallet: SandboxContract<JettonWallet>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        ACTdeployer = await blockchain.treasury('deployer');
        ACTAdmin = await blockchain.treasury('Minters And Factory Owner');
        ACTAdmin = await blockchain.treasury('orderBookOwner')

        // JETTON FACTORY ----------------------------------------------------------------------------------------------
        SCjettonFactory  = blockchain.openContract(JettonFactory.createFromConfig({
            AdminPublicKey: keyPair.publicKey,
            Seqno: 0n,
            AdminAddress: ACTAdmin.address,
            MinterCode: soxoMinterCode,
        }, jettonFactoryCode))
        
        // SOXO JETTON MINTER ----------------------------------------------------------------------------------------------
        SCsoxoMinter = blockchain.openContract(JettonMinter.createFromConfig({
            totalSupply: 0n,                                            
            managerAddress: ACTAdmin.address,
            MinterContnet: buildjettonMinterContentCell({                              
                image: "https://i.ibb.co/gr4gGrs/image.png",
                decimals: "9",
                name: "TEST SOXO Channel",
                symbol: "TTSOXO",
                description: "Test SOXO Channel Jetton description"
            }),
            adminAddress: ACTAdmin.address,          
            transferAdminAddress: ACTAdmin.address,
            jettonWalletCode: await compile('JettonWallet'),
            FactoryAddress: SCjettonFactory.address
        }, soxoMinterCode))
        
        // USDT JETTON MINTER ----------------------------------------------------------------------------------------------
        SCusdtMinter = blockchain.openContract(JettonMinter.createFromConfig({
            totalSupply: 0n,                                            
            managerAddress: ACTAdmin.address,
            MinterContnet: buildjettonMinterContentCell({                              
                image: "https://cache.tonapi.io/imgproxy/T3PB4s7oprNVaJkwqbGg54nexKE0zzKhcrPv8jcWYzU/rs:fill:200:200:1/g:no/aHR0cHM6Ly90ZXRoZXIudG8vaW1hZ2VzL2xvZ29DaXJjbGUucG5n.webp",
                decimals: "6",
                name: "TEST USDT",
                symbol: "TUSDT",
                description: "Test Tether Token for Tether USD"
            }),
            adminAddress: ACTAdmin.address,          
            transferAdminAddress: ACTAdmin.address,
            jettonWalletCode: await compile('JettonWallet'),
            FactoryAddress: SCjettonFactory.address
        }, usdtMinterCode))

        // BOOK MINTER ----------------------------------------------------------------------------------------------
        SCbookMinter = blockchain.openContract(BookMinter.createFromConfig({
            adminAddress: ACTAdmin.address,
            usdtMasterAddres: SCusdtMinter.address,
            orderBooksAdminAddress: ACTAdmin.address,
            orderBookCode: orderBookCode,
            usdtWalletCode: usdtWalletCode,
            soxoChannelWalletCode: soxoWalletCode,
        }, bookMinterCode));

        // ORDER BOOK AND HIS OWNER ----------------------------------------------------------------------------------------------
        SCorderBook = blockchain.openContract(OrderBook.createFromConfig({
            ffreeze: 0,
            owner_address: ACTAdmin.address,
            admin_address: ACTAdmin.address,
            book_minter_address: SCbookMinter.address,
            usdt_wallet_code: usdtWalletCode,
            soxo_wallet_code: soxoWalletCode,
        }, orderBookCode));

        // ALICE AND HER SOXO and USDT WALLET ----------------------------------------------------------------------------------------------
        ACTALice = await blockchain.treasury('ALice')
        SCsoxoAliceWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTALice.address,
            minter: SCsoxoMinter.address,
            walletCode: soxoWalletCode
        }, soxoWalletCode));

        SCusdtAliceWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTALice.address,
            minter: SCusdtMinter.address,
            walletCode: usdtWalletCode
        }, usdtWalletCode));

        // EVE AND HER SOXO and USDT WALLET ----------------------------------------------------------------------------------------------
        ACTEve = await blockchain.treasury('Eve')
        SCsoxoEveWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTEve.address,
            minter: SCsoxoMinter.address,
            walletCode: soxoWalletCode
        }, soxoWalletCode));

        SCusdtEveWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTEve.address,
            minter: SCusdtMinter.address,
            walletCode: usdtWalletCode
        }, usdtWalletCode));


        // BOB AND HIS USDT and SOXO WALLET ----------------------------------------------------------------------------------------------
        ACTBob = await blockchain.treasury('Bob')
        SCusdtBobWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTBob.address,
            minter: SCusdtMinter.address,
            walletCode: usdtWalletCode
        }, usdtWalletCode));

        SCsoxoBobWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTBob.address,
            minter: SCsoxoMinter.address,
            walletCode: soxoWalletCode
        }, soxoWalletCode));

        // ORDER BOOK SOXO AND USDT WALLETS ----------------------------------------------------------------------------------------------

        SCsoxoOrderBookWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: SCorderBook.address,
            minter: SCsoxoMinter.address,
            walletCode: soxoWalletCode
        }, soxoWalletCode));

        SCusdtOrderBookWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: SCorderBook.address,
            minter: SCusdtMinter.address,
            walletCode: usdtWalletCode
        }, usdtWalletCode));
    
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
            soxoJettonMasterAddress: SCsoxoMinter.address,
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

        const TSP_DIVIDER: bigint = 1000n;

        // Set Trading Session Price! ----------------------------------------------------------------------------------------------
        const TSPSettingResult = await SCorderBook.sendNewSession(ACTAdmin.getSender(), {
            value: toNano('0.01'),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            newTradingSessionPrice: 10n * TSP_DIVIDER, 
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
            value: toNano('0.08'),
            queryId: BigInt(Math.floor(Date.now() / 1000)),
            toAddress: ACTBob.address,
            tonAmount: toNano('0.05'),
            jettonAmountToMint: AmountToMint,
            fromAddress: SCusdtMinter.address
        })

        const usdtJettonData: jettonData = await SCusdtMinter.getJettonData();
        expect(usdtJettonData.totalSupply).toEqual(AmountToMint)

        // MINT 100_000 SOXO TO ALICE ----------------------------------------------------------------------------------------------
        await SCsoxoMinter.sendMint(ACTAdmin.getSender(), {
            value: toNano('0.08'),
            queryId: BigInt(Math.floor(Date.now() / 1000)),
            toAddress: ACTALice.address,
            tonAmount: toNano('0.05'),
            jettonAmountToMint: AmountToMint,
            fromAddress: SCsoxoMinter.address
        })
        const soxoJettonData2: jettonData = await SCsoxoMinter.getJettonData();
        expect(soxoJettonData2.totalSupply).toEqual(AmountToMint)

        // MINT 100_000 SOXO TO EVE ----------------------------------------------------------------------------------------------
        await SCsoxoMinter.sendMint(ACTAdmin.getSender(), {
            value: toNano('0.08'),
            queryId: BigInt(Math.floor(Date.now() / 1000)),
            toAddress: ACTEve.address,
            tonAmount: toNano('0.05'),
            jettonAmountToMint: AmountToMint,
            fromAddress: SCsoxoMinter.address
        })
        const soxoJettonData3: jettonData = await SCsoxoMinter.getJettonData();
        expect(soxoJettonData3.totalSupply).toEqual(AmountToMint * 2n)

        console.log("EVE SOXO BALANCE AFTER MINT:", await SCsoxoEveWallet.getJettonBalance())

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
                    .storeUint(0x845746, 32)
                    .storeUint(BOBS_PRIORITY, 16) 
                .endCell()
            )
        })

        // От Боба её USDT jetton wallet
        expect(makeAskResult.transactions).toHaveTransaction({
            from: ACTBob.address,
            to: SCusdtBobWallet.address,
            op: 0xf8a7ea5, // op::transfer
            success: true,
        });

        // От SOXO JETTON WALLET Боба USDT JETTON WALLET СК OrderBook
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

        console.log("BOB's ASK amount:", orders1.asks.get(getStdAddress(ACTBob.address))?.amount.toString())

        // Умножем BOBS_USDT_AMOUNT_FOR_ASK на 10**3, так как USDT в контракте хранятся с decimals 9 для унификации. Только перед отправкой сумма делится на 1000
        expect(orders1.asks.get(getStdAddress(ACTBob.address))?.amount.toString()).toEqual((BOBS_USDT_AMOUNT_FOR_ASK * 10n**3n).toString())


        // ALICE MAKES BID! 1 SOXO ----------------------------------------------------------------------------------------------
        const ALICES_PRIORITY: number = 1;
        const ALICES_SOXO_AMOUNT_FOR_BID: bigint = 1n * 10n**9n;

        const makeBidResult = await SCsoxoAliceWallet.sendTransfer(ACTALice.getSender(), {
            value: toNano("0.20"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            jettonAmount: ALICES_SOXO_AMOUNT_FOR_BID,
            recipientAddress: SCorderBook.address,
            forwardTONAmount: toNano("0.15"),
            forwardPayload: (
                beginCell()
                    .storeUint(0xbf4385, 32)
                    .storeUint(ALICES_PRIORITY, 16) 
                .endCell()
            )
        })

        // От Алисы её SOXO jetton wallet
        expect(makeBidResult.transactions).toHaveTransaction({
            from: ACTALice.address,
            to: SCsoxoAliceWallet.address,
            op: 0xf8a7ea5, // op::transfer
            success: true,
        });

        // От SOXO JETTON WALLET Алисы SOXO JETTON WALLET СК OrderBook
        expect(makeBidResult.transactions).toHaveTransaction({
            from: SCsoxoAliceWallet.address,
            to: SCsoxoOrderBookWallet.address,
            op: 0x178d4519, // op::internal_transfer 
            success: true,
        });

        // От SOXO JETTON WALLET СК OrderBook СК OrderBook'у
        expect(makeBidResult.transactions).toHaveTransaction({
            from: SCsoxoOrderBookWallet.address,
            to: SCorderBook.address,
            op: 0x7362d09c, // op::transfer_notification
            success: true,
        });

        console.log("SCsoxoOrderBookWallet:", SCsoxoOrderBookWallet.address.toString())
        console.log("SCusdtOrderBookWallet:", SCusdtOrderBookWallet.address.toString())

        console.log("SCsoxoBobWallet:", SCsoxoBobWallet.address.toString())
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

        // От OrderBook SOXO JETTON WALLET СК OrderBook'а (перевод BOB'у 1 SOXO)
        expect(makeBidResult.transactions).toHaveTransaction({
            from: SCorderBook.address,
            to: SCsoxoOrderBookWallet.address,
            op: 0xf8a7ea5, // op::transfer
            success: true,
        });

        // SOXO JETTON WALLET СК OrderBook'а SOXO JETTON WALLET СК BOB'а (перевод BOB'у 1 SOXO)
        expect(makeBidResult.transactions).toHaveTransaction({
            from: SCsoxoOrderBookWallet.address,
            to: SCsoxoBobWallet.address,
            op: 0x178d4519, // op::internal_transfer 
            success: true,
        });

        // ПРОВЕРКА БАЛАНСОВ ALICE и BOB после исполнения ордера ----------------------------------------------------------------------------------------------
        const bobsSoxoBalance = await SCsoxoBobWallet.getJettonBalance()
        const alicesUsdtBalance = await SCusdtAliceWallet.getJettonBalance()
        
        expect((bobsSoxoBalance).toString()).toEqual((1n*10n**9n).toString())
        expect((alicesUsdtBalance).toString()).toEqual((10n*10n**6n).toString())

        // Check BOB's ASK Amount after order execution ----------------------------------------------------------------------------------------------
        const porderQueues3 = await SCorderBook.getPorderQueues()
        let porderQueuesDict3 = Dictionary.loadDirect(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), porderQueuesDictionaryValue, porderQueues3);
        const orders3: porderQueuesType = porderQueuesDict3.get(BigInt(BOBS_PRIORITY)) as porderQueuesType

        let newBobsOrderExpectedAmount: bigint = BOBS_USDT_AMOUNT_FOR_ASK - 10n * 10n**6n
        

        // Умножем BOBS_USDT_AMOUNT_FOR_ASK на 10**3, так как USDT в контракте хранятся с decimals 9 для унификации. Только перед отправкой сумма делится на 1000
        expect(orders3.asks.get(getStdAddress(ACTBob.address))?.amount.toString()).toEqual((newBobsOrderExpectedAmount * 10n**3n).toString())

        console.log("-----------[ 3 ]-----------")

        const bobsUSDTBalance1_ = await SCusdtBobWallet.getJettonBalance()
        const bobsSOXOBalance1_ = await SCsoxoBobWallet.getJettonBalance()
        const alicesUsdtBalance1_ = await SCusdtAliceWallet.getJettonBalance()
        const eveSoxoBalance1_ = await SCusdtEveWallet.getJettonBalance()

        console.log("ALICE USDT BALANCE:", alicesUsdtBalance1_)
        console.log("BOB SOXO BALANCE:", bobsSOXOBalance1_)
        console.log("BOB USDT BALANCE:", bobsUSDTBalance1_)
        console.log("EVE SOXO BALANCE:", eveSoxoBalance1_)

        console.log("ASKS:", orders3.asks.keys(), orders3.asks.values())
        console.log("BIDS:", orders3.bids.keys(), orders3.bids.values())

        // EVE MAKES BID! 5 SOXO ----------------------------------------------------------------------------------------------
        const EVES_PRIORITY: number = 1;
        const EVES_SOXO_AMOUNT_FOR_BID: bigint = 5n * 10n**9n;

        const makeBidResult2 = await SCsoxoEveWallet.sendTransfer(ACTEve.getSender(), {
            value: toNano("0.20"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            jettonAmount: EVES_SOXO_AMOUNT_FOR_BID,
            recipientAddress: SCorderBook.address,
            forwardTONAmount: toNano("0.15"),
            forwardPayload: (
                beginCell()
                    .storeUint(0xbf4385, 32)
                    .storeUint(EVES_PRIORITY, 16) 
                .endCell()
            )
        })

        // ПРОВЕРКА ИСПОЛНЕНИЯ ОРДЕРА(подробнее в AskBid.md) ----------------------------------------------------------------------------------------------

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

        // От OrderBook SOXO JETTON WALLET СК OrderBook'а (перевод BOB'у 1 SOXO)
        expect(makeBidResult2.transactions).toHaveTransaction({
            from: SCorderBook.address,
            to: SCsoxoOrderBookWallet.address,
            op: 0xf8a7ea5, // op::transfer
            success: true,
        });

        // SOXO JETTON WALLET СК OrderBook'а SOXO JETTON WALLET СК BOB'а (перевод BOB'у 1 SOXO)
        expect(makeBidResult2.transactions).toHaveTransaction({
            from: SCsoxoOrderBookWallet.address,
            to: SCsoxoBobWallet.address,
            op: 0x178d4519, // op::internal_transfer 
            success: true,
        });

        // ПРОВЕРКА БАЛАНСОВ ALICE и BOB после исполнения ордера ----------------------------------------------------------------------------------------------
        const bobsUSDTBalance1 = await SCusdtBobWallet.getJettonBalance()
        const bobsSOXOBalance1 = await SCsoxoBobWallet.getJettonBalance()
        const alicesUsdtBalance1 = await SCusdtAliceWallet.getJettonBalance()
        const eveUSDTBalance1 = await SCusdtEveWallet.getJettonBalance()
        
        expect((bobsSOXOBalance1).toString()).toEqual((5n*10n**9n).toString())
        expect((alicesUsdtBalance1).toString()).toEqual((10n*10n**6n).toString())
        expect((eveUSDTBalance1).toString()).toEqual((40n*10n**6n).toString())

        // Check BOB's ASK Amount after order execution ----------------------------------------------------------------------------------------------
        const porderQueues4 = await SCorderBook.getPorderQueues()
        let porderQueuesDict4 = Dictionary.loadDirect(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), porderQueuesDictionaryValue, porderQueues4);
        const orders4: porderQueuesType = porderQueuesDict4.get(BigInt(EVES_PRIORITY)) as porderQueuesType

        expect(orders4.bids.get(getStdAddress(ACTEve.address))?.amount.toString()).toEqual((EVES_SOXO_AMOUNT_FOR_BID - 4n*10n**9n).toString())

        console.log("EVE STD ADDR", getStdAddress(ACTEve.address))

        console.log("-----------[ 4 ]-----------")
        console.log("ALICE USDT BALANCE:", alicesUsdtBalance1)
        console.log("BOB SOXO BALANCE:", bobsSOXOBalance1)
        console.log("BOB USDT BALANCE:", bobsUSDTBalance1)
        console.log("EVE USDT BALANCE:", eveUSDTBalance1)

        console.log("ASKS:", orders4.asks.keys(), orders4.asks.values())
        console.log("BIDS:", orders4.bids.keys(), orders4.bids.values())

    }, TIMEOUT);
});