import dotenv from 'dotenv';
import { Address, Cell } from '@ton/core';
import { BookMinter } from '../../wrappers/BookMinter';
import {  NetworkProvider } from '@ton/blueprint';

dotenv.config();
const BOOK_MINTER_ADDRESS = process.env.BOOK_MINTER_ADDRESS as string;



export async function run(provider: NetworkProvider) {
    const bookMinter = provider.open(BookMinter.createFromAddress(Address.parse(BOOK_MINTER_ADDRESS)));
    const bookMinterData: [Address, Address, Address, Cell, Cell, Cell] = await bookMinter.getBookMinterData()

    console.log("[ admin_address ]:", bookMinterData[0])
    console.log("[ usdt_master_address ]:", bookMinterData[1])
    console.log("[ order_books_admin_address ]:", bookMinterData[2])
  
    // console.log("[ order_book_code ]:", bookMinterData[3].toString())
    // console.log("[ usdt_wallet_code ]:", bookMinterData[4].toString())
    // console.log("[ soxo_channel_wallet_code ]:", bookMinterData[5].toString())
}
