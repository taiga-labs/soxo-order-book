import dotenv from 'dotenv';
import { Address, toNano } from '@ton/core';
import { JettonMinter } from '../../wrappers/JettonMinter';
import { NetworkProvider } from '@ton/blueprint';

dotenv.config();
const JETTON_MINTER_ADDRESS = process.env.JETTON_MINTER_ADDRESS as string;

export async function run(provider: NetworkProvider) {

    const jettonMinter = provider.open(JettonMinter.createFromAddress(Address.parse(JETTON_MINTER_ADDRESS)));
    await jettonMinter.sendMint(provider.sender(), {
        value: toNano('0.08'),
        queryId: BigInt(Math.floor(Date.now() / 1000)),
        toAddress: Address.parse("UQCRBV1EyQn6PYz7yQPqwYdfzkXc1TmgGD7DIVSu8vR_doI7"),
        tonAmount: toNano('0.05'),
        jettonAmountToMint: 1n * 10n**9n,
        fromAddress: Address.parse(JETTON_MINTER_ADDRESS)
    });

}
