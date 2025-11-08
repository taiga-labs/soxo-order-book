import { toNano, address } from '@ton/core';
import { jettonData, JettonMinter } from '../../wrappers/JettonMinter';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {

    console.log('provider.sender().address', provider.sender().address);

    const minter = provider.open(JettonMinter.createFromAddress(address('EQDlGAkFtM_QhI3I3OyMiAG4px-5hUNCt8YEx6Ncfttrl59q')));

    const j: jettonData = await minter.getJettonData();

    console.log(j.totalSupply)
    console.log(j.flag)
    console.log(j.adminAddress)
    // console.log(j.buildContentCell)
    // console.log(j.jettonWalletCode)


}
