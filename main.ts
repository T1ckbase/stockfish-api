const command = new Deno.Command(Deno.build.os === 'windows' ? './stockfish-windows-x86-64-avx2' : './stockfish-ubuntu-x86-64', {
  stdin: 'piped',
  stdout: 'piped',
});

Deno.serve({ port: 7860 }, (req) => {
  if (req.headers.get('upgrade') != 'websocket') return new Response(Deno.env.get('SPACE_HOST'));

  const { socket, response } = Deno.upgradeWebSocket(req);

  const stockfish = command.spawn();

  stockfish.status.then((status) => {
    console.log(`Stockfish process exited with code: ${status.code}`);
    if (socket.readyState === WebSocket.OPEN) {
      socket.close(1011, `Stockfish process terminated with exit code ${status.code}`);
    }
  });

  const stockfishWriter = stockfish.stdin.getWriter();
  const stockfishReader = stockfish.stdout.pipeThrough(new TextDecoderStream()).getReader();

  socket.addEventListener('open', async () => {
    console.log('a client connected!');

    try {
      while (true) {
        const { value, done } = await stockfishReader.read();
        if (done) break;
        socket.send(value);
        console.log(value);
      }
    } catch (error) {
      console.error('Error reading from stockfish stdout:', error);
      if (socket.readyState === WebSocket.OPEN) socket.close();
    }
  });

  socket.addEventListener('message', async (event) => {
    const message = event.data;
    await stockfishWriter.write(new TextEncoder().encode(message + '\n'));
  });

  socket.addEventListener('close', () => {
    console.log('A client disconnected, cleaning up Stockfish process.');
    try {
      stockfish.kill();
    } catch (_) {
      console.log('Could not kill Stockfish, it likely already exited.');
    }
  });

  return response;
});
