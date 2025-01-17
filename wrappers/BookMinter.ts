import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type BookMinterConfig = {};

export function bookMinterConfigToCell(config: BookMinterConfig): Cell {
    return beginCell().endCell();
}

export class BookMinter implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new BookMinter(address);
    }

    static createFromConfig(config: BookMinterConfig, code: Cell, workchain = 0) {
        const data = bookMinterConfigToCell(config);
        const init = { code, data };
        return new BookMinter(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
