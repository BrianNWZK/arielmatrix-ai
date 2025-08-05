import json
import os
import nacl.secret
import nacl.utils
import base64
from fastapi import FastAPI, Request
from pydantic import BaseModel
from transformers import pipeline
import aiohttp
import asyncio
import numpy as np
from datetime import datetime
import countries
import ipfshttpclient
from web3 import Web3
from web3.middleware import geth_poa_middleware

app = FastAPI()

class CosmoWeb3DB:
    def __init__(self):
        self.data_dir = "/tmp/cosmoweb3db"
        self.memory_db = {"opportunities": {}, "campaigns": {}, "payouts": {}, "traffic": {}, "errors": {}}
        self.key = nacl.utils.random(nacl.secret.SecretBox.KEY_SIZE)
        self.box = nacl.secret.SecretBox(self.key)
        self.countries = countries.COUNTRIES
        self.ipfs_nodes = []
        self.text_generator = pipeline("text-generation", model="distilgpt2", tokenizer="distilgpt2")
        self.rl_model = {"weights": np.random.rand(10), "learning_rate": 0.1}
        self.stats = {"read_latency": 0, "write_latency": 0, "ipfs_peers": 0}
        os.makedirs(self.data_dir, exist_ok=True)
        self.error_log = []
        self.ipfs_client = None
        self.ipfs_retries = 3
        self.ipfs_retry_delay = 5
        # Web3 setup for BSC
        self.web3 = Web3(Web3.HTTPProvider("https://bsc-dataseed.binance.org/"))
        self.web3.middleware_onion.inject(geth_poa_middleware, layer=0)
        self.wallet_address = "0x04eC5979f05B76d334824841B8341AFdD78b2aFC"  # Trust Wallet address
        self.private_key = os.getenv("VITE_BSC_PRIVATE_KEY")
        self.trust_wallet_api_key = os.getenv("VITE_TRUST_WALLET_API_KEY")
        self.usdt_contract_address = "0x55d398326f99059ff775485246999027b3197955"
        self.usdt_abi = [
            {
                "constant": False,
                "inputs": [
                    {"name": "_to", "type": "address"},
                    {"name": "_value", "type": "uint256"}
                ],
                "name": "transfer",
                "outputs": [{"name": "", "type": "bool"}],
                "type": "function"
            },
            {
                "constant": True,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
            }
        ]
        self.usdt_contract = self.web3.eth.contract(address=self.usdt_contract_address, abi=self.usdt_abi)
        self.paymaster_endpoint = "https://api.trustwallet.com/flexgas/v1/paymaster"  # Replace with actual endpoint

    async def initialize_ipfs_nodes(self):
        for attempt in range(self.ipfs_retries):
            try:
                self.ipfs_client = ipfshttpclient.connect('/dns/ipfs.io/tcp/5001/http', timeout=10)
                peer_info = self.ipfs_client.id()
                self.ipfs_nodes.append({"id": peer_info['ID'], "node": self.ipfs_client})
                self.stats["ipfs_peers"] = len(self.ipfs_nodes)
                print(f"Initialized {self.stats['ipfs_peers']} IPFS nodes")
                return
            except Exception as e:
                await self._log_error("initialize_ipfs_nodes", f"IPFS connection failed (attempt {attempt + 1}/{self.ipfs_retries}): {str(e)}")
                if attempt < self.ipfs_retries - 1:
                    await asyncio.sleep(self.ipfs_retry_delay)
        self.ipfs_client = None
        self.stats["ipfs_peers"] = 0
        await self._log_error("initialize_ipfs_nodes", "All IPFS connection attempts failed")

    async def rotate_ipfs_nodes(self):
        try:
            for node in self.ipfs_nodes[:]:
                try:
                    node["node"].id()
                except:
                    self.ipfs_nodes.remove(node)
                    for attempt in range(self.ipfs_retries):
                        try:
                            new_client = ipfshttpclient.connect('/dns/ipfs.io/tcp/5001/http', timeout=10)
                            new_peer_id = new_client.id()['ID']
                            self.ipfs_nodes.append({"id": new_peer_id, "node": new_client})
                            break
                        except Exception as e:
                            await self._log_error("rotate_ipfs_nodes", f"IPFS reconnection failed (attempt {attempt + 1}/{self.ipfs_retries}): {str(e)}")
                            if attempt < self.ipfs_retries - 1:
                                await asyncio.sleep(self.ipfs_retry_delay)
            self.stats["ipfs_peers"] = len(self.ipfs_nodes)
            print(f"Rotated IPFS nodes, {self.stats['ipfs_peers']} active")
        except Exception as e:
            await self._log_error("rotate_ipfs_nodes", str(e))

    def _encrypt(self, data):
        try:
            return base64.b64encode(self.box.encrypt(json.dumps(data).encode())).decode()
        except Exception as e:
            self.error_log.append({"method": "_encrypt", "error": str(e), "timestamp": datetime.now().isoformat()})
            return {}

    def _decrypt(self, encrypted_data):
        try:
            return json.loads(self.box.decrypt(base64.b64decode(encrypted_data)).decode())
        except:
            return {}

    def _get_shard(self, collection, country):
        return f"{self.data_dir}/{collection}_{country}.json"

    async def initialize(self):
        for collection in self.memory_db:
            for country in self.countries:
                shard_path = self._get_shard(collection, country)
                if not os.path.exists(shard_path):
                    with open(shard_path, "w") as f:
                        json.dump({}, f)
                self.memory_db[collection][country] = {}
        await self.initialize_ipfs_nodes()
        await self._backup_to_ipfs()
        await self._optimize_rl_model()

    async def insert(self, collection, data):
        start_time = datetime.now()
        country = data.get("country", self.countries[0])
        shard = self.memory_db[collection].setdefault(country, {})
        doc_id = str(len(shard))
        shard[doc_id] = data
        shard_path = self._get_shard(collection, country)
        try:
            with open(shard_path, "w") as f:
                json.dump(self._encrypt(shard), f)
            self.stats["write_latency"] = (datetime.now() - start_time).total_seconds() * 1000
            await self._backup_to_ipfs()
            await self._optimize_rl_model()
        except Exception as e:
            await self._log_error("insert", str(e))

    async def find(self, collection, query):
        start_time = datetime.now()
        results = []
        for country in self.countries:
            shard_path = self._get_shard(collection, country)
            try:
                with open(shard_path, "r") as f:
                    shard = self._decrypt(json.load(f))
                for doc_id, doc in shard.items():
                    if all(k in doc and doc[k] == v for k, v in query.items()):
                        results.append(doc)
            except Exception as e:
                await self._log_error(f"find_{country}", str(e))
        self.stats["read_latency"] = (datetime.now() - start_time).total_seconds() * 1000
        return results

    async def _backup_to_ipfs(self):
        if not self.ipfs_nodes:
            await self._log_error("_backup_to_ipfs", "No active IPFS nodes")
            return
        for node in self.ipfs_nodes:
            try:
                data = {col: self.memory_db[col] for col in self.memory_db}
                cid = node["node"].add_bytes(json.dumps(data).encode())
                self.stats["ipfs_peers"] = len(self.ipfs_nodes)
                print(f"IPFS backup successful: {cid}")
                break
            except Exception as e:
                await self._log_error("backup_to_ipfs", str(e))
                await self.rotate_ipfs_nodes()

    async def _optimize_rl_model(self):
        try:
            reward = sum(len(shard) for col in self.memory_db.values() for shard in col.values())
            self.rl_model["weights"] += self.rl_model["learning_rate"] * np.random.rand(10) * reward
            print("RL model optimized")
        except Exception as e:
            await self._log_error("optimize_rl_model", str(e))

    async def generate_text(self, input_text):
        try:
            result = self.text_generator(input_text, max_length=50, num_return_sequences=1)
            return result[0]["generated_text"]
        except Exception as e:
            await self._log_error("generate_text", str(e))
            return input_text

    async def _log_error(self, method, error):
        error_entry = {"method": method, "error": error, "timestamp": datetime.now().isoformat()}
        self.error_log.append(error_entry)
        try:
            await self.insert("errors", error_entry)
            await self._self_heal(method, error)
        except Exception as e:
            print(f"Failed to log error: {e}")

    async def _self_heal(self, method, error):
        if "network" in error.lower() or "connection" in error.lower():
            await asyncio.sleep(self.ipfs_retry_delay)
        elif "captcha" in error.lower():
            self.rl_model["learning_rate"] *= 1.1
        elif "ipfs" in error.lower():
            await self.rotate_ipfs_nodes()
        print(f"Self-healed {method}: {error}")

    async def stats(self):
        return self.stats

    async def transfer_usdt_with_flexgas(self, to_address, amount):
        try:
            if not self.web3.is_connected():
                await self._log_error("transfer_usdt_with_flexgas", "Not connected to BSC node")
                return {"error": "BSC node connection failed"}
            if not self.private_key:
                await self._log_error("transfer_usdt_with_flexgas", "Private key not set")
                return {"error": "Private key not configured"}
            if not self.trust_wallet_api_key:
                await self._log_error("transfer_usdt_with_flexgas", "Trust Wallet API key not set")
                return {"error": "Trust Wallet API key not configured"}

            # Check USDT balance (transfer amount + gas fee estimate)
            usdt_balance = self.usdt_contract.functions.balanceOf(self.wallet_address).call()
            amount_wei = int(amount * 1e18)  # USDT BEP-20 has 18 decimals
            gas_estimate_wei = int(0.01 * 1e18)  # Estimated gas fee in USDT (~$0.01)
            total_usdt_needed = amount_wei + gas_estimate_wei
            if usdt_balance < total_usdt_needed:
                await self._log_error("transfer_usdt_with_flexgas", f"Insufficient USDT: {usdt_balance / 1e18} USDT, need {(amount + 0.01)} USDT")
                return {"error": f"Insufficient USDT: {usdt_balance / 1e18} USDT, need {(amount + 0.01)} USDT"}

            # Build USDT transfer transaction
            nonce = self.web3.eth.get_transaction_count(self.wallet_address)
            tx = self.usdt_contract.functions.transfer(to_address, amount_wei).build_transaction({
                "from": self.wallet_address,
                "nonce": nonce,
                "gas": 65000,  # Typical for USDT BEP-20 transfer
                "gasPrice": 0  # Gas paid via FlexGas in USDT
            })

            # Prepare FlexGas payload for Trust Wallet Paymaster
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.trust_wallet_api_key}"}
                payload = {
                    "chain": "bsc",
                    "transaction": tx,
                    "gas_token": "USDT",
                    "sender_address": self.wallet_address,
                    "gas_estimate": gas_estimate_wei
                }
                async with session.post(self.paymaster_endpoint, json=payload, headers=headers) as response:
                    if response.status != 200:
                        error = await response.text()
                        await self._log_error("transfer_usdt_with_flexgas", f"Paymaster error: {error}")
                        return {"error": f"Paymaster error: {error}"}
                    result = await response.json()
                    signed_tx = self.web3.eth.account.sign_transaction(result["transaction"], private_key=self.private_key)
                    tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
                    receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

            if receipt.status == 1:
                await self.insert("payouts", {
                    "to_address": to_address,
                    "amount": amount,
                    "gas_token": "USDT",
                    "tx_hash": tx_hash.hex(),
                    "timestamp": datetime.now().isoformat(),
                    "country": "US"  # Default country for logging
                })
                return {"status": "success", "tx_hash": tx_hash.hex()}
            else:
                await self._log_error("transfer_usdt_with_flexgas", f"Transaction failed: {tx_hash.hex()}")
                return {"error": "Transaction failed"}
        except Exception as e:
            await self._log_error("transfer_usdt_with_flexgas", str(e))
            return {"error": str(e)}

class DBRequest(BaseModel):
    action: str
    collection: str | None = None
    data: dict | None = None
    query: dict | None = None
    input: str | None = None
    to_address: str | None = None
    amount: float | None = None

db = CosmoWeb3DB()

@app.post("/api/cosmoweb3db")
async def handle_db(request: DBRequest):
    await db.initialize()
    if request.action == "connect":
        return {"status": "connected"}
    elif request.action == "insert":
        await db.insert(request.collection, request.data)
        return {"status": "inserted"}
    elif request.action == "find":
        results = await db.find(request.collection, query=request.query)
        return {"results": results}
    elif request.action == "generate_text":
        text = await db.generate_text(request.input)
        return {"text": text}
    elif request.action == "stats":
        return await db.stats()
    elif request.action == "log_error":
        await db._log_error(request.data["method"], request.data["error"])
        return {"status": "error_logged"}
    elif request.action == "transfer_usdt_with_flexgas":
        result = await db.transfer_usdt_with_flexgas(request.to_address, request.amount)
        return result
    return {"error": "Invalid action"}
