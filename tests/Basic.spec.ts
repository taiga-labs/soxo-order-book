import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, Address, DictionaryValue, Dictionary, beginCell } from '@ton/core';
import { BookMinter } from '../wrappers/BookMinter';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { OrderBook, orderDictionaryValue, porderQueuesDictionaryValue } from '../wrappers/OrderBook';
import { JettonMaster } from '@ton/ton';
import { jettonData, JettonMinter } from '../wrappers/JettonMinter';
import { buildjettonMinterContentCell } from '../helpers/metadata';
import { JettonFactory } from '../wrappers/JettonFactory';
import { KeyPair, mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
import { JettonWallet, WalletData } from '../wrappers/JettonWallet';

const TIMEOUT: number = 420000;

const ORDER_QUEUES_KEY_LEN: number = 16;

const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS as string;
// const USDT_MINTER_CODE = process.env.USDT_MINTER_CODE as string;

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

        // ALICE AND HER SOXO WALLET ----------------------------------------------------------------------------------------------
        ACTALice = await blockchain.treasury('ALice')
        SCsoxoAliceWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTALice.address,
            minter: SCsoxoMinter.address,
            walletCode: soxoWalletCode
        }, soxoWalletCode));


        // BOB AND HIS USDT WALLET ----------------------------------------------------------------------------------------------
        ACTBob = await blockchain.treasury('Bob')
        SCusdtBobWallet = blockchain.openContract(JettonWallet.createFromConfig({
            status: 0,
            balance: 0,
            owner: ACTBob.address,
            minter: SCusdtMinter.address,
            walletCode: usdtWalletCode
        }, usdtWalletCode));

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

    it('should deploy', async () => {
        const deployResult = await SCbookMinter.sendDeploy(ACTdeployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: ACTdeployer.address,
            to: SCbookMinter.address,
            deploy: true,
            success: true,
        });
    }, TIMEOUT);

    it('should deploy Order Book', async () => {
        const deployResult = await SCbookMinter.sendDeployOrderBook(ACTdeployer.getSender(), {
            value: toNano("0.05"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            soxoJettonMasterAddress: SCsoxoMinter.address,
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: ACTdeployer.address,
            to: SCbookMinter.address,
            op: 0xf4874876, // op::bm::deploy_order_book
            success: true,
        });
    }, TIMEOUT);

    it('should mint new tokens', async () => {

        const AmountToMint: bigint = 100_000n * 10n**9n;

        // MINT SOXO TO ALICE AND BOB

        await SCsoxoMinter.sendMint(ACTAdmin.getSender(), {
            value: toNano('0.08'),
            queryId: BigInt(Math.floor(Date.now() / 1000)),
            toAddress: ACTALice.address,
            tonAmount: toNano('0.05'),
            jettonAmountToMint: AmountToMint,
            fromAddress: SCsoxoMinter.address
        })

        await SCsoxoMinter.sendMint(ACTAdmin.getSender(), {
            value: toNano('0.08'),
            queryId: BigInt(Math.floor(Date.now() / 1000)),
            toAddress: ACTBob.address,
            tonAmount: toNano('0.05'),
            jettonAmountToMint: AmountToMint,
            fromAddress: SCsoxoMinter.address
        })

        const soxoJettonData: jettonData = await SCsoxoMinter.getJettonData();

        expect(soxoJettonData.totalSupply).toEqual(AmountToMint * 2n)

        // MINT USDT TO ALICE AND BOB

        await SCusdtMinter.sendMint(ACTAdmin.getSender(), {
            value: toNano('0.08'),
            queryId: BigInt(Math.floor(Date.now() / 1000)),
            toAddress: ACTALice.address,
            tonAmount: toNano('0.05'),
            jettonAmountToMint: AmountToMint,
            fromAddress: SCusdtMinter.address
        })

        await SCusdtMinter.sendMint(ACTAdmin.getSender(), {
            value: toNano('0.08'),
            queryId: BigInt(Math.floor(Date.now() / 1000)),
            toAddress: ACTBob.address,
            tonAmount: toNano('0.05'),
            jettonAmountToMint: AmountToMint,
            fromAddress: SCusdtMinter.address
        })

        const usdtJettonData: jettonData = await SCusdtMinter.getJettonData();

        expect(usdtJettonData.totalSupply).toEqual(AmountToMint * 2n)
    }, TIMEOUT);
});