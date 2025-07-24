import { sign } from "@ton/crypto";
import { Opcodes } from './includes/OpCodes';
import { Address, beginCell, Builder, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type JettonWalletConfig = {
    status: number
    balance: number
    owner: Address;
    minter: Address;
    walletCode: Cell;
};

export type WalletData = {
    balance: bigint;
    ownerAddress: Address;
    jettonMasterAddress: Address;
    jettonWalletCode: Cell;
};

export function jettonWalletConfigToCell(config: JettonWalletConfig): Cell {
    return beginCell()
        .storeUint(config.status, 4)
        .storeCoins(config.balance)
        .storeAddress(config.owner)
        .storeAddress(config.minter)
        .storeRef(config.walletCode)
        .endCell();
}

export class JettonWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new JettonWallet(address);
    }

    static createFromConfig(config: JettonWalletConfig, code: Cell, workchain = 0) {
        const data = jettonWalletConfigToCell(config);
        const init = { code, data };
        return new JettonWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendTransfer(provider: ContractProvider, via: Sender,
        opts: {
            value: bigint,
            qi: bigint,
            jettonAmount: bigint
            forwardTONAmount: bigint,
            recipientAddress: Address,
            forwardPayload: Cell | null,
            secretKey: Buffer,
        }
    ) {
        let msgBody: Builder =                 
            beginCell()
                .storeUint(0xf8a7ea5, 32)
                .storeUint(opts.qi, 64)
                .storeCoins(opts.jettonAmount)
                .storeAddress(opts.recipientAddress)
                .storeUint(0, 2)
                .storeUint(0, 1)
                .storeCoins(opts.forwardTONAmount);
        
        if (opts.forwardPayload != null) {
            let baseBody = opts.forwardPayload;
            
            const signature: Buffer = sign(baseBody.hash(), opts.secretKey)

            msgBody.storeBit(1).storeRef(
                beginCell()
                    .storeRef(baseBody)
                    .storeBuffer(signature)
                .endCell()
            )

        } else {
            msgBody.storeBit(0)
        }

        
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            value : opts.value + opts.forwardTONAmount,
            body: msgBody.endCell()

        });
    }

    async sendBurn(
        provider: ContractProvider,
        via: Sender,
        address: Address,
        value: bigint,
        amount: bigint
    ) {
        await provider.internal(via, {
            value: value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(Opcodes.burn, 32)
                    .storeUint(0, 64)
                    .storeCoins(amount)
                    .storeAddress(address)
                .endCell()
        });
    }

    async getJettonBalance(provider: ContractProvider) {
        let state = await provider.getState();
        if (state.state.type !== 'active') {
            return 0n;
        }
        let res = await provider.get('get_wallet_data', []);
        return res.stack.readBigNumber();
    }

    async getStatus(provider: ContractProvider) {
        let res = await provider.get('get_status', []);
        return res.stack.readBigNumber();
    }

    async getWalletData(provider: ContractProvider): Promise<WalletData> {
        let res = await provider.get('get_wallet_data', []);
        return {
            balance: res.stack.readBigNumber(),
            ownerAddress: res.stack.readAddress(),
            jettonMasterAddress: res.stack.readAddress(),
            jettonWalletCode: res.stack.readCell(),
        };
    }

}