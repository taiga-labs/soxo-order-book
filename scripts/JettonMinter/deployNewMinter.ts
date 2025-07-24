import { Address, beginCell, Cell, toNano } from '@ton/core';
import { JettonFactory } from '../../wrappers/JettonFactory';
import { minterConfigToCell, MinterConfig } from '../../wrappers/JettonMinter';
import { NetworkProvider, compile } from '@ton/blueprint';
import { mnemonicToPrivateKey } from "@ton/crypto";
import { buildjettonMinterContentCell } from '../../helpers/metadata';


const ADMIN_ADDRESS: string = "0QANsjLvOX2MERlT4oyv2bSPEVc9lunSPIs5a1kPthCXydUX";
const TOTAL_SUPPLY: bigint = 1_000_000_000n * 10n**9n

const JETTON_FACTORY_ADDRESS: string = "EQDv-meb2iGtJAPOrV8ghUcIqhn5r3HN-G7HBmu7l0eayQIn";

export async function run(provider: NetworkProvider) {

    let mnemonics: string[] = [
        'express', 'object',   'boring',
        'give',    'that',     'drastic',
        'kind',    'stereo',   'adapt',
        'lazy',    'shoulder', 'three',
        'boil',    'rice',     'cup',
        'air',     'sick',     'joke',
        'raw',     'dust',     'face',
        'win',     'easy',     'ball'
    ]

    // let mnemonics: string[] = "cushion unaware clump garbage soap recipe manual garment sorry mass raccoon punch pony rifle amazing grant panda casino indoor suspect alien orient thought vault".split(" ")

    let keyPair = await mnemonicToPrivateKey(mnemonics);

    const jettonFactory = provider.open(JettonFactory.createFromAddress(Address.parse(JETTON_FACTORY_ADDRESS)));

    const INDEX_CONFIG: MinterConfig = {
        totalSupply: 0n,                                            
        managerAddress: Address.parse(ADMIN_ADDRESS),
        MinterContnet: buildjettonMinterContentCell({                              
            image: "https://i.ibb.co/gr4gGrs/image.png",
            decimals: "9",
            name: "TEST INDEX Channel",
            symbol: "TTINDEX",
            description: "Test INDEX Channel Jetton description"
        }),
        adminAddress: Address.parse(ADMIN_ADDRESS),          
        transferAdminAddress: Address.parse(ADMIN_ADDRESS),
        jettonWalletCode: await compile('JettonWallet'),
        FactoryAddress: jettonFactory.address
    }

    const minterConfigCell: Cell = minterConfigToCell(INDEX_CONFIG)

    await jettonFactory.sendDeployNewMinter(provider.sender(), {
        value: toNano('0.7'),
        seqno: 0n,
        minterConfigCell: minterConfigCell,
        secretKey: keyPair.secretKey,
        jettonAmountToMint: TOTAL_SUPPLY
    });
}
