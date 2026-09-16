import json
from typing import Dict, List, Set, Any
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # match_id -> set of WebSocket connections
        self.match_rooms: Dict[str, Set[WebSocket]] = {}
        self.global_connections: Set[WebSocket] = set()

    async def connect_match(self, websocket: WebSocket, match_id: str):
        await websocket.accept()
        if match_id not in self.match_rooms:
            self.match_rooms[match_id] = set()
        self.match_rooms[match_id].add(websocket)

    def disconnect_match(self, websocket: WebSocket, match_id: str):
        if match_id in self.match_rooms:
            self.match_rooms[match_id].discard(websocket)
            if not self.match_rooms[match_id]:
                del self.match_rooms[match_id]

    async def broadcast_match_event(self, match_id: str, event_type: str, data: Any):
        """Broadcast real-time state changes to all clients viewing this match."""
        if match_id in self.match_rooms:
            payload = json.dumps({"type": event_type, "data": data})
            dead_sockets = set()
            for connection in self.match_rooms[match_id]:
                try:
                    await connection.send_text(payload)
                except Exception:
                    dead_sockets.add(connection)
            for dead in dead_sockets:
                self.match_rooms[match_id].discard(dead)

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_connections.add(websocket)

    def disconnect_global(self, websocket: WebSocket):
        self.global_connections.discard(websocket)

    async def broadcast_global(self, event_type: str, data: Any):
        payload = json.dumps({"type": event_type, "data": data})
        dead_sockets = set()
        for connection in self.global_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                dead_sockets.add(connection)
        for dead in dead_sockets:
            self.global_connections.discard(dead)


ws_manager = ConnectionManager()
