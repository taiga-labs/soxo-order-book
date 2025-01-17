import { toNano } from '@ton/core';
import { OrderBook } from '../wrappers/OrderBook';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const orderBook = provider.open(OrderBook.createFromConfig({}, await compile('OrderBook')));

    await orderBook.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(orderBook.address);

    // run methods on `orderBook`
}
