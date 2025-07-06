import { sign } from "@ton/crypto";
import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type JettonFactoryConfig = {
    AdminPublicKey: Buffer;
    MinterCode: Cell;
    AdminAddress: Address;
    Seqno: bigint
};

export function jettonWalletConfigToCell(config: JettonFactoryConfig): Cell {
    return (
        beginCell()
            .storeBuffer(config.AdminPublicKey)
            .storeUint(config.Seqno, 32)
            .storeAddress(config.AdminAddress)
            .storeRef(config.MinterCode)
        .endCell()
    );
}

export class JettonFactory implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new JettonFactory(address);
    }

    static createFromConfig(config: JettonFactoryConfig, code: Cell, workchain = 0) {
        const data = jettonWalletConfigToCell(config);
        const init = { code, data };
        return new JettonFactory(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeployNewMinter(provider: ContractProvider, via: Sender, 
        options: {
            value: bigint,
            minterConfigCell: Cell,
            seqno: bigint,
            secretKey: Buffer,
            jettonAmountToMint: bigint
        }
    ) {

        const baseBody: Cell = 
            beginCell()
                .storeUint(42, 32)
                .storeUint(options.seqno, 32)
                .storeUint(options.jettonAmountToMint, 256)
                .storeRef(options.minterConfigCell)
            .endCell();

        const signature: Buffer = sign(baseBody.hash(), options.secretKey)

        await provider.internal(via, {
            value: options.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeRef(baseBody)
                    .storeBuffer(signature)
                .endCell(),
        });
    }

    async sendAdminButton(provider: ContractProvider, via: Sender, 
        options: {
            value: bigint;
            mode: number;
            payload: Cell;
        }
    ) {
        await provider.internal(via, {
            value: options.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(41, 32)
                    .storeRef(
                        beginCell()
                            .storeUint(options.mode, 8)
                            .storeRef(options.payload)
                        .endCell()
                    )
                .endCell(),
        });
    }

    async getFactoryData(provider: ContractProvider): Promise<[BigInt, BigInt, Address, Cell]> {
        const res = await provider.get('get_factory_data', []);
        return [
            res.stack.readBigNumber(),
            res.stack.readBigNumber(),
            res.stack.readAddress(),
            res.stack.readCell()
        ]
    };
}
