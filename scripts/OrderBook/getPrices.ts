import dotenv from 'dotenv';
import { Address, Cell } from '@ton/core';
import { OrderBook } from '../../wrappers/OrderBook';
import {  NetworkProvider } from '@ton/blueprint';

dotenv.config();
const ORDER_BOOK_ADDRESS = process.env.ORDER_BOOK_ADDRESS as string;

const TSP_DIVIDER: number = 10000;

export async function run(provider: NetworkProvider) {
    const orderBook = provider.open(OrderBook.createFromAddress(Address.parse(ORDER_BOOK_ADDRESS)));
    const prices: [ bigint, bigint, number, number ] = await orderBook.getPrices()
    
    console.log("[ usdt_balance ]:", Number(prices[0])  / 10 ** 6)
    console.log("[ index_jetton_balance ]:", Number(prices[1])  / 10 ** 9)
    console.log("[ trading_session_price_min ]:", prices[2] / TSP_DIVIDER)
    console.log("[ trading_session_price_max ]:", prices[3] / TSP_DIVIDER)
}
