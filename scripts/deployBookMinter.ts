import { toNano } from '@ton/core';
import { BookMinter } from '../wrappers/BookMinter';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const bookMinter = provider.open(BookMinter.createFromConfig({}, await compile('BookMinter')));

    await bookMinter.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(bookMinter.address);

    // run methods on `bookMinter`
}
