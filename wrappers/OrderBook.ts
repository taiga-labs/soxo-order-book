import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type OrderBookConfig = {};

export function orderBookConfigToCell(config: OrderBookConfig): Cell {
    return beginCell().endCell();
}

export class OrderBook implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new OrderBook(address);
    }

    static createFromConfig(config: OrderBookConfig, code: Cell, workchain = 0) {
        const data = orderBookConfigToCell(config);
        const init = { code, data };
        return new OrderBook(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
