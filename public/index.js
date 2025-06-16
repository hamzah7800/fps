const logEl = document.getElementById('log');
function log(msg) {
  logEl.textContent += msg + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}

const socket = new WebSocket(`ws://${window.location.host}`);

socket.addEventListener('open', () => log('Connected to server.'));
socket.addEventListener('close', () => log('Disconnected from server.'));
socket.addEventListener('error', (e) => log('WebSocket error.'));
socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  log('Received: ' + JSON.stringify(data));
});

document.getElementById('createRoom').onclick = () => {
  socket.send(JSON.stringify({ type: 'createRoom' }));
};

document.getElementById('joinRoom').onclick = () => {
  const code = document.getElementById('joinCode').value.toUpperCase();
  if (!code) return alert('Enter room code');
  socket.send(JSON.stringify({ type: 'joinRoom', roomCode: code }));
};
