import dotenv from 'dotenv';
import { Address, toNano, Cell } from '@ton/core';
import { BookMinter } from '../../wrappers/BookMinter';
import { compile, NetworkProvider } from '@ton/blueprint';

const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS as string;
const SOXO_WALLET_HEX_CODE = process.env.SOXO_WALLET_HEX_CODE as string;
const USDT_MASTER_ADDRESS = process.env.USDT_MASTER_ADDRESS as string;

export async function run(provider: NetworkProvider) {
    const bookMinter = provider.open(BookMinter.createFromConfig({
        adminAddress: Address.parse(ADMIN_ADDRESS),
        usdtMasterAddres: Address.parse(USDT_MASTER_ADDRESS),
        orderBooksAdminAddress: Address.parse(ADMIN_ADDRESS),

        orderBookCode:  await compile("OrderBook"),

        usdtWalletCode: Cell.fromHex(SOXO_WALLET_HEX_CODE),
        soxoChannelWalletCode: Cell.fromHex(SOXO_WALLET_HEX_CODE)
    }, await compile('BookMinter')));

    await bookMinter.sendDeploy(provider.sender(), toNano("0.05"));
    await provider.waitForDeploy(bookMinter.address);
}
