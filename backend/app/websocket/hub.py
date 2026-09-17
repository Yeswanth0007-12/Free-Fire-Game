import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketHub:
    def __init__(self):
        # Channel -> Set of WebSockets (e.g. "matches", "match:{id}", "user:{user_id}")
        self.channels: Dict[str, Set[WebSocket]] = {}
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, channel: str = "global"):
        await websocket.accept()
        self.active_connections.add(websocket)
        if channel not in self.channels:
            self.channels[channel] = set()
        self.channels[channel].add(websocket)
        logger.debug(f"Client connected to channel: {channel}. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, channel: Optional[str] = None):
        self.active_connections.discard(websocket)
        if channel and channel in self.channels:
            self.channels[channel].discard(websocket)
        else:
            for ch in list(self.channels.keys()):
                self.channels[ch].discard(websocket)
        logger.debug(f"Client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, channel: str, event_type: str, data: Dict[str, Any]):
        message = json.dumps({
            "event": event_type,
            "channel": channel,
            "data": data,
        })
        targets = self.channels.get(channel, set())
        # Also broadcast global channel listeners
        all_targets = set(targets).union(self.channels.get("global", set()))

        dead_sockets = []
        for ws in all_targets:
            try:
                await ws.send_text(message)
            except Exception as e:
                logger.warning(f"Error sending message to client: {e}")
                dead_sockets.append(ws)

        for ws in dead_sockets:
            self.disconnect(ws)


hub = WebSocketHub()
