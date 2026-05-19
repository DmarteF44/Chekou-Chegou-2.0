class WebSocketStub {
  constructor() {
    throw new Error("Realtime WebSocket não está habilitado no app mobile.");
  }
}

module.exports = WebSocketStub;
module.exports.WebSocket = WebSocketStub;
