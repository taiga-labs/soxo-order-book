import dotenv from 'dotenv';
import { toNano, Address, Cell, beginCell } from '@ton/core';
import { JettonWallet } from '../../wrappers/JettonWallet';
import { NetworkProvider } from '@ton/blueprint';


dotenv.config();
const USDT_JETTON_WALLET_ADDRESS = process.env.USDT_JETTON_WALLET_ADDRESS as string;
const ORDER_BOOK_ADDRESS = process.env.ORDER_BOOK_ADDRESS as string;

const PRIORITY: number = 1;
const USDT_AMOUNT: bigint = 2n;

export async function run(provider: NetworkProvider) {
    const userJettonWallet = provider.open(JettonWallet.createFromAddress(Address.parse(USDT_JETTON_WALLET_ADDRESS)));
    await userJettonWallet.sendTransfer(provider.sender(), {
        value: toNano("0.15"),
        qi: BigInt(Math.floor(Date.now() / 1000)),
        jettonAmount: USDT_AMOUNT * 10n**6n,
        recipientAddress: Address.parse(ORDER_BOOK_ADDRESS),
        forwardTONAmount: toNano("0.065"),
        forwardPayload: (
            beginCell()
                .storeUint(0x845746, 32)
                .storeUint(PRIORITY, 16) 
            .endCell()
        )
    })
}
