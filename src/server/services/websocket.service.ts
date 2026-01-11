import type { ServerEvent } from "../../types";

export class WebSocketService {
  private clients = new Set<unknown>();

  addClient(ws: unknown) {
    this.clients.add(ws);
  }

  removeClient(ws: unknown) {
    this.clients.delete(ws);
  }

  broadcast(event: ServerEvent) {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      const ws = client as { readyState: number; send: (data: string) => void };
      if (ws.readyState === 1) { // WebSocket.OPEN = 1
        ws.send(payload);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
