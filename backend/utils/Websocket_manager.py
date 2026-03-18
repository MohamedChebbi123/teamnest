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


# Backward-compatible alias for existing imports.
Voice_websocket_manager = VoiceWebsocketManager
