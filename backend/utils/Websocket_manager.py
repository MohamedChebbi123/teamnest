from fastapi import WebSocket
from typing import Dict, List

class Websocket_manager():
    def __init__(self):
        self.channels: Dict[int, List[WebSocket]] = {}

    async def connect(self, channel_id: int, websocket: WebSocket):
        await websocket.accept()
        self.channels.setdefault(channel_id, []).append(websocket)

    def disconnect(self, channel_id: int, websocket: WebSocket):
        if channel_id in self.channels and websocket in self.channels[channel_id]:
            self.channels[channel_id].remove(websocket)

    async def broadcast(self, channel_id: int, message: dict):
        for ws in self.channels.get(channel_id, []):
            await ws.send_json(message)