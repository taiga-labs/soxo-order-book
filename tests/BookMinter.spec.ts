import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { BookMinter } from '../wrappers/BookMinter';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

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

        bookMinter = blockchain.openContract(BookMinter.createFromConfig({}, code));

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
        // the check is done inside beforeEach
        // blockchain and bookMinter are ready to use
    });
});
