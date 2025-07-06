import dotenv from 'dotenv';
import { Address, Cell } from '@ton/core';
import { BookMinter } from '../../wrappers/BookMinter';
import {  NetworkProvider } from '@ton/blueprint';

dotenv.config();
const BOOK_MINTER_ADDRESS = process.env.BOOK_MINTER_ADDRESS as string;

const OWNER_ADDRESS: string = "0QANsjLvOX2MERlT4oyv2bSPEVc9lunSPIs5a1kPthCXydUX"
const JETTON_ADDRESS: string = "kQC24kevB6A7P_ZJe5Hp4rWzDafJfNgm4tTZpaNjMEO-odge"

export async function run(provider: NetworkProvider) {
    const bookMinter = provider.open(BookMinter.createFromAddress(Address.parse(BOOK_MINTER_ADDRESS)));
    const orderBookAddress: Address = await bookMinter.getOrderBookAddress({
        ownerAddress: Address.parse(OWNER_ADDRESS),
        jettonAddress: Address.parse(JETTON_ADDRESS)
    })
    console.log("[ orderBookAddress ]:", orderBookAddress)
}
