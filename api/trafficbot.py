import asyncio
import aiohttp
import random
import logging
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TrafficBot:
    def __init__(self):
        self.status = "stopped"
        self.base_urls = [
            "https://arielmatrix-ai-ljrp-p2c6aq9qu-briannwzks-projects.vercel.app/opportunities",
            "https://arielmatrix-ai-ljrp-p2c6aq9qu-briannwzks-projects.vercel.app/deals"
        ]
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15"
        ]
        self.accept_languages = ["en-US,en;q=0.9", "en-GB,en;q=0.8", "fr-FR,fr;q=0.9"]
        self.ad_networks = ['infolinks', 'viglink', 'adsense']

    async def get_monetized_urls(self):
        urls = []
        try:
            async with aiohttp.ClientSession() as session:
                for network in self.ad_networks:
                    response = await session.post('/api/cosmoweb3db', json={
                        'action': 'find',
                        'collection': 'apikeys',
                        'query': {'service': network}
                    })
                    keys = (await response.json())['results']
                    for key in keys:
                        urls.append(f"{self.base_urls[0]}?network={network}&key={key['apiKey']}")
        except Exception as e:
            logger.error(f"Failed to fetch monetized URLs: {str(e)}")
        return urls or self.base_urls

    async def start(self):
        self.status = "running"
        async with aiohttp.ClientSession() as session:
            logger.info("TrafficBot started")
            while self.status == "running":
                urls = await self.get_monetized_urls()
                for url in urls:
                    try:
                        headers = {
                            "User-Agent": random.choice(self.user_agents),
                            "Accept-Language": random.choice(self.accept_languages),
                            "Referer": random.choice(["https://google.com", "https://x.com"])
                        }
                        async with session.get(url, headers=headers) as response:
                            if response.status == 200:
                                logger.info(f"Visited {url}")
                                await session.post('/api/cosmoweb3db', json={
                                    'action': 'insert',
                                    'collection': 'traffic',
                                    'data': {'url': url, 'timestamp': datetime.now().isoformat(), 'country': headers['Accept-Language'].split(',')[0]}
                                })
                            else:
                                logger.error(f"Failed to visit {url}: {response.status}")
                        await asyncio.sleep(random.uniform(0.3, 1.5))
                    except Exception as e:
                        logger.error(f"TrafficBot error for {url}: {str(e)}")
                await asyncio.sleep(5)
            logger.info("TrafficBot stopped")

    async def stop(self):
        self.status = "stopped"
        logger.info("TrafficBot stopped")

traffic_bot = TrafficBot()

class TrafficRequest(BaseModel):
    action: str

@app.post("/api/trafficbot")
async def handle_traffic(request: TrafficRequest):
    if request.action == "start":
        if traffic_bot.status != "running":
            asyncio.create_task(traffic_bot.start())
            return {"status": "TrafficBot started"}
        return {"status": "TrafficBot already running"}
    elif request.action == "stop":
        await traffic_bot.stop()
        return {"status": "TrafficBot stopped"}
