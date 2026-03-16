from fastapi import WebSocket
from typing import Dict, List

class Text_Websocket_manager():
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
            


class VoiceWebsocketManager:
    def __init__(self):
        self.voice_channels: Dict[int, List[WebSocket]] = {}

    async def connect(self, channel_id: int, websocket: WebSocket):
        await websocket.accept()
        self.voice_channels.setdefault(channel_id, []).append(websocket)

    def disconnect(self, channel_id: int, websocket: WebSocket):
        channel_connections = self.voice_channels.get(channel_id)
        if not channel_connections:
            return

        if websocket in channel_connections:
            channel_connections.remove(websocket)

        # Keep the mapping clean when the last participant leaves.
        if not channel_connections:
            self.voice_channels.pop(channel_id, None)

    async def forward_signal(self, channel_id: int, sender: WebSocket, message: dict):
        for ws in list(self.voice_channels.get(channel_id, [])):
            if ws is sender:
                continue

            try:
                await ws.send_json(message)
            except Exception:
                # Drop stale/broken sockets so future broadcasts remain healthy.
                self.disconnect(channel_id, ws)


# Backward-compatible alias for existing imports.
Voice_websocket_manager = VoiceWebsocketManager
