import dotenv from 'dotenv';
import { Address, Cell } from '@ton/core';
import { OrderBook } from '../../wrappers/OrderBook';
import {  NetworkProvider } from '@ton/blueprint';

dotenv.config();
const ORDER_BOOK_ADDRESS = process.env.ORDER_BOOK_ADDRESS as string;

export async function run(provider: NetworkProvider) {
    const orderBook = provider.open(OrderBook.createFromAddress(Address.parse(ORDER_BOOK_ADDRESS)));
    const seqno: number = await orderBook.getSeqno()
    
    console.log("[ seqno ]:", seqno)
}
