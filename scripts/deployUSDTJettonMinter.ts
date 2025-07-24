import { toNano } from '@ton/core';
import { USDTJettonMinter } from '../wrappers/USDTJettonMinter';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const uSDTJettonMinter = provider.open(USDTJettonMinter.createFromConfig({}, await compile('USDTJettonMinter')));

    await uSDTJettonMinter.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(uSDTJettonMinter.address);

    // run methods on `uSDTJettonMinter`
}
