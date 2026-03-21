from fastapi import WebSocket
from typing import Any, Dict, List, Optional

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
        self.voice_participants: Dict[int, Dict[WebSocket, dict]] = {}

    async def connect(self, channel_id: int, websocket: WebSocket, participant: Optional[dict] = None):
        await websocket.accept()
        self.voice_channels.setdefault(channel_id, []).append(websocket)
        if participant is not None:
            self.voice_participants.setdefault(channel_id, {})[websocket] = participant

    def disconnect(self, channel_id: int, websocket: WebSocket):
        channel_connections = self.voice_channels.get(channel_id)
        participant = None
        if not channel_connections:
            return participant

        participant_map = self.voice_participants.get(channel_id)
        if participant_map and websocket in participant_map:
            participant = participant_map.pop(websocket)
            if not participant_map:
                self.voice_participants.pop(channel_id, None)

        if websocket in channel_connections:
            channel_connections.remove(websocket)

        # Keep the mapping clean when the last participant leaves.
        if not channel_connections:
            self.voice_channels.pop(channel_id, None)

        return participant

    def get_participants(self, channel_id: int) -> List[dict]:
        participants = self.voice_participants.get(channel_id, {})
        unique_by_user_id: Dict[Any, dict] = {}

        for participant in participants.values():
            user_id = participant.get("user_id")
            if user_id not in unique_by_user_id:
                unique_by_user_id[user_id] = participant

        return list(unique_by_user_id.values())

    async def broadcast(self, channel_id: int, message: dict, exclude: Optional[WebSocket] = None):
        for ws in list(self.voice_channels.get(channel_id, [])):
            if exclude is not None and ws is exclude:
                continue

            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(channel_id, ws)

    async def forward_signal(self, channel_id: int, sender: WebSocket, message: dict):
        await self.broadcast(channel_id, message, exclude=sender)



class DMWebSocketManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        user_connections = self.active_connections.setdefault(user_id, [])
        if websocket not in user_connections:
            user_connections.append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                self.active_connections.pop(user_id, None)

    async def send_to_user(self, user_id: int, message: dict):
        for ws in list(self.active_connections.get(user_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(user_id, ws)


class NotificationManager:
    def __init__(self):
        self.connections = {}  

    async def connect(self, user_id, websocket):
        await websocket.accept()
        self.connections[user_id] = websocket

    def disconnect(self, user_id):
        self.connections.pop(user_id, None)

    async def send(self, user_id, data):
        if user_id in self.connections:
            await self.connections[user_id].send_json(data)


notification_manager = NotificationManager()