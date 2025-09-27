import dotenv from 'dotenv';
import { toNano, Address, Cell, beginCell } from '@ton/core';
import { USDTJettonWallet } from '../../wrappers/USDTJettonWallet';
import { NetworkProvider } from '@ton/blueprint';
import { mnemonicToPrivateKey } from "@ton/crypto";
import { OrderBook } from '../../wrappers/OrderBook';
import { USDTJettonMinter } from '../../wrappers/USDTJettonMinter';

dotenv.config();
const USER_ADDRESS = process.env.USER_ADDRESS as string;
const USDT_MASTER_ADDRESS = process.env.USDT_MASTER_ADDRESS as string;
const ORDER_BOOK_ADDRESS = process.env.ORDER_BOOK_ADDRESS as string;
const ORDER_BOOK_ADMIN_MNEMONIC = process.env.ORDER_BOOK_ADMIN_MNEMONIC as string;

const PRIORITY: number = 1;
const USDT_AMOUNT: number = 1;

const TSP_DIVIDER: number = 10000;

// Цена, которую климент выбирает в UI, цена должна быть внутри текущего диапазона цен
const PRICE_WITHIN_RANGE: number = 0.6;

export async function run(provider: NetworkProvider) {
    
    const orderBook = provider.open(OrderBook.createFromAddress(Address.parse(ORDER_BOOK_ADDRESS)));

    let mnemonics: string[] = ORDER_BOOK_ADMIN_MNEMONIC.split(" ")
    let keyPair = await mnemonicToPrivateKey(mnemonics);
    let seqno = await orderBook.getSeqno()
    
    const usdtMinter = provider.open(USDTJettonMinter.createFromAddress(Address.parse(USDT_MASTER_ADDRESS)));
    const addr = await usdtMinter.getWalletAddress(Address.parse(USER_ADDRESS))

    const userJettonWallet = provider.open(USDTJettonWallet.createFromAddress(addr));

    await userJettonWallet.sendTransfer(provider.sender(), {
        value: toNano("0.15"),
        qi: BigInt(Math.floor(Date.now() / 1000)),
        jettonAmount: BigInt(USDT_AMOUNT * 10**6),
        recipientAddress: Address.parse(ORDER_BOOK_ADDRESS),
        forwardTONAmount: toNano("0.1"),
        forwardPayload: (
            beginCell()
                .storeUint(seqno, 32)
                .storeUint(0x845746, 32)
                .storeUint(PRIORITY, 16) 
                .storeUint(PRICE_WITHIN_RANGE * TSP_DIVIDER, 32)
            .endCell()
        ),
        secretKey: keyPair.secretKey,
    })
}
