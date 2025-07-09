import dotenv from 'dotenv';
import { Address, beginCell, Cell, Dictionary, DictionaryValue } from '@ton/core';
import { OrderBook, porderQueuesType } from '../../wrappers/OrderBook';
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
    bids: Dictionary<bigint, orderInfoType>;
}

export const asksBidsDictionaryValue: DictionaryValue<asksBidsInfoType> = {
    serialize(src, builder) {    
        builder.storeDict(src.asks)
        builder.storeDict(src.bids)
    },

    parse(src) {
        return {
            asks: src.loadDict(Dictionary.Keys.BigUint(64), orderDictionaryValue),
            bids: src.loadDict(Dictionary.Keys.BigUint(64), orderDictionaryValue),
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


    const orders: asksBidsInfoType | undefined = pordersDict.get(1)
    
    console.log("-----------[ ASKS ]-----------")
    console.log(orders?.asks.keys())
    console.log(orders?.asks.values())

    console.log("-----------[ BIDS ]-----------")
    console.log(orders?.bids.keys())
    console.log(orders?.bids.values())


    // for (let iter: number = 1; iter <= pordersDict.size; iter++) {
    //     console.log(`Priority ${iter}:`)
    //     ordersCtxInfo = pordersDict.get(iter);
        
    //     if (ordersCtxInfo?.asks_number as number > 0) {
    //         console.log(`\tASKS number: ${ordersCtxInfo?.asks_number}`);
    //         console.log(`\tASKS:`)
            
    //         let asksCtxKeys = ordersCtxInfo?.asks.keys() as bigint[]
    //         let asksCtxValues = ordersCtxInfo?.asks.values() as orderInfoType[]
    //         for (let jter: number = 0; jter < (ordersCtxInfo?.asks_number as number); jter += 1) {
    //             console.log(`\t\tASK ${jter + 1}:`)
    //             console.log("\t\t\t[ ASK ID ]: ", asksCtxKeys[jter])
    //             console.log("\t\t\t[ user address ]: ", getAddress(asksCtxValues[jter].stdAddr).toString())
    //             console.log("\t\t\t[ user ASK volume ]: ", Number(asksCtxValues[jter].orderAmount) / 10 ** 9, "USDT\n")
    //         }
    //     }

    //     if (ordersCtxInfo?.bids_number as number > 0) {
    //         console.log(`\tBIDS number: ${ordersCtxInfo?.bids_number}`);
    //         console.log(`\tBIDS:`)
    //         let bidsCtxKeys = ordersCtxInfo?.bids.keys() as bigint[]
    //         let bidsCtxValues = ordersCtxInfo?.bids.values() as orderInfoType[]
    //         for (let jter: number = 0; jter < (ordersCtxInfo?.bids_number as number); jter += 1) {
    //             console.log(`\t\tBID ${jter + 1}:`)
    //             console.log("\t\t\t[ BID ID ]: ", bidsCtxKeys[jter])
    //             console.log("\t\t\t[ user address ]: ", getAddress(bidsCtxValues[jter].stdAddr).toString())
    //             console.log("\t\t\t[ user ASK volume ]: ", Number(bidsCtxValues[jter].orderAmount) / 10 ** 9, "SOXO\n")
    //         }
    //     }
    // }
}