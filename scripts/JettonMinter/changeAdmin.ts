import { toNano, address } from '@ton/core';
import { JettonMinter } from '../../wrappers/JettonMinter';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {

    console.log('provider.sender().address', provider.sender().address);

    const minter = provider.open(JettonMinter.createFromAddress(address('EQCCR5CbsztSlbc1ifGDZesWc5n_sOWxm-33yWJHwPvHiLID')));

    await minter.sendChangeAdmin(
        provider.sender(), // sender
        toNano(0.1), // fee
        address('UQDWfTV0XtuUrRYF8BqOm1U2yr3axYlpvxxnGXyx2nwIys7y') // new Admin address (transfer_admin_address)
    );

}
