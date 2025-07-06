import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, Address } from '@ton/core';
import { BookMinter } from '../wrappers/BookMinter';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS as string;
const SOXO_WALLET_HEX_CODE = process.env.SOXO_WALLET_HEX_CODE as string;
const USDT_MASTER_ADDRESS = process.env.USDT_MASTER_ADDRESS as string;
const SOXO_MASTER_ADDRESS = process.env.SOXO_MASTER_ADDRESS as string;

describe('BookMinter', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('BookMinter');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let bookMinter: SandboxContract<BookMinter>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        bookMinter = blockchain.openContract(BookMinter.createFromConfig({
            adminAddress: Address.parse(ADMIN_ADDRESS),
            usdtMasterAddres: Address.parse(USDT_MASTER_ADDRESS),
            orderBooksAdminAddress: Address.parse(ADMIN_ADDRESS),

            orderBookCode:  await compile("OrderBook"),

            usdtWalletCode: Cell.fromHex(SOXO_WALLET_HEX_CODE),
            soxoChannelWalletCode: Cell.fromHex(SOXO_WALLET_HEX_CODE)
        }, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await bookMinter.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: bookMinter.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        blockchain.debug = true
        // the check is done inside beforeEach
        // blockchain and bookMinter are ready to use
    }, 420000);

    it('should deploy order book', async () => {
        blockchain.debug = true
        const orderBookDeployer = await blockchain.treasury('orderBookDeployer');

        const deployResult = await bookMinter.sendDeployOrderBook(orderBookDeployer.getSender(), {
                    value: toNano("0.05"),
                    qi: BigInt(Math.floor(Date.now() / 1000)),
                    soxoJettonAddress: Address.parse(SOXO_MASTER_ADDRESS)
        })

        expect(deployResult.transactions).toHaveTransaction({
            from: orderBookDeployer.address,
            to: bookMinter.address,
            success: true,
        });

    }, 420000);
});
