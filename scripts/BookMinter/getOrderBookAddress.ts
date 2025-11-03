import dotenv from 'dotenv';
import { Address, Cell } from '@ton/core';
import { BookMinter } from '../../wrappers/BookMinter';
import {  NetworkProvider } from '@ton/blueprint';

dotenv.config();
const BOOK_MINTER_ADDRESS = process.env.BOOK_MINTER_ADDRESS as string;

const OWNER_ADDRESS: string = ""
const INDEX_MASTER_ADDRESS: string = ""

export async function run(provider: NetworkProvider) {
    const bookMinter = provider.open(BookMinter.createFromAddress(Address.parse(BOOK_MINTER_ADDRESS)));
    const orderBookAddress: Address = await bookMinter.getOrderBookAddress({
        ownerAddress: Address.parse(OWNER_ADDRESS),
        indexMasterAddress: Address.parse(INDEX_MASTER_ADDRESS)
    })
    console.log("[ orderBookAddress ]:", orderBookAddress)
}
