import dotenv from 'dotenv';
import { Address, toNano } from '@ton/core';
import { BookMinter } from '../../wrappers/BookMinter';
import { compile, NetworkProvider } from '@ton/blueprint';
import { mnemonicToPrivateKey } from "@ton/crypto";
import { JettonMinter } from '../../wrappers/JettonMinter';
import { USDTJettonMinter } from '../../wrappers/USDTJettonMinter';
import { OrderBook } from '../../wrappers/OrderBook';

const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS as string;
const BOOK_MINTER_ADDRESS = process.env.BOOK_MINTER_ADDRESS as string;
const INDEX_MASTER_ADDRESS = process.env.INDEX_MASTER_ADDRESS as string;
const USDT_MASTER_ADDRESS = process.env.USDT_MASTER_ADDRESS as string;
const ORDER_BOOK_ADMIN_MNEMONIC = process.env.ORDER_BOOK_ADMIN_MNEMONIC as string;

export async function run(provider: NetworkProvider) {
    const bookMinter = provider.open(BookMinter.createFromAddress(Address.parse(BOOK_MINTER_ADDRESS)));
    
    let mnemonics: string[] = ORDER_BOOK_ADMIN_MNEMONIC.split(" ")
    let keyPair = await mnemonicToPrivateKey(mnemonics);

    const indexMinter = provider.open(JettonMinter.createFromAddress(Address.parse(INDEX_MASTER_ADDRESS)));
    const usdtMinter = provider.open(USDTJettonMinter.createFromAddress(Address.parse(USDT_MASTER_ADDRESS)));

    const orderBook = provider.open(OrderBook.createFromConfig({
        ffreeze: -1,
        owner_address: provider.sender().address as  Address,
        admin_address: Address.parse(ADMIN_ADDRESS),
        book_minter_address: Address.parse(BOOK_MINTER_ADDRESS)
    }, await compile("OrderBook")))

    let indexWallerAddress = await indexMinter.getWalletAddress(orderBook.address)
    let usdtWalletAddress = await usdtMinter.getWalletAddress(orderBook.address)

    await bookMinter.sendDeployOrderBook(provider.sender(), {
        value: toNano("0.05"),
        qi: BigInt(Math.floor(Date.now() / 1000)),
        indexJettonMasterAddress: Address.parse(INDEX_MASTER_ADDRESS),
        adminPbk: keyPair.publicKey,
        indexWallerAddressOB: indexWallerAddress,
        usdtWalletAddressOB: usdtWalletAddress,
    });
}
