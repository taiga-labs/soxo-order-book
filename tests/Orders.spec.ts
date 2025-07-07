import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, Address, DictionaryValue, Dictionary } from '@ton/core';
import { BookMinter } from '../wrappers/BookMinter';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { OrderBook, orderDictionaryValue } from '../wrappers/OrderBook';
import { JettonMaster } from '@ton/ton';
import { JettonMinter } from '../wrappers/JettonMinter';
import { buildjettonMinterContentCell } from '../helpers/metadata';
import { JettonFactory } from '../wrappers/JettonFactory';
import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
import { JettonWallet } from '../wrappers/JettonWallet';

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

    beforeAll(async () => {
        bookMinterCode = await compile('BookMinter');
        orderBookCode = await compile('OrderBook');
        jettonFactoryCode = await compile('JettonFactory');
        soxoWalletCode = await compile('JettonWallet');
        usdtWalletCode = await compile('JettonWallet'); // Cell.fromHex(USDT_WALLET_CODE)
        soxoMinterCode = await compile('JettonMinter');
        usdtMinterCode = await compile('JettonMinter'); // Cell.fromHex(USDT_MINTER_CODE)
    });

    let blockchain: Blockchain;
    let ACTdeployer: SandboxContract<TreasuryContract>;
    let ACTorderBookOwner: SandboxContract<TreasuryContract>;
    let ACTsoxoALice: SandboxContract<TreasuryContract>;
    let ACTusdtBob: SandboxContract<TreasuryContract>;

    let SCbookMinter: SandboxContract<BookMinter>;
    let SCorderBook: SandboxContract<OrderBook>;

    let SCjettonFactory: SandboxContract<JettonFactory>;
    let SCsoxoMinter: SandboxContract<JettonMinter>;
    let SCusdtMinter: SandboxContract<JettonMinter>;

    let SCsoxoAliceWallet: SandboxContract<JettonWallet>;
    let SCusdtBobWallet: SandboxContract<JettonWallet>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        ACTdeployer = await blockchain.treasury('deployer');

        // JETTON FACTORY ----------------------------------------------------------------------------------------------
        let mnemonics = await mnemonicNew();
        let keyPair = await mnemonicToPrivateKey(mnemonics);
        console.log(mnemonics)
        
        SCjettonFactory  = blockchain.openContract(JettonFactory.createFromConfig({
            AdminPublicKey: keyPair.publicKey,
            Seqno: 0n,
            AdminAddress: Address.parse(ADMIN_ADDRESS),
            MinterCode: soxoMinterCode,
        }, jettonFactoryCode))
        
        // SOXO JETTON MINTER ----------------------------------------------------------------------------------------------
        SCsoxoMinter = blockchain.openContract(JettonMinter.createFromConfig({
            totalSupply: 0n,                                            
            managerAddress: Address.parse(ADMIN_ADDRESS),
            MinterContnet: buildjettonMinterContentCell({                              
                image: "https://i.ibb.co/gr4gGrs/image.png",
                decimals: "9",
                name: "TEST SOXO Channel",
                symbol: "TTSOXO",
                description: "Test SOXO Channel Jetton description"
            }),
            adminAddress: Address.parse(ADMIN_ADDRESS),          
            transferAdminAddress: Address.parse(ADMIN_ADDRESS),
            jettonWalletCode: await compile('JettonWallet'),
            FactoryAddress: SCjettonFactory.address
        }, soxoMinterCode))
        
        // USDT JETTON MINTER ----------------------------------------------------------------------------------------------
        SCusdtMinter = blockchain.openContract(JettonMinter.createFromConfig({
            totalSupply: 0n,                                            
            managerAddress: Address.parse(ADMIN_ADDRESS),
            MinterContnet: buildjettonMinterContentCell({                              
                image: "https://cache.tonapi.io/imgproxy/T3PB4s7oprNVaJkwqbGg54nexKE0zzKhcrPv8jcWYzU/rs:fill:200:200:1/g:no/aHR0cHM6Ly90ZXRoZXIudG8vaW1hZ2VzL2xvZ29DaXJjbGUucG5n.webp",
                decimals: "6",
                name: "TEST USDT",
                symbol: "TUSDT",
                description: "Test Tether Token for Tether USD"
            }),
            adminAddress: Address.parse(ADMIN_ADDRESS),          
            transferAdminAddress: Address.parse(ADMIN_ADDRESS),
            jettonWalletCode: await compile('JettonWallet'),
            FactoryAddress: SCjettonFactory.address
        }, usdtMinterCode))

        // BOOK MINTER ----------------------------------------------------------------------------------------------
        SCbookMinter = blockchain.openContract(BookMinter.createFromConfig({
            adminAddress: Address.parse(ADMIN_ADDRESS),
            usdtMasterAddres: SCusdtMinter.address,
            orderBooksAdminAddress: Address.parse(ADMIN_ADDRESS),
            orderBookCode:  orderBookCode,
            usdtWalletCode: usdtWalletCode,
            soxoChannelWalletCode: soxoWalletCode,
        }, bookMinterCode));

        // ORDER BOOK AND HIS OWNER ----------------------------------------------------------------------------------------------
        ACTorderBookOwner = await blockchain.treasury('orderBookOwner')

        SCorderBook = blockchain.openContract(OrderBook.createFromConfig({
            ffreeze: 0,
            owner_address: ACTorderBookOwner.address,
            admin_address: Address.parse(ADMIN_ADDRESS),
            book_minter_address: SCbookMinter.address,
            usdt_wallet_code: usdtWalletCode,
            soxo_wallet_code: soxoWalletCode,
            porder_queues: Dictionary.empty(Dictionary.Keys.BigUint(ORDER_QUEUES_KEY_LEN), orderDictionaryValue),
            usdt_master_address: SCusdtMinter.address,
            soxo_master_address: SCsoxoMinter.address,
            usdt_balance: 0,
            soxo_jetton_balance: 0,
            trading_session_price: 0,
            asks_counter: 0,
            bids_counter: 0
        }, orderBookCode));

        // ALICE AND HER SOXO WALLET ----------------------------------------------------------------------------------------------
        ACTsoxoALice = await blockchain.treasury('soxoALice')
        SCsoxoAliceWallet = blockchain.openContract(JettonWallet.createFromConfig({
            owner: ACTsoxoALice.address,
            minter: SCsoxoMinter.address,
            walletCode: soxoWalletCode
        }, soxoWalletCode));


        // BOB AND HIS USDT WALLET ----------------------------------------------------------------------------------------------
        ACTusdtBob = await blockchain.treasury('usdtBob')
        SCusdtBobWallet = blockchain.openContract(JettonWallet.createFromConfig({
            owner: ACTusdtBob.address,
            minter: SCusdtMinter.address,
            walletCode: usdtWalletCode
        }, usdtWalletCode));
    });

    it('should deploy', async () => {
        const deployResult = await SCbookMinter.sendDeploy(ACTdeployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: ACTdeployer.address,
            to: SCbookMinter.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy order book', async () => {
        const deployResult = await SCbookMinter.sendDeployOrderBook(ACTdeployer.getSender(), {
            value: toNano("0.05"),
            qi: BigInt(Math.floor(Date.now() / 1000)),
            soxoJettonAddress: SCsoxoMinter.address
        })

        expect(deployResult.transactions).toHaveTransaction({
            from: ACTdeployer.address,
            to: SCbookMinter.address,
            success: true,
        });

    });
});
