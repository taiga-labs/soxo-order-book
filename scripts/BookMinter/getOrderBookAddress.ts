import dotenv from 'dotenv';
import { Address, Cell } from '@ton/core';
import { BookMinter } from '../../wrappers/BookMinter';
import {  NetworkProvider } from '@ton/blueprint';

dotenv.config();
const BOOK_MINTER_ADDRESS = process.env.BOOK_MINTER_ADDRESS as string;

const OWNER_ADDRESS: string = ""
const JETTON_ADDRESS: string = ""

export async function run(provider: NetworkProvider) {
    const bookMinter = provider.open(BookMinter.createFromAddress(Address.parse(BOOK_MINTER_ADDRESS)));
    const orderBookAddress: Address = await bookMinter.getOrderBookAddress({
        ownerAddress: Address.parse(OWNER_ADDRESS),
        jettonAddress: Address.parse(JETTON_ADDRESS)
    })
    console.log("[ orderBookAddress ]:", orderBookAddress)
}
