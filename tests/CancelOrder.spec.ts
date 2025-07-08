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
import { JettonWallet, WalletData } from '../wrappers/JettonWallet';
import { assert } from 'console';

const BID_ID: number = 1;
const ASK_ID: number = 2;

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

    it('should cancel BID order', async () => {

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

        // MINT 100_000 SOXO TO ALICE ----------------------------------------------------------------------------------------------
        await SCsoxoMinter.sendMint(ACTAdmin.getSender(), {
            value: toNano('0.08'),
            queryId: BigInt(Math.floor(Date.now() / 1000)),
            toAddress: ACTALice.address,
            tonAmount: toNano('0.05'),
            jettonAmountToMint: AmountToMint,
            fromAddress: SCsoxoMinter.address
        })
        const soxoJettonData: jettonData = await SCsoxoMinter.getJettonData();
        expect(soxoJettonData.totalSupply).toEqual(AmountToMint)


        // ALICE MAKES BID! 1 SOXO ----------------------------------------------------------------------------------------------
        const ALICES_PRIORITY: number = 1;
        const ALICES_SOXO_AMOUNT_FOR_BID: bigint = 1n * 10n**9n;

        await SCsoxoAliceWallet.sendTransfer(ACTALice.getSender(), {
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

        let orderBookSOXOBalance: bigint = await SCsoxoOrderBookWallet.getJettonBalance();
        expect(orderBookSOXOBalance.toString()).toEqual((ALICES_SOXO_AMOUNT_FOR_BID).toString())

        // Check ALICEA's ASK Amount before cancel ----------------------------------------------------------------------------------------------
        const porderQueues2 = await SCorderBook.getPorderQueues()
        let porderQueuesDict2 = Dictionary.loadDirect(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), porderQueuesDictionaryValue, porderQueues2);
        const orders2: porderQueuesType = porderQueuesDict2.get(BigInt(ALICES_PRIORITY)) as porderQueuesType

        let counter1: [number, number] = await SCorderBook.getCounters()

        expect(orders2.bids.get(BigInt(counter1[1]))?.amount.toString()).toEqual((ALICES_SOXO_AMOUNT_FOR_BID).toString())

        const cancelBidOrderResult = await SCorderBook.sendCancelOrder(ACTALice.getSender(), {
            value: toNano("0.07"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            priority: ALICES_PRIORITY,
            orderType: BID_ID,
            userAddress: ACTALice.address
        })

        expect(cancelBidOrderResult.transactions).toHaveTransaction({
            from: ACTALice.address,
            to: SCorderBook.address,
            op: 0x3567, // op::ob::cancel_order 
            success: true,
        });

        // Передача USDT из ордера обратно BOB'y

        expect(cancelBidOrderResult.transactions).toHaveTransaction({
            from: SCorderBook.address,
            to: SCsoxoOrderBookWallet.address,
            op:  0xf8a7ea5, // op::transfer
            success: true,
        });

        expect(cancelBidOrderResult.transactions).toHaveTransaction({
            from: SCsoxoOrderBookWallet.address,
            to: SCsoxoAliceWallet.address,
            op: 0x178d4519, // op::internal_transfer 
            success: true,
        });

        // Check ALICES's BID after cancel ----------------------------------------------------------------------------------------------
        const porderQueues3 = await SCorderBook.getPorderQueues()
        let porderQueuesDict3 = Dictionary.loadDirect(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), porderQueuesDictionaryValue, porderQueues3);
        const orders3: porderQueuesType = porderQueuesDict3.get(BigInt(ALICES_PRIORITY)) as porderQueuesType

        expect(orders3.bids.keys().length).toEqual(0)
        expect(orders3.bids.values().length).toEqual(0)
    }, TIMEOUT)

    it('should cancel ASK order', async () => {
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

        // BOB MAKES ASK! 20 USDT ----------------------------------------------------------------------------------------------
        const BOBS_PRIORITY: number = 1;
        const BOBS_USDT_AMOUNT_FOR_ASK: bigint = 20n * 10n**6n;

        await SCusdtBobWallet.sendTransfer(ACTBob.getSender(), {
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

        let orderBookUSDTBalance: bigint = await SCusdtOrderBookWallet.getJettonBalance();
        expect(orderBookUSDTBalance.toString()).toEqual((BOBS_USDT_AMOUNT_FOR_ASK).toString())

        // Check BOB's ASK Amount before cancel ----------------------------------------------------------------------------------------------
        const porderQueues2 = await SCorderBook.getPorderQueues()
        let porderQueuesDict2 = Dictionary.loadDirect(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), porderQueuesDictionaryValue, porderQueues2);
        const orders2: porderQueuesType = porderQueuesDict2.get(BigInt(BOBS_PRIORITY)) as porderQueuesType

        let counter1: [number, number] = await SCorderBook.getCounters()

        // Умножем BOBS_USDT_AMOUNT_FOR_ASK на 10**3, так как USDT в контракте хранятся с decimals 9 для унификации. Только перед отправкой сумма делится на 1000
        expect(orders2.asks.get(BigInt(counter1[0]))?.amount.toString()).toEqual((BOBS_USDT_AMOUNT_FOR_ASK * 10n**3n).toString())

        const cancelBidOrderResult = await SCorderBook.sendCancelOrder(ACTBob.getSender(), {
            value: toNano("0.07"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            priority: BOBS_PRIORITY,
            orderType: ASK_ID,
            userAddress: ACTBob.address
        })

        expect(cancelBidOrderResult.transactions).toHaveTransaction({
            from: ACTBob.address,
            to: SCorderBook.address,
            op: 0x3567, // op::ob::cancel_order 
            success: true,
        });

        // Передача USDT из ордера обратно BOB'y

        expect(cancelBidOrderResult.transactions).toHaveTransaction({
            from: SCorderBook.address,
            to: SCusdtOrderBookWallet.address,
            op:  0xf8a7ea5, // op::transfer
            success: true,
        });

        expect(cancelBidOrderResult.transactions).toHaveTransaction({
            from: SCusdtOrderBookWallet.address,
            to: SCusdtBobWallet.address,
            op: 0x178d4519, // op::internal_transfer 
            success: true,
        });

        // Check BOB's ASK after cancel ----------------------------------------------------------------------------------------------
        const porderQueues3 = await SCorderBook.getPorderQueues()
        let porderQueuesDict3 = Dictionary.loadDirect(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), porderQueuesDictionaryValue, porderQueues3);
        const orders3: porderQueuesType = porderQueuesDict3.get(BigInt(BOBS_PRIORITY)) as porderQueuesType

        expect(orders3.asks.keys().length).toEqual(0)
        expect(orders3.asks.values().length).toEqual(0)
    }, TIMEOUT)
});