
import { sha256_sync } from '@ton/crypto'
import { Dictionary, beginCell, Cell } from '@ton/core';

export function toSha256(s: string): bigint {
    return BigInt('0x' + sha256_sync(s).toString('hex'))
}

export function toTextCell(s: string): Cell {
    return beginCell().storeUint(0, 8).storeStringTail(s).endCell()
}

export type jettonMinterContent = {
    name: string;
    description: string;
    symbol: string;
    decimals: string;
    image: string;
}

export function buildjettonMinterContentCell(content: jettonMinterContent): Cell {
    const itemContentDict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        .set(toSha256("name"), toTextCell(content.name))
        .set(toSha256("description"), toTextCell(content.description))
        .set(toSha256("symbol"), toTextCell(content.symbol))
        .set(toSha256("decimals"), toTextCell(content.decimals))
        .set(toSha256("image"), toTextCell(content.image))
        
    return (
        beginCell()
            .storeUint(0, 8)
            .storeDict(itemContentDict)
        .endCell()
    ); 
}