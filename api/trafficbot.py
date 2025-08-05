from fastapi import FastAPI
import aiohttp
import asyncio
import logging

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TrafficBot:
    def __init__(self):
        self.status = "stopped"
        self.session = None
        self.urls = [
            "https://arielmatrix-ai-ljrp-p2c6aq9qu-briannwzks-projects.vercel.app/opportunities",
            "https://arielmatrix-ai-ljrp-p2c6aq9qu-briannwzks-projects.vercel.app/deals"
        ]

    async def start(self):
        self.status = "running"
        self.session = aiohttp.ClientSession()
        logger.info("TrafficBot started")
        while self.status == "running":
            for url in self.urls:
                try:
                    async with self.session.get(url, headers={'User-Agent': 'Mozilla/5.0'}) as response:
                        if response.status == 200:
                            logger.info(f"Visited {url}")
                    await asyncio.sleep(1)  # Simulate human-like delay
                except Exception as e:
                    logger.error(f"TrafficBot error for {url}: {str(e)}")
            await asyncio.sleep(60)  # Wait before next cycle

    async def stop(self):
        self.status = "stopped"
        if self.session:
            await self.session.close()
        logger.info("TrafficBot stopped")

traffic_bot = TrafficBot()

@app.post("/api/trafficbot")
async def handle_trafficbot(request: dict):
    action = request.get("action")
    if action == "start":
        asyncio.create_task(traffic_bot.start())
        return {"status": "running"}
    elif action == "stop":
        await traffic_bot.stop()
        return {"status": "stopped"}
    return {"error": "Invalid action"}
