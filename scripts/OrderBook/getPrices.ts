import dotenv from 'dotenv';
import { Address, Cell } from '@ton/core';
import { OrderBook } from '../../wrappers/OrderBook';
import {  NetworkProvider } from '@ton/blueprint';

dotenv.config();
const ORDER_BOOK_ADDRESS = process.env.ORDER_BOOK_ADDRESS as string;

const TSP_DIVIDER: bigint = 1000000n;

export async function run(provider: NetworkProvider) {
    const orderBook = provider.open(OrderBook.createFromAddress(Address.parse(ORDER_BOOK_ADDRESS)));
    const prices: [ bigint, bigint, bigint, bigint ] = await orderBook.getPrices()
    
    console.log("[ usdt_balance ]:", prices[0])
    console.log("[ index_jetton_balance ]:", prices[1])
    console.log("[ trading_session_price_min ]:", prices[2] / TSP_DIVIDER)
    console.log("[ trading_session_price_max ]:", prices[3] / TSP_DIVIDER)
}
