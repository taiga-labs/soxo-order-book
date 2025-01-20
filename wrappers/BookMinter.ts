import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, TupleItemSlice } from '@ton/core';

export type BookMinterConfig = {
    adminAddress: Address;
    usdtMasterAddres: Address;
    orderBooksAdminAddress: Address;

    orderBookCode: Cell;
    usdtWalletCode: Cell;
    soxoChannelWalletCode: Cell;
};  

export function bookMinterConfigToCell(config: BookMinterConfig): Cell {
    return (
        beginCell()
            .storeAddress(config.adminAddress)
            .storeAddress(config.usdtMasterAddres)
            .storeAddress(config.orderBooksAdminAddress)
            
            .storeRef(config.orderBookCode)
            .storeRef(config.usdtWalletCode)
            .storeRef(config.soxoChannelWalletCode)
        .endCell()
    );
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

    async sendDeployOrderBook(provider: ContractProvider, via: Sender, 
        opts: {
            value: bigint;
            qi: bigint;
            soxoJettonAddress: Address;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(0xf4874876, 32)
                    .storeUint(opts.qi, 64)
                    .storeAddress(opts.soxoJettonAddress)
                .endCell(),
        });
    }

    async getOrderBookAddress(provider: ContractProvider, 
        opts: {
            ownerAddress: Address;
            jettonAddress: Address;
        }
    ) : Promise<Address> {
        const result = await provider.get('get_order_book_address', [
            {
                type: 'slice',
                cell: 
                    beginCell()
                        .storeAddress(opts.ownerAddress)
                    .endCell()
            } as TupleItemSlice,
            {
                type: 'slice',
                cell: 
                    beginCell()
                        .storeAddress(opts.jettonAddress)
                    .endCell()
            } as TupleItemSlice
        ]);
        return result.stack.readAddress();
    }

    async getBookMinterData(provider: ContractProvider): Promise<[Address, Address, Address, Cell, Cell, Cell]> {
        let res = await provider.get('get_book_minter_data', []);
        return [
            res.stack.readAddress(),
            res.stack.readAddress(),
            res.stack.readAddress(),
            res.stack.readCell(),
            res.stack.readCell(),
            res.stack.readCell()
        ]
    }
}
