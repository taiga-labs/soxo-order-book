import dotenv from 'dotenv';
import { Address, toNano } from '@ton/core';
import { OrderBook } from '../../wrappers/OrderBook';
import { compile, NetworkProvider } from '@ton/blueprint';
import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";

dotenv.config();
const ORDER_BOOK_ADDRESS = process.env.ORDER_BOOK_ADDRESS as string;
const ORDER_BOOK_ADMIN_MNEMONIC = process.env.ORDER_BOOK_ADMIN_MNEMONIC as string;


const BID_ID: number = 1;
const ASK_ID: number = 2;

export async function run(provider: NetworkProvider) {
    const orderBook = provider.open(OrderBook.createFromAddress(Address.parse(ORDER_BOOK_ADDRESS)));

    let mnemonics: string[] = ORDER_BOOK_ADMIN_MNEMONIC.split(" ")
    let keyPair = await mnemonicToPrivateKey(mnemonics);
    let seqno = await orderBook.getSeqno()
    
    await orderBook.sendCancelOrder(provider.sender(), {
        value: toNano('0.5'),
        qi: BigInt(Math.floor(Date.now() / 1000)),
        secretKey: keyPair.secretKey,
        seqno: seqno,
        priority: 1,
        orderType: BID_ID,
        userAddress: provider.sender().address as Address
    });
}
