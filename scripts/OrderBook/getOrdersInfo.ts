import dotenv from 'dotenv';
import { Address, beginCell, Cell, Dictionary, DictionaryValue } from '@ton/core';
import { OrderBook } from '../../wrappers/OrderBook';
import {  NetworkProvider } from '@ton/blueprint';


dotenv.config();
const ORDER_BOOK_ADDRESS = process.env.ORDER_BOOK_ADDRESS as string;

export type orderInfoType = {
    orderAmount: bigint; 
}

export const orderDictionaryValue: DictionaryValue<orderInfoType> = {
    serialize(src, builder) {    
        builder.storeCoins(src.orderAmount);
    },

    parse(src) {
        return {
            orderAmount: src.loadCoins(),
        }
    },
}


export type asksBidsInfoType = {
    asks: Dictionary<bigint, orderInfoType>;
    asks_number: number;
    bids: Dictionary<bigint, orderInfoType>;
    bids_number: number;
}

export const asksBidsDictionaryValue: DictionaryValue<asksBidsInfoType> = {
    serialize(src, builder) {    
        builder.storeDict(src.asks);
        builder.storeUint(src.asks_number, 32)
        builder.storeDict(src.bids);
        builder.storeUint(src.bids_number, 32)
    },

    parse(src) {
        return {
            asks: src.loadDict(Dictionary.Keys.BigUint(256), orderDictionaryValue),
            asks_number: src.loadUint(32),
            bids: src.loadDict(Dictionary.Keys.BigUint(256), orderDictionaryValue),
            bids_number: src.loadUint(32)
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

    console.log(pordersDict.keys())
    // for (let iter: number = 0; iter < pordersDict.size; iter++) {

    // }
}


// npx blueprint run --custom https://testnet.toncenter.com/api/v2/jsonRPC --custom-version v2 --custom-type testnet --custom-key 30b11a3740db2af63eb14f5c72c2e2e91a0913f7ed0b6cd74aa213679ac29d41 --mnemonic OrderBook/getPrices
