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

const TIMEOUT: number = 420000;

const ORDER_QUEUES_KEY_LEN: number = 16;

const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS as string;
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
    // let ACTBob: SandboxContract<TreasuryContract>;
    let ACTAdmin: SandboxContract<TreasuryContract>;

    let SCbookMinter: SandboxContract<BookMinter>;
    let SCorderBook: SandboxContract<OrderBook>;

    let SCjettonFactory: SandboxContract<JettonFactory>;
    let SCsoxoMinter: SandboxContract<JettonMinter>;
    let SCusdtMinter: SandboxContract<JettonMinter>;

    let SCsoxoAliceWallet: SandboxContract<JettonWallet>;
    // let SCusdtBobWallet: SandboxContract<JettonWallet>;

    let SCsoxoOrderBookWallet: SandboxContract<JettonWallet>;
    // let SCusdtOrderBookWallet: SandboxContract<JettonWallet>;

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

        // ALICE AND HER SOXO WALLET ----------------------------------------------------------------------------------------------
        ACTALice = await blockchain.treasury('ALice')
        SCsoxoAliceWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTALice.address,
            minter: SCsoxoMinter.address,
            walletCode: soxoWalletCode
        }, soxoWalletCode));

        // ORDER BOOK SOXO WALLET ----------------------------------------------------------------------------------------------
        SCsoxoOrderBookWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: SCorderBook.address,
            minter: SCsoxoMinter.address,
            walletCode: soxoWalletCode
        }, soxoWalletCode));

    }, TIMEOUT);

    it('should make bid', async () => {

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

        // MINT 100_000 SOXO TO ALICE ----------------------------------------------------------------------------------------------
        const AmountToMint: bigint = 100_000n * 10n**9n;
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

        // ALICE MAKES BID! ----------------------------------------------------------------------------------------------
        const ALICES_PRIORITY: number = 1;
        const ALICES_SOXO_AMOUNT_FOR_BID: bigint = 20n * 10n**9n;

        const makeBidResult = await SCsoxoAliceWallet.sendTransfer(ACTALice.getSender(), {
            value: toNano("0.15"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            jettonAmount: ALICES_SOXO_AMOUNT_FOR_BID,
            recipientAddress: SCorderBook.address,
            forwardTONAmount: toNano("0.065"),
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

        // Check Alice's BID Amount ----------------------------------------------------------------------------------------------

        const porderQueues = await SCorderBook.getPorderQueues()
        let porderQueuesDict = Dictionary.loadDirect(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), porderQueuesDictionaryValue, porderQueues);
        const orders: porderQueuesType = porderQueuesDict.get(BigInt(ALICES_PRIORITY)) as porderQueuesType

        let counters: [number, number] = await SCorderBook.getCounters()

        expect(orders.bids.get(BigInt(counters[1]))?.amount.toString()).toEqual(ALICES_SOXO_AMOUNT_FOR_BID.toString())

    }, TIMEOUT);
});