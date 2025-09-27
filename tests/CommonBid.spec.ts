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
import { USDTJettonMinter } from '../wrappers/USDTJettonMinter';

const TIMEOUT: number = 420000;

const ORDER_QUEUES_KEY_LEN: number = 16;

const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS as string;
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

        OBAMnem = ORDER_BOOK_ADMIN_MNEMONIC.split(" ")
        OBAkeyPair = await mnemonicToPrivateKey(OBAMnem);

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
    // let ACTBob: SandboxContract<TreasuryContract>;
    let ACTAdmin: SandboxContract<TreasuryContract>;

    let SCbookMinter: SandboxContract<BookMinter>;
    let SCorderBook: SandboxContract<OrderBook>;

    let SCjettonFactory: SandboxContract<JettonFactory>;
    let SCindexMinter: SandboxContract<JettonMinter>;
    let SCusdtMinter: SandboxContract<USDTJettonMinter>;

    let SCindexAliceWallet: SandboxContract<JettonWallet>;
    // let SCusdtBobWallet: SandboxContract<JettonWallet>;

    let SCindexOrderBookWallet: SandboxContract<JettonWallet>;
    // let SCusdtOrderBookWallet: SandboxContract<JettonWallet>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        ACTdeployer = await blockchain.treasury('deployer');
        ACTAdmin = await blockchain.treasury('Minters And Factory Owner');
        ACTAdmin = await blockchain.treasury('orderBookOwner')

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

        // ALICE AND HER INDEX WALLET ----------------------------------------------------------------------------------------------
        ACTALice = await blockchain.treasury('ALice')
        SCindexAliceWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTALice.address,
            minter: SCindexMinter.address,
            walletCode: indexWalletCode
        }, indexWalletCode));

        // ORDER BOOK INDEX WALLET ----------------------------------------------------------------------------------------------
        SCindexOrderBookWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: SCorderBook.address,
            minter: SCindexMinter.address,
            walletCode: indexWalletCode
        }, indexWalletCode));

        await SCindexMinter.sendDeploy(ACTdeployer.getSender(), toNano('0.05'))
        await SCusdtMinter.sendDeploy(ACTdeployer.getSender(), toNano('0.05'))
        
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

        const TSP_DIVIDER: number = 10000;

        // Set Trading Session Price! ----------------------------------------------------------------------------------------------
        const TSPSettingResult = await SCorderBook.sendNewSession(ACTAdmin.getSender(), {
            value: toNano('0.01'),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            newTradingSessionPriceMin: 10 * TSP_DIVIDER, 
            newTradingSessionPriceMax: 20 * TSP_DIVIDER, 
        })

        expect(TSPSettingResult.transactions).toHaveTransaction({
            from: ACTAdmin.address,
            to: SCorderBook.address,
            op: 0xbb35443b, // op::ob::recv_new_session
            success: true,
        });

        // MINT 100_000 INDEX TO ALICE ----------------------------------------------------------------------------------------------
        const AmountToMint: bigint = 100_000n * 10n**9n;
        await SCindexMinter.sendMint(ACTAdmin.getSender(), {
            value: toNano('0.08'),
            queryId: BigInt(Math.floor(Date.now() / 1000)),
            toAddress: ACTALice.address,
            tonAmount: toNano('0.05'),
            jettonAmountToMint: AmountToMint,
            fromAddress: SCindexMinter.address
        })
        const indexJettonData: jettonData = await SCindexMinter.getJettonData();
        expect(indexJettonData.totalSupply).toEqual(AmountToMint)

        // ALICE MAKES BID! ----------------------------------------------------------------------------------------------
        const ALICES_PRIORITY: number = 1;
        const ALICES_INDEX_AMOUNT_FOR_BID: bigint = 20n * 10n**9n;

        const makeBidResult = await SCindexAliceWallet.sendTransfer(ACTALice.getSender(), {
            value: toNano("0.15"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            jettonAmount: ALICES_INDEX_AMOUNT_FOR_BID,
            recipientAddress: SCorderBook.address,
            forwardTONAmount: toNano("0.065"),
            forwardPayload: (
                beginCell()
                    .storeUint(await SCorderBook.getSeqno(), 32)
                    .storeUint(0xbf4385, 32)
                    .storeUint(ALICES_PRIORITY, 16) 
                    .storeUint(10 * TSP_DIVIDER, 32)
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

        // Check Alice's BID Amount ----------------------------------------------------------------------------------------------

        const porderQueues = await SCorderBook.getPorderQueues()
        let porderQueuesDict = Dictionary.loadDirect(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), porderQueuesDictionaryValue, porderQueues);
        const orders: porderQueuesType = porderQueuesDict.get(BigInt(ALICES_PRIORITY)) as porderQueuesType

        let counters: [number, number] = await SCorderBook.getCounters()

        expect(orders.bids.get(BigInt(counters[1]))?.amount.toString()).toEqual(ALICES_INDEX_AMOUNT_FOR_BID.toString())

    }, TIMEOUT);
});