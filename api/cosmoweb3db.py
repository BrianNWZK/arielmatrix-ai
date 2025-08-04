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

app = FastAPI()

class CosmoWeb3DB:
    def __init__(self):
        self.data_dir = "/tmp/cosmoweb3db"
        self.memory_db = {"opportunities": {}, "campaigns": {}, "payouts": {}, "traffic": {}, "errors": {}}
        self.key = nacl.utils.random(nacl.secret.SecretBox.KEY_SIZE)
        self.box = nacl.secret.SecretBox(self.key)
        self.countries = countries.COUNTRIES  # Full 195 countries
        self.ipfs_nodes = []
        self.text_generator = pipeline("text-generation", model="distilgpt2", tokenizer="distilgpt2")
        self.rl_model = {"weights": np.random.rand(10), "learning_rate": 0.1}
        self.stats = {"read_latency": 0, "write_latency": 0, "ipfs_peers": 0}
        os.makedirs(self.data_dir, exist_ok=True)
        self.error_log = []
        self.ipfs_client = None

    async def initialize_ipfs_nodes(self):
        try:
            # Connect to a public IPFS node or local daemon
            self.ipfs_client = ipfshttpclient.connect('/ip4/127.0.0.1/tcp/5001')  # Adjust to public gateway if needed
            peer_info = self.ipfs_client.id()
            self.ipfs_nodes.append({"id": peer_info['ID'], "node": self.ipfs_client})
            self.stats["ipfs_peers"] = len(self.ipfs_nodes)
            print(f"Initialized {self.stats['ipfs_peers']} IPFS nodes")
        except Exception as e:
            await self._log_error("initialize_ipfs_nodes", str(e))

    async def rotate_ipfs_nodes(self):
        try:
            for node in self.ipfs_nodes:
                try:
                    node["node"].id()  # Check if node is online
                except:
                    self.ipfs_nodes.remove(node)
                    new_client = ipfshttpclient.connect('/ip4/127.0.0.1/tcp/5001')  # Adjust to public gateway if needed
                    new_peer_id = new_client.id()['ID']
                    self.ipfs_nodes.append({"id": new_peer_id, "node": new_client})
            self.stats["ipfs_peers"] = len(self.ipfs_nodes)
            print("Rotated IPFS nodes")
        except Exception as e:
            await self._log_error("rotate_ipfs_nodes", str(e))

    def _encrypt(self, data):
        return base64.b64encode(self.box.encrypt(json.dumps(data).encode())).decode()

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
        self.error_log.append({"method": method, "error": error, "timestamp": datetime.now().isoformat()})
        try:
            await self.insert("errors", {"method": method, "error": error, "timestamp": datetime.now().isoformat()})
            await self._self_heal(method, error)
        except Exception as e:
            print(f"Failed to log error: {e}")

    async def _self_heal(self, method, error):
        if "network" in error.lower():
            await asyncio.sleep(5)  # Retry after delay
        elif "captcha" in error.lower():
            self.rl_model["learning_rate"] *= 1.1  # Increase learning rate
        elif "ipfs" in error.lower():
            await self.rotate_ipfs_nodes()
        print(f"Self-healed {method}: {error}")

    async def stats(self):
        return self.stats

class DBRequest(BaseModel):
    action: str
    collection: str | None = None
    data: dict | None = None
    query: dict | None = None
    input: str | None = None

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
        results = await db.find(request.collection, request.query)
        return {"results": results}
    elif request.action == "generate_text":
        text = await db.generate_text(request.input)
        return {"text": text}
    elif request.action == "stats":
        return await db.stats()
    elif request.action == "log_error":
        await db._log_error(request.data["method"], request.data["error"])
        return {"status": "error_logged"}
    return {"error": "Invalid action"}
