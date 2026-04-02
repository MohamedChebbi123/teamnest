from datetime import datetime, timedelta, timezone

from fastapi import WebSocket
from typing import Any, Dict, List, Optional
import asyncio

class Text_Websocket_manager():
    def __init__(self):
        self.channels: Dict[int, List[WebSocket]] = {}

    async def connect(self, channel_id: int, websocket: WebSocket):
        await websocket.accept()
        channel_connections = self.channels.setdefault(channel_id, [])
        if websocket not in channel_connections:
            channel_connections.append(websocket)

    def disconnect(self, channel_id: int, websocket: WebSocket):
        channel_connections = self.channels.get(channel_id)
        if not channel_connections:
            return

        if websocket in channel_connections:
            channel_connections.remove(websocket)

        if not channel_connections:
            self.channels.pop(channel_id, None)

    async def broadcast(self, channel_id: int, message: dict, exclude: Optional[WebSocket] = None):
        for ws in list(self.channels.get(channel_id, [])):
            if exclude is not None and ws is exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(channel_id, ws)



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


class ConnectivityManager:
    def __init__(self):
        self.connections: Dict[int, List[WebSocket]] = {}
        self.last_seen: Dict[int, datetime] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        user_connections = self.connections.setdefault(user_id, [])
        if websocket not in user_connections:
            user_connections.append(websocket)
        self.last_seen[user_id] = datetime.now(timezone.utc)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.connections:
            if websocket in self.connections[user_id]:
                self.connections[user_id].remove(websocket)
            if not self.connections[user_id]:
                self.connections.pop(user_id, None)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.connections and len(self.connections[user_id]) > 0

    async def send(self, user_id: int, data: dict):
        for ws in list(self.connections.get(user_id, [])):
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(user_id, ws)

    async def broadcast(self, user_ids: List[int], data: dict):
        for user_id in user_ids:
            await self.send(user_id, data)


connectivity_manager = ConnectivityManager()









async def cleanup_task(db_factory):
    while True:
        now = datetime.now(timezone.utc)
        timeout = timedelta(seconds=60)

        for user_id in list(connectivity_manager.last_seen.keys()):
            last = connectivity_manager.last_seen[user_id]
            if now - last > timeout:
                dead_sockets = connectivity_manager.connections.pop(user_id, [])
                connectivity_manager.last_seen.pop(user_id, None)

                for ws in dead_sockets:
                    try:
                        await ws.close()
                    except Exception:
                        pass

                db = next(db_factory())
                try:
                    from models.Friends import Friends
                    from sqlalchemy import or_
                    rows = db.query(Friends).filter(
                        or_(Friends.user_id == user_id, Friends.friend_id == user_id)
                    ).all()
                    friend_ids = [
                        r.friend_id if r.user_id == user_id else r.user_id
                        for r in rows
                    ]
                finally:
                    db.close()

                await connectivity_manager.broadcast(
                    friend_ids, {"type": "user_offline", "user_id": user_id}
                )

        await asyncio.sleep(10)