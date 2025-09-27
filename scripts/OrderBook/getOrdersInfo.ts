import dotenv from 'dotenv';
import { Address, beginCell, Cell, Dictionary, DictionaryValue } from '@ton/core';
import { OrderBook, porderQueuesType } from '../../wrappers/OrderBook';
import {  NetworkProvider } from '@ton/blueprint';


dotenv.config();
const ORDER_BOOK_ADDRESS = process.env.ORDER_BOOK_ADDRESS as string;

export type orderInfoType = {
    orderAmount: bigint; 
    addr: Address
    offerTsPrice: number
}

export const orderDictionaryValue: DictionaryValue<orderInfoType> = {
    serialize(src, builder) {    
        builder.storeCoins(src.orderAmount)
        builder.storeAddress(src.addr)
        builder.storeUint(src.offerTsPrice, 32)
    },
    parse(src) {
        return {
            orderAmount: src.loadCoins(),
            addr:  src.loadAddress(),
            offerTsPrice: src.loadUint(32),
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


export async function run(provider: NetworkProvider) {
    const orderBook = provider.open(OrderBook.createFromAddress(Address.parse(ORDER_BOOK_ADDRESS)));
    const porderQueues: Cell | null = await orderBook.getPorderQueues();

    let pordersDict = Dictionary.loadDirect(Dictionary.Keys.Uint(16), asksBidsDictionaryValue, porderQueues);


    for (let iter: number = 1; iter <= pordersDict.size; iter++) {
        console.log(`Priority ${iter}:`)
        let ordersCtxInfo = pordersDict.get(iter);
        
        if (ordersCtxInfo?.asks.size as number > 0) {
            console.log(`\tASKS:`)

            let asks: Dictionary<bigint, orderInfoType> = ordersCtxInfo?.asks as Dictionary<bigint, orderInfoType>
        
            let askIndex = 1;
            for (const [index, askInfo] of asks) {
                console.log(`\t\tASK ${askIndex}:`);
                console.log("\t\t\t[ index ]: ", index);
                console.log("\t\t\t[ user address ]: ", askInfo.addr.toString());
                console.log("\t\t\t[ user ASK OFFER PRICE ]: ", Number(askInfo.offerTsPrice) / 10 ** 4, "USDT FOR ONE INDEX");
                console.log("\t\t\t[ user ASK volume ]: ", Number(askInfo.orderAmount) / 10 ** 9, "USDT\n");
                askIndex++;
            }
        }

        if (ordersCtxInfo?.bids.size as number > 0) {
            console.log(`\tBIDS:`)
            let bids: Dictionary<bigint, orderInfoType> = ordersCtxInfo?.bids as Dictionary<bigint, orderInfoType>
           
           let bidIndex = 1;
            for (const [index, bidInfo] of bids) {
                console.log(`\t\tBID ${bidIndex}:`);
                console.log("\t\t\t[ index ]: ", index);
                console.log("\t\t\t[ user address ]: ", bidInfo.addr.toString());
                console.log("\t\t\t[ user ASK OFFER PRICE ]: ", Number(bidInfo.offerTsPrice) / 10 ** 4, "USDT FOR ONE INDEX");
                console.log("\t\t\t[ user BID volume ]: ", Number(bidInfo.orderAmount) / 10 ** 9, "INIDEX\n");
                bidIndex++;
            }
        }
    }
}
