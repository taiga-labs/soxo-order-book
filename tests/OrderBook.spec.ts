import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { OrderBook } from '../wrappers/OrderBook';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('OrderBook', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('OrderBook');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let orderBook: SandboxContract<OrderBook>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        orderBook = blockchain.openContract(OrderBook.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await orderBook.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: orderBook.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and orderBook are ready to use
    });
});
