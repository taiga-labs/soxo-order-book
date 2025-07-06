import { Address, Cell } from '@ton/core';
import { JettonFactory } from '../../wrappers/JettonFactory';
import { NetworkProvider } from '@ton/blueprint';


const JETTON_FACTORY_ADDRESS: string = "EQDS-1224M-4A03wjIQ-9OPm1GAi9FpaBG0LQNEeIUFF3BLF";

export async function run(provider: NetworkProvider) {
    const jettonFactory = provider.open(JettonFactory.createFromAddress(Address.parse(JETTON_FACTORY_ADDRESS)));

    const result: [BigInt, BigInt, Address, Cell] = await jettonFactory.getFactoryData();
    
    console.log("pubkey: ", result[0])
    console.log("seqno: ", result[1])
    console.log("admin_address: ", result[2])
    // console.log("minter_code: ", result[3])
}