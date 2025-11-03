import dotenv from 'dotenv';
import { Address, beginCell, toNano } from '@ton/core';
import { OrderBook } from '../../wrappers/OrderBook';
import { compile, NetworkProvider } from '@ton/blueprint';

dotenv.config();
const ORDER_BOOK_ADDRESS = process.env.ORDER_BOOK_ADDRESS as string;



const TO_OWNER_ADDRESS = "UQCRCFxjEaauB2sVdeOvrXAkuYaHGxSg84NC5lLmMcIjovpb"

/// USDT
const ORDER_BOOK_JW_ADDRESS = "EQDr9CZVaPxIqqek1r3nJVEKx793_dXGDfJ8i-yNLmwbHqdr"
const JETTON_AMOUNT = 1.1 * 10**6

// FLOOR INDEX JETOON
// const ORDER_BOOK_JW_ADDRESS = "EQBr1yeEldw-zaSMMs2lKIsPCuQIFkUeVVYpA9XRVocoY9bk"
// const JETTON_AMOUNT = 0.000002732 * 10**9


export async function run(provider: NetworkProvider) {
    const orderBook = provider.open(OrderBook.createFromAddress(Address.parse(ORDER_BOOK_ADDRESS)));
    await orderBook.sendMakeTx(provider.sender(), {
        value: toNano('0.08'),
        qi: BigInt(Math.floor(Date.now() / 1000)),
        cell: 
            beginCell()  
                .storeUint(0x18, 6)
                .storeAddress(Address.parse(ORDER_BOOK_JW_ADDRESS))
                .storeCoins(toNano("0.04"))
                .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
                .storeUint(0xf8a7ea5, 32)
                .storeUint(BigInt(Math.floor(Date.now() / 1000)), 64)
                .storeCoins(JETTON_AMOUNT)
                .storeAddress(Address.parse(TO_OWNER_ADDRESS)) 
                .storeUint(0, 2)  
                .storeUint(0, 1)
                .storeCoins(0)   
                .storeUint(0, 1)
            .endCell()
    });
}
