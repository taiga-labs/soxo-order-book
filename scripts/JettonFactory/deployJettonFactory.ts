import { Address, toNano } from '@ton/core';
import { JettonFactory } from '../../wrappers/JettonFactory';
import { compile, NetworkProvider } from '@ton/blueprint';
import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";


const ADMIN_ADDRESS: string = "0QANsjLvOX2MERlT4oyv2bSPEVc9lunSPIs5a1kPthCXydUX";


export async function run(provider: NetworkProvider) {

    let mnemonics = await mnemonicNew();
    let keyPair = await mnemonicToPrivateKey(mnemonics);
    
    console.log(mnemonics)

    const jettonFactory = provider.open(JettonFactory.createFromConfig({
        AdminPublicKey: keyPair.publicKey,
        Seqno: 0n,
        AdminAddress: Address.parse(ADMIN_ADDRESS),
        MinterCode: await compile("Minter"),
    }, await compile('JettonFactory')));

    await jettonFactory.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(jettonFactory.address, 20);
}