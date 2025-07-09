import dotenv from 'dotenv';
import { Address, toNano, Cell } from '@ton/core';
import { BookMinter } from '../../wrappers/BookMinter';
import { compile, NetworkProvider } from '@ton/blueprint';

const BOOK_MINTER_ADDRESS = process.env.BOOK_MINTER_ADDRESS as string;
const SOXO_MASTER_ADDRESS = process.env.SOXO_MASTER_ADDRESS as string;

export async function run(provider: NetworkProvider) {
    const bookMinter = provider.open(BookMinter.createFromAddress(Address.parse(BOOK_MINTER_ADDRESS)));

    await bookMinter.sendDeployOrderBook(provider.sender(), {
        value: toNano("0.05"),
        qi: BigInt(Math.floor(Date.now() / 1000)),
        soxoJettonMasterAddress: Address.parse(SOXO_MASTER_ADDRESS),
    });
}
