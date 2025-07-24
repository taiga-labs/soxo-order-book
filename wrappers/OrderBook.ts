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
    usdt_wallet_code: Cell;
    index_wallet_code: Cell;
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
                        .endCell()
                    )
                    .storeRef(
                        beginCell()
                            .storeAddress(config.book_minter_address)
                            .storeRef(config.usdt_wallet_code)
                            .storeRef(config.index_wallet_code)
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
                    .storeInt(opts.freeze == true ? -1 : 0, 4)
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
            seqno: number;
            secretKey: Buffer;
        }
    ) {

        const baseBody: Cell = 
            beginCell()
                .storeUint(opts.seqno, 32)
                .storeUint(opts.priority, 16)
                .storeUint(opts.orderType, 4)
                .storeAddress(opts.userAddress)
            .endCell()

        const signature: Buffer = sign(baseBody.hash(), opts.secretKey)

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(0x3567, 32)
                    .storeUint(opts.qi, 64)
                    .storeRef(baseBody)
                    .storeBuffer(signature)
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
