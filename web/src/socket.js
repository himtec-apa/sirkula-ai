const WS_URL = (typeof window !== "undefined" && window.location?.hostname)
  ? `${window.location.protocol}//${window.location.hostname}:4000`
  : "http://localhost:4000";

let socket = null;
let isConnected = false;

export function isSocketConnected() {
  return isConnected;
}

export function initSocket(token, role) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  if (typeof window === "undefined" || typeof window.io !== "function") {
    return;
  }

  const auth = token ? { token } : {};
  socket = window.io(WS_URL, {
    auth,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    timeout: 5000
  });

  socket.on("connect", () => {
    isConnected = true;
    window.dispatchEvent(new CustomEvent("sirkula:ws-status", { detail: { connected: true } }));

    // Join appropriate rooms
    if (role) {
      socket.emit("join:room", `room:${role}`);
    }
    socket.emit("join:room", "room:COMMAND_CENTER");
    socket.emit("join:room", "room:TIER_1_HUB");
    socket.emit("join:room", "room:TIER_2_FARMER");
  });

  socket.on("connect_error", () => {
    isConnected = false;
    window.dispatchEvent(new CustomEvent("sirkula:ws-status", { detail: { connected: false } }));
  });

  socket.on("disconnect", () => {
    isConnected = false;
    window.dispatchEvent(new CustomEvent("sirkula:ws-status", { detail: { connected: false } }));
  });

  socket.on("batch:created", (payload) => {
    window.dispatchEvent(new CustomEvent("sirkula:batch-created", { detail: payload }));
  });

  socket.on("batch:state_transitioned", (payload) => {
    window.dispatchEvent(new CustomEvent("sirkula:batch-transitioned", { detail: payload }));
  });

  socket.on("batch:claimed", (payload) => {
    window.dispatchEvent(new CustomEvent("sirkula:batch-claimed", { detail: payload }));
  });

  socket.on("batch:handover_completed", (payload) => {
    window.dispatchEvent(new CustomEvent("sirkula:handover-completed", { detail: payload }));
  });
}

export function switchSocketRole(token, role) {
  initSocket(token, role);
}
