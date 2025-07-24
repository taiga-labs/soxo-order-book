import dotenv from 'dotenv';
import { Address, toNano, Cell } from '@ton/core';
import { BookMinter } from '../../wrappers/BookMinter';
import { compile, NetworkProvider } from '@ton/blueprint';
import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";

const BOOK_MINTER_ADDRESS = process.env.BOOK_MINTER_ADDRESS as string;
const SOXO_MASTER_ADDRESS = process.env.SOXO_MASTER_ADDRESS as string;
const ORDER_BOOK_ADMIN_MNEMONIC = process.env.ORDER_BOOK_ADMIN_MNEMONIC as string;

export async function run(provider: NetworkProvider) {
    const bookMinter = provider.open(BookMinter.createFromAddress(Address.parse(BOOK_MINTER_ADDRESS)));

    let mnemonics: string[] = ORDER_BOOK_ADMIN_MNEMONIC.split(" ")

    let keyPair = await mnemonicToPrivateKey(mnemonics);

    await bookMinter.sendDeployOrderBook(provider.sender(), {
        value: toNano("0.05"),
        qi: BigInt(Math.floor(Date.now() / 1000)),
        soxoJettonMasterAddress: Address.parse(SOXO_MASTER_ADDRESS),
        adminPbk: keyPair.publicKey,
    });
}
