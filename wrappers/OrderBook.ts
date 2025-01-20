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
                    .storeUint(0x4fbf6bd7bf2bf980n, 32)
                    .storeUint(opts.qi, 64)
                    .storeCoins(opts.newTradingSessionPrice)
                .endCell(),
        });
    }

    async getMasterDict(provider: ContractProvider): Promise<Cell | null> {
        let res = await provider.get('get_master_dict', []);
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

    async getAddresses(provider: ContractProvider): Promise<[Address, Address, Address, Address, Address, Address]> {
        let res = await provider.get('get_order_book_addresses', []);
        return [
            res.stack.readAddress(),
            res.stack.readAddress(),
            res.stack.readAddress(),
            res.stack.readAddress(),
            res.stack.readAddress(),
            res.stack.readAddress()
        ]
    }
}
