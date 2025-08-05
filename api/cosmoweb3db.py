import os
import json
import logging
from fastapi import FastAPI
from pydantic import BaseModel
from web3 import Web3
import aiohttp
import torch
from torch.distributions import Categorical

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# BSC and USDT configuration
bsc_url = "https://bsc-dataseed.binance.org/"
web3 = Web3(Web3.HTTPProvider(bsc_url))
wallet_address = "0x04eC5979f05B76d334824841B8341AFdD78b2aFC"
private_key = os.getenv("VITE_BSC_PRIVATE_KEY")
usdt_contract_address = "0x55d398326f99059ff775485246999027b3197955"
paymaster_url = "https://api.trustwallet.com/flexgas/v1/paymaster"
backup_paymaster = "https://backup.trustwallet.com/flexgas/v1/paymaster"

# USDT ABI
usdt_abi = [
    {"constant": False, "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "approve", "outputs": [], "type": "function"},
    {"constant": False, "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "transfer", "outputs": [], "type": "function"},
    {"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"}
]

usdt_contract = web3.eth.contract(address=usdt_contract_address, abi=usdt_abi)

class TransferRequest(BaseModel):
    action: str
    collection: str | None = None
    data: dict | None = None
    query: dict | None = None
    to_address: str | None = None
    amount: float | None = None

class GasOptimizer:
    def __init__(self):
        self.model = torch.nn.Sequential(
            torch.nn.Linear(3, 64), torch.nn.ReLU(),
            torch.nn.Linear(64, 32), torch.nn.ReLU(),
            torch.nn.Linear(32, 3)
        )
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=0.01)

    def optimize_gas(self, balance, gas_price, amount):
        inputs = torch.tensor([balance, gas_price, amount], dtype=torch.float32)
        logits = self.model(inputs)
        dist = Categorical(logits=logits)
        return dist.sample().item()

gas_optimizer = GasOptimizer()

async def check_paymaster():
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(paymaster_url + "/health") as response:
                return response.status == 200
        except:
            async with session.get(backup_paymaster + "/health") as response:
                return response.status == 200

async def approve_usdt(spender, amount):
    try:
        nonce = web3.eth.get_transaction_count(wallet_address)
        tx = usdt_contract.functions.approve(web3.toChecksumAddress(spender), int(amount * 1e18)).build_transaction({
            "from": wallet_address,
            "nonce": nonce,
            "gas": 100000,
            "gasPrice": web3.eth.gas_price
        })
        signed_tx = web3.eth.account.sign_transaction(tx, private_key)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        return web3.eth.wait_for_transaction_receipt(tx_hash)
    except Exception as e:
        logger.error(f"USDT approval failed: {str(e)}")
        raise

async def insert_data(collection, data):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post('/api/cosmoweb3db', json={
                'action': 'insert',
                'collection': collection,
                'data': data
            }) as response:
                if response.status != 200:
                    logger.error(f"Failed to insert data into {collection}")
    except Exception as e:
        logger.error(f"Insert data error: {str(e)}")

@app.post("/api/cosmoweb3db")
async def handle_request(request: TransferRequest):
    if request.action == "transfer_usdt_with_flexgas":
        try:
            amount = request.amount * 1e18
            balance = usdt_contract.functions.balanceOf(wallet_address).call()
            if balance < amount:
                logger.error("Insufficient USDT balance")
                return {"error": "Insufficient USDT balance"}
            
            await approve_usdt("0xPaymasterAddress", request.amount)
            gas_strategy = gas_optimizer.optimize_gas(balance / 1e18, web3.eth.gas_price / 1e9, request.amount)
            gas_limit = [100000, 150000, 200000][gas_strategy]
            
            if not await check_paymaster():
                logger.error("Paymaster unavailable")
                return {"error": "Paymaster unavailable"}
            
            nonce = web3.eth.get_transaction_count(wallet_address)
            tx = usdt_contract.functions.transfer(web3.toChecksumAddress(request.to_address), int(amount)).build_transaction({
                "from": wallet_address,
                "nonce": nonce,
                "gas": gas_limit,
                "gasPrice": web3.eth.gas_price
            })
            signed_tx = web3.eth.account.sign_transaction(tx, private_key)
            tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
            await insert_data('payouts', {
                'to_address': request.to_address,
                'amount': request.amount,
                'tx_hash': tx_hash.hex(),
                'timestamp': datetime.now().isoformat()
            })
            logger.info(f"Transfer successful: {tx_hash.hex()}")
            return {"tx_hash": tx_hash.hex(), "status": "success"}
        except Exception as e:
            logger.error(f"Transfer failed: {str(e)}")
            return {"error": str(e)}
    elif request.action == "insert":
        await insert_data(request.collection, request.data)
        return {"status": "inserted"}
    elif request.action == "find":
        return {"results": []}  # Simplified for brevity
    return {"error": "Invalid action"}
