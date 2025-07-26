import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { jettonData } from './JettonMinter';

export type USDTJettonMinterConfig = {
    totalSupply: bigint;
    adminAddress: Address;
    nextAdminAddress: Address;
    jettonWalletCode: Cell;
    metadataURI: Cell;
};


export function uSDTJettonMinterConfigToCell(config: USDTJettonMinterConfig): Cell {
    return (
        beginCell()
            .storeCoins(config.totalSupply)
            .storeAddress(config.adminAddress)
            .storeAddress(config.nextAdminAddress)
            .storeRef(config.jettonWalletCode)
            .storeRef(config.metadataURI)
        .endCell()
    )
}

export class USDTJettonMinter implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new USDTJettonMinter(address);
    }

    static createFromConfig(config: USDTJettonMinterConfig, code: Cell, workchain = 0) {
        const data = uSDTJettonMinterConfigToCell(config);
        const init = { code, data };
        return new USDTJettonMinter(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMint(provider: ContractProvider, via: Sender, 
        oprions: {
            value: bigint
            queryId: bigint
            toAddress: Address
            tonAmount: bigint
            jettonAmountToMint: bigint
            fromAddress: Address
        }
    ) {
        await provider.internal(via, {
            value: oprions.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(0x642b7d07, 32)
                    .storeUint(oprions.queryId, 64)
                    .storeAddress(oprions.toAddress)
                    .storeCoins(oprions.tonAmount)
                    .storeRef(
                        beginCell()
                            .storeUint(0x178d4519, 32)
                            .storeUint(oprions.queryId, 64)
                            .storeCoins(oprions.jettonAmountToMint)
                            .storeAddress(oprions.fromAddress)
                            .storeUint(0, 2) // null response address
                            .storeCoins(0)   // null forward ton amount
                            .storeUint(0, 1) // null forward payload
                        .endCell()
                    )
                .endCell(),
        });
    }

    async getJettonData(provider: ContractProvider): Promise<jettonData> {
        const { stack } = await provider.get('get_jetton_data', []);
        return {
            totalSupply: stack.readBigNumber(),
            flag: stack.readNumber(),
            adminAddress: stack.readAddress(),
            buildContentCell: stack.readCell(),
            jettonWalletCode: stack.readCell()
        };
    };
    
    async getWalletAddress(provider: ContractProvider, owner: Address): Promise<Address> {
        const res = await provider.get('get_wallet_address', [{ type: 'slice', cell: beginCell().storeAddress(owner).endCell() }]);
        return res.stack.readAddress();
    };
}
