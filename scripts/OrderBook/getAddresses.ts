import dotenv from 'dotenv';
import { Address, Cell } from '@ton/core';
import { OrderBook } from '../../wrappers/OrderBook';
import {  NetworkProvider } from '@ton/blueprint';

dotenv.config();
const ORDER_BOOK_ADDRESS = process.env.ORDER_BOOK_ADDRESS as string;

export async function run(provider: NetworkProvider) {
    const orderBook = provider.open(OrderBook.createFromAddress(Address.parse(ORDER_BOOK_ADDRESS)));
    const addresses: [ Address, Address, Address, Address, Address ] = await orderBook.getAddresses()
    console.log("[ owner_address ]:", addresses[0])
    console.log("[ admin_address ]:", addresses[1])
    console.log("[ book_minter_address ]:", addresses[2])

    console.log("[ usdt_master_address ]:", addresses[3])
    console.log("[ soxo_master_address ]:", addresses[4])
}
