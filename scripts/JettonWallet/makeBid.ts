import dotenv from 'dotenv';
import { toNano, Address, Cell, beginCell } from '@ton/core';
import { JettonWallet } from '../../wrappers/JettonWallet';
import { NetworkProvider } from '@ton/blueprint';


dotenv.config();
const SOXO_JETTON_WALLET_ADDRESS = "kQDtHQpf8d9cI1Sq1ZOYvlJNvSZiGZNmiGL5ngh1ebGwLp2a"
const ORDER_BOOK_ADDRESS = process.env.ORDER_BOOK_ADDRESS as string;

// 1 !!!
const PRIORITY: number = 1;
const SOXO_AMOUNT = 12;

export async function run(provider: NetworkProvider) {
    const userJettonWallet = provider.open(JettonWallet.createFromAddress(Address.parse(SOXO_JETTON_WALLET_ADDRESS)));
    await userJettonWallet.sendTransfer(provider.sender(), {
        value: toNano("0.15"),
        qi: BigInt(Math.floor(Date.now() / 1000)),
        jettonAmount: BigInt(SOXO_AMOUNT * 10**9),
        recipientAddress: Address.parse(ORDER_BOOK_ADDRESS),
        forwardTONAmount: toNano("0.1"),
        forwardPayload: (
            beginCell()
                .storeUint(0xbf4385, 32)
                .storeUint(PRIORITY, 16) 
            .endCell()
        )
    })
}
