import dotenv from 'dotenv';
import { Address, beginCell, Cell, Dictionary, DictionaryValue } from '@ton/core';
import { OrderBook } from '../../wrappers/OrderBook';
import {  NetworkProvider } from '@ton/blueprint';


dotenv.config();
const ORDER_BOOK_ADDRESS = process.env.ORDER_BOOK_ADDRESS as string;

export type orderInfoType = {
    orderAmount: bigint; 
    stdAddr: bigint
}

export const orderDictionaryValue: DictionaryValue<orderInfoType> = {
    serialize(src, builder) {    
        builder.storeCoins(src.orderAmount)
        builder.storeUint(src.stdAddr, 256)
    },

    parse(src) {
        return {
            orderAmount: src.loadCoins(),
            stdAddr:  BigInt(src.loadUintBig(256))
        }
    },
}


export type asksBidsInfoType = {
    asks: Dictionary<bigint, orderInfoType>;
    asks_number: number;
    ask_id: number;
    bids: Dictionary<bigint, orderInfoType>;
    bids_number: number;
    bid_id: number;
}

export const asksBidsDictionaryValue: DictionaryValue<asksBidsInfoType> = {
    serialize(src, builder) {    
        builder.storeDict(src.asks)
        builder.storeUint(src.asks_number, 64)
        builder.storeUint(src.ask_id, 64)
        builder.storeDict(src.bids)
        builder.storeUint(src.bids_number, 64)
        builder.storeUint(src.bid_id, 64)
    },

    parse(src) {
        return {
            asks: src.loadDict(Dictionary.Keys.BigUint(64), orderDictionaryValue),
            asks_number: src.loadUint(64),
            ask_id: src.loadUint(64),
            bids: src.loadDict(Dictionary.Keys.BigUint(64), orderDictionaryValue),
            bids_number: src.loadUint(64),
            bid_id: src.loadUint(64),
        }
    },
}

function getAddress(addressUint: bigint): Address {
    return (
        beginCell()
            .storeUint(2, 2)
            .storeUint(0, 1)
            .storeUint(0, 8)
            .storeUint(addressUint, 256)
        .endCell().beginParse().loadAddress()
    )
}

export async function run(provider: NetworkProvider) {
    const orderBook = provider.open(OrderBook.createFromAddress(Address.parse(ORDER_BOOK_ADDRESS)));
    const porderQueues: Cell | null = await orderBook.getPorderQueues();

    let pordersDict = Dictionary.loadDirect(Dictionary.Keys.Uint(16), asksBidsDictionaryValue, porderQueues);

    let ordersCtxInfo: asksBidsInfoType | undefined

    for (let iter: number = 1; iter <= pordersDict.size; iter++) {
        console.log(`Priority ${iter}:`)
        ordersCtxInfo = pordersDict.get(iter);
        
        if (ordersCtxInfo?.asks_number as number > 0) {
            console.log(`\tASKS number: ${ordersCtxInfo?.asks_number}`);
            console.log(`\tASKS:`)
            
            let asksCtxKeys = ordersCtxInfo?.asks.keys() as bigint[]
            let asksCtxValues = ordersCtxInfo?.asks.values() as orderInfoType[]
            for (let jter: number = 0; jter < (ordersCtxInfo?.asks_number as number); jter += 1) {
                console.log(`\t\tASK ${jter + 1}:`)
                console.log("\t\t\t[ ASK ID ]: ", asksCtxKeys[jter])
                console.log("\t\t\t[ user address ]: ", getAddress(asksCtxValues[jter].stdAddr).toString())
                console.log("\t\t\t[ user ASK volume ]: ", Number(asksCtxValues[jter].orderAmount) / 10 ** 9, "USDT\n")
            }
        }

        if (ordersCtxInfo?.bids_number as number > 0) {
            console.log(`\tBIDS number: ${ordersCtxInfo?.bids_number}`);
            console.log(`\tBIDS:`)
            let bidsCtxKeys = ordersCtxInfo?.bids.keys() as bigint[]
            let bidsCtxValues = ordersCtxInfo?.bids.values() as orderInfoType[]
            for (let jter: number = 0; jter < (ordersCtxInfo?.bids_number as number); jter += 1) {
                console.log(`\t\tBID ${jter + 1}:`)
                console.log("\t\t\t[ BID ID ]: ", bidsCtxKeys[jter])
                console.log("\t\t\t[ user address ]: ", getAddress(bidsCtxValues[jter].stdAddr).toString())
                console.log("\t\t\t[ user ASK volume ]: ", Number(bidsCtxValues[jter].orderAmount) / 10 ** 9, "SOXO\n")
            }
        }
    }
}