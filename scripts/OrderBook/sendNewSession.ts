import dotenv from 'dotenv';
import { Address, toNano } from '@ton/core';
import { OrderBook } from '../../wrappers/OrderBook';
import { compile, NetworkProvider } from '@ton/blueprint';

dotenv.config();
const ORDER_BOOK_ADDRESS = process.env.ORDER_BOOK_ADDRESS as string;

const TSP_DIVIDER: bigint = 10000n;

export async function run(provider: NetworkProvider) {
    const orderBook = provider.open(OrderBook.createFromAddress(Address.parse(ORDER_BOOK_ADDRESS)));
    await orderBook.sendNewSession(provider.sender(), {
        value: toNano('0.01'),
        qi: BigInt(Math.floor(Date.now() / 1000)),
        newTradingSessionPriceMin: 1n * TSP_DIVIDER,
        newTradingSessionPriceMax: 2n * TSP_DIVIDER
    });
}
