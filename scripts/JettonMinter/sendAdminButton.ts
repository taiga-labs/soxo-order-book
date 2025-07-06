import { Address, beginCell, toNano } from '@ton/core';
import { JettonFactory } from '../../wrappers/JettonFactory';
import { NetworkProvider } from '@ton/blueprint';

const TO_ADDRESS: string = "0QANsjLvOX2MERlT4oyv2bSPEVc9lunSPIs5a1kPthCXydUX"
const TON_AMOUNT_TO_WITHDRAW: number = 0.5;

const JETTON_FACTORY_ADDRESS: string = "EQDv-meb2iGtJAPOrV8ghUcIqhn5r3HN-G7HBmu7l0eayQIn";

export async function run(provider: NetworkProvider) {
    const jettonFactory = provider.open(JettonFactory.createFromAddress(Address.parse(JETTON_FACTORY_ADDRESS)));

    await jettonFactory.sendAdminButton(provider.sender(), {
        value: toNano("0.015"),
        mode: 1,
        payload:
            beginCell()
                .storeUint(0x18, 6)
                .storeAddress(Address.parse(TO_ADDRESS))
                .storeCoins(toNano(TON_AMOUNT_TO_WITHDRAW) + toNano("0.015"))
                .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .endCell()
    })
}