import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';


export class OrderBook implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new OrderBook(address);
    }

    async sendNewSession(provider: ContractProvider, via: Sender, 
        opts: {
            value: bigint;
            qi: bigint;
            newTradingSessionPrice: bigint;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(0xbb35443b, 32)
                    .storeUint(opts.qi, 64)
                    .storeCoins(opts.newTradingSessionPrice)
                .endCell(),
        });
    }

    async sendFreeze(provider: ContractProvider, via: Sender, 
        opts: {
            value: bigint;
            qi: bigint;
            freeze: boolean;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(0x325aba5, 32)
                    .storeUint(opts.qi, 64)
                    .storeInt(opts.freeze == true ? -1 : 0,4)
                .endCell(),
        });
    }

    async getPorderQueues(provider: ContractProvider): Promise<Cell | null> {
        let res = await provider.get('get_porder_queues', []);
        return res.stack.readCellOpt();
    }

    async getPrices(provider: ContractProvider): Promise<[bigint, bigint, bigint]> {
        let res = await provider.get('get_order_book_prices', []);
        return [
            res.stack.readBigNumber(),
            res.stack.readBigNumber(),
            res.stack.readBigNumber()
        ]
    }

    async getAddresses(provider: ContractProvider): Promise<[Address, Address, Address, Address, Address]> {
        let res = await provider.get('get_order_book_addresses', []);
        return [
            res.stack.readAddress(),
            res.stack.readAddress(),
            res.stack.readAddress(),
            res.stack.readAddress(),
            res.stack.readAddress()
        ]
    }
}
