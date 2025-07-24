import { toNano } from '@ton/core';
import { USDTJettonWallet } from '../wrappers/USDTJettonWallet';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const uSDTJettonWallet = provider.open(USDTJettonWallet.createFromConfig({}, await compile('USDTJettonWallet')));

    await uSDTJettonWallet.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(uSDTJettonWallet.address);

    // run methods on `uSDTJettonWallet`
}
