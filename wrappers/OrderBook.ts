import { sign } from "@ton/crypto";
import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryValue, Sender, SendMode } from '@ton/core';

const FFREZE_LEN: number = 4;
const ASKS_BIDS_ID_LEN: number = 64;
const STD_ADDR_LEN: number = 256;

export type orderInfoType = {
    amount: bigint
    address: Address
}

export const orderDictionaryValue: DictionaryValue<orderInfoType> = {
    serialize(src, builder) {    
        builder.storeCoins(src.amount);
        builder.storeAddress(src.address);
    },
    parse(src) {
        return {
            amount: src.loadCoins(),
            address: src.loadAddress(),
        }
    },
}

export type porderQueuesType = {
    asks: Dictionary<bigint, orderInfoType>;
    bids: Dictionary<bigint, orderInfoType>
}

export const porderQueuesDictionaryValue: DictionaryValue<porderQueuesType> = {
    serialize(src, builder) {    
        builder.storeDict(src.asks);
        builder.storeDict(src.bids);
    },
    parse(src) {
        return {
            asks: src.loadDict(Dictionary.Keys.BigUint(ASKS_BIDS_ID_LEN), orderDictionaryValue),
            bids: src.loadDict(Dictionary.Keys.BigUint(ASKS_BIDS_ID_LEN), orderDictionaryValue),
        }
    },
}
export type OrderBookConfig = {
    ffreeze: number;
    owner_address: Address;
    admin_address: Address
    book_minter_address: Address;
    indexMasterAddress: Address;
    usdtMasterAddress: Address;
};  

export function orderBookConfigToCell(config: OrderBookConfig): Cell {
    return (
        beginCell()
            .storeInt(config.ffreeze, FFREZE_LEN)
            .storeRef(
                beginCell()
                    .storeRef(
                        beginCell()
                            .storeAddress(config.owner_address)
                            .storeAddress(config.admin_address)
                            .storeAddress(config.book_minter_address)
                        .endCell()
                    )
                    .storeRef(
                        beginCell()
                            .storeAddress(config.usdtMasterAddress)
                            .storeAddress(config.indexMasterAddress)
                        .endCell()
                    )
                .endCell()
            )
        .endCell()
    );
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

    async sendNewSession(provider: ContractProvider, via: Sender, 
        opts: {
            value: bigint;
            qi: bigint;
            newTradingSessionPriceMin: number;
            newTradingSessionPriceMax: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(0xbb35443b, 32)
                    .storeUint(opts.qi, 64)
                    .storeUint(opts.newTradingSessionPriceMin, 32)
                    .storeUint(opts.newTradingSessionPriceMax, 32)
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
                    .storeInt(opts.freeze == true ? -1 : 0, 4)
                .endCell(),
        });
    }

    async sendFixBalances(provider: ContractProvider, via: Sender, 
        opts: {
            value: bigint;
            qi: bigint;
            usdt: number;
            index: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(0x8724359, 32)
                    .storeUint(opts.qi, 64)
                    .storeCoins(opts.usdt)
                    .storeCoins(opts.index)
                .endCell(),
        });
    }

    async sendResetOrderInfo(provider: ContractProvider, via: Sender, 
        opts: {
            value: bigint;
            qi: bigint;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(0x46778, 32)
                    .storeUint(opts.qi, 64)
                .endCell(),
        });
    }


    async sendResetOrdersInfo(provider: ContractProvider, via: Sender, 
        opts: {
            value: bigint;
            qi: bigint;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(0x46778, 32)
                    .storeUint(opts.qi, 64)
                .endCell(),
        });
    }

    async sendClaimTons(provider: ContractProvider, via: Sender, 
        opts: {
            value: bigint;
            qi: bigint;
            amount: bigint;
            toAddress: Address;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(0x3456, 32)
                    .storeUint(opts.qi, 64)
                    .storeCoins(opts.amount)
                    .storeAddress(opts.toAddress)
                .endCell(),
        });
    }

    async sendCancelOrder(provider: ContractProvider, via: Sender, 
        opts: {
            value: bigint;
            qi: bigint;
            priority: number;
            orderType: number;
            userAddress: Address;
        }
    ) {

        const baseBody: Cell = 
            beginCell()
                .storeUint(opts.priority, 16)
                .storeUint(opts.orderType, 4)
                .storeAddress(opts.userAddress)
            .endCell()

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(0x3567, 32)
                    .storeUint(opts.qi, 64)
                    .storeRef(baseBody)
                .endCell(),
        });
    }


    async sendMakeTx(provider: ContractProvider, via: Sender, 
        opts: {
            value: bigint;
            qi: bigint;
            cell: Cell;
        }
    ) {

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(4242, 32)
                    .storeUint(opts.qi, 64)
                    .storeUint(0, 8)
                    .storeRef(opts.cell)
                .endCell(),
        });
    }

    async getPorderQueues(provider: ContractProvider): Promise<Cell | null> {
        let res = await provider.get('get_porder_queues', []);
        return res.stack.readCellOpt();
    }

    async getPrices(provider: ContractProvider): Promise<[bigint, bigint, number, number]> {
        let res = await provider.get('get_order_book_prices', []);
        return [
            res.stack.readBigNumber(),
            res.stack.readBigNumber(),
            res.stack.readNumber(),
            res.stack.readNumber()
        ]
    }

    async getInit(provider: ContractProvider): Promise<number> {
        let res = await provider.get('init?', []);
        return res.stack.readNumber()
    }

    async getCounters(provider: ContractProvider): Promise<[number, number]> {
        let res = await provider.get('get_counters', []);
        return [
            res.stack.readNumber(),
            res.stack.readNumber()
        ]
    }

    async getSeqno(provider: ContractProvider): Promise<number> {
        let res = await provider.get('get_seqno', []);
        return res.stack.readNumber()
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
