import { Opcodes } from './includes/OpCodes';
import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';


export type MinterConfig = {
    totalSupply: bigint;
    adminAddress: Address;
    transferAdminAddress: Address;
    managerAddress: Address;
    jettonWalletCode: Cell;
    MinterContnet: Cell;
    FactoryAddress: Address;
};

export function minterConfigToCell(config: MinterConfig): Cell {
    return (
        beginCell()
            .storeCoins(config.totalSupply)
            .storeAddress(config.adminAddress)
            .storeAddress(config.transferAdminAddress)
            .storeAddress(config.managerAddress)
            .storeRef(config.jettonWalletCode)
            .storeRef(config.MinterContnet)
            .storeRef(
                beginCell()
                    .storeAddress(config.FactoryAddress)
                .endCell()
            )
        .endCell()
    );
};

export type jettonData = {
    totalSupply: bigint;
    flag: number;
    adminAddress: Address;
    buildContentCell: Cell;
    jettonWalletCode: Cell;
};


export class JettonMinter implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {};

    static createFromAddress(address: Address) {
        return new JettonMinter(address);
    };

    static createFromConfig(config: MinterConfig, code: Cell, workchain = 0) {
        const data = minterConfigToCell(config);
        const init = { code, data };
        return new JettonMinter(contractAddress(workchain, init), init);
    };

    static getStateInitFromConfig(config: MinterConfig, code: Cell, workchain = 0) {
        const data = minterConfigToCell(config);
        const init = { code, data };
        return init;
    };

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    };

    async sendUpgrade(provider: ContractProvider, via: Sender, 
        oprions: {
            value: bigint
            queryId: bigint
            newData: Cell
            newCode: Cell
        }
    ) {
        await provider.internal(via, {
            value: oprions.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(5, 32)
                    .storeUint(oprions.queryId, 64)
                    .storeRef(oprions.newData)
                    .storeRef(oprions.newCode)
                .endCell(),
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
                    .storeUint(21, 32)
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

    async sendCallToTransfer(
        provider: ContractProvider,
        via: Sender,
        fee: bigint,
        address: Address,
        amount: bigint,
        jettonAmount: bigint,
        toOwnerAddress: Address,
        responseAddress: Address,
        customPayload: Cell,
        forwardTonAmount: bigint,
        forwardPayloadFlag: bigint,
        forwardPayload: Cell
    ) {
        await provider.internal(via, {
            value: fee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(Opcodes.call_to, 32)
                    .storeUint(0, 64)
                    .storeAddress(address)
                    .storeCoins(amount)
                    .storeRef(
                        beginCell()
                            .storeUint(Opcodes.transfer, 32)
                            .storeUint(0, 64)
                            .storeCoins(jettonAmount)
                            .storeAddress(toOwnerAddress)
                            .storeAddress(responseAddress)
                            .storeMaybeRef(customPayload)
                            .storeCoins(forwardTonAmount)
                            .storeInt(forwardPayloadFlag, 1)
                            .storeRef(forwardPayload)
                        .endCell()
                    )
                .endCell()
        });

    };

    async sendCallToBurn(
        provider: ContractProvider,
        via: Sender,
        fee: bigint,
        address: Address,
        amount: bigint,
        jettonAmount: bigint,
        responseAddress: Address
    ) {
        await provider.internal(via, {
            value: fee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(Opcodes.call_to, 32)
                    .storeUint(0, 64)
                    .storeAddress(address)
                    .storeCoins(amount)
                    .storeRef(
                        beginCell()
                            .storeUint(Opcodes.burn, 32)
                            .storeUint(0, 64)
                            .storeCoins(jettonAmount)
                            .storeAddress(responseAddress)
                            .storeMaybeRef()
                        .endCell()
                    )
                .endCell()
        });

    };

    async sendCallToSetStatus(
        provider: ContractProvider,
        via: Sender,
        fee: bigint,
        address: Address,
        amount: bigint,
        new_status: bigint
    ) {
        await provider.internal(via, {
            value: fee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(Opcodes.call_to, 32)
                    .storeUint(0, 64)
                    .storeAddress(address)
                    .storeCoins(amount)
                    .storeRef(
                        beginCell()
                            .storeUint(Opcodes.set_status, 32)
                            .storeUint(0, 64)
                            .storeUint(new_status, 4)
                        .endCell()
                    )
                .endCell()
        });

    };

    async sendProvideWalletAddress(
        provider: ContractProvider,
        via: Sender,
        fee: bigint,
        address: Address,
        flag: number
    ) {
        await provider.internal(via, {
            value: fee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(Opcodes.provide_wallet_address, 32)
                    .storeUint(0, 64)
                    .storeAddress(address)
                    .storeUint(flag, 1)
                .endCell()
        });
    };

    async sendChangeAdmin(
        provider: ContractProvider,
        via: Sender,
        fee: bigint,
        address: Address
    ) {
        await provider.internal(via, {
            value: fee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(Opcodes.change_admin, 32)
                    .storeUint(0, 64)
                    .storeAddress(address)
                .endCell()
        });
    };


    async sendClaimAdmin(
        provider: ContractProvider,
        via: Sender,
        fee: bigint
    ) {
        await provider.internal(via, {
            value: fee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(Opcodes.claim_admin, 32)
                    .storeUint(0, 64)
                .endCell()
        });
    };

    async sendChangeManager(
        provider: ContractProvider,
        via: Sender,
        fee: bigint,
        address: Address
    ) {
        await provider.internal(via, {
            value: fee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: 
                beginCell()
                    .storeUint(Opcodes.change_manager, 32)
                    .storeUint(0, 64)
                    .storeAddress(address)
                .endCell()
        });
    };

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

    async getJettonManager(provider: ContractProvider): Promise<Address> {
        const res = await provider.get('get_jetton_manager', []);
        return res.stack.readAddress();
    };

    async getWalletAddress(provider: ContractProvider, owner: Address): Promise<Address> {
        const res = await provider.get('get_wallet_address', [{ type: 'slice', cell: beginCell().storeAddress(owner).endCell() }]);
        return res.stack.readAddress();
    };

}
