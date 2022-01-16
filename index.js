const ws = require("ws");

const accounts = new Map();

require("http")
  .createServer((req, res) => {
    console.log(
      `${req.socket.remoteAddress} - ${req.url} - ${req.headers["user-agent"]}`
    );

    if (req.url === "/create_account") {
      if (accounts.get(req.headers.username)) {
        res.writeHead(429);
        res.end("You are being ratelimited.");
      } else {
        if (req.headers["content-type"] !== "application/json") {
          res.writeHead(400);
          res.end("Invalid request");
        } else {
          accounts.set(
            req.headers.username,
            Buffer.from(
              req.headers.username +
                ";" +
                req.socket.remoteAddress +
                ";" +
                req.headers.password
            ).toString("base64")
          );
          res.writeHead(204);
          res.end();
        }
      }
    } else if (req.url === "/") {
      res.writeHead(200).end(req.socket.remoteAddress);
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(8080);

const server = new ws.Server({
  port: 8088,
});

server.on("connection", (socket, r) => {
  let ip = `${r.socket.remoteAddress}:${r.socket.remotePort}`;
  let auth = Buffer.from(r.headers.authorization ?? "", "base64")
    .toString()
    .split(";");
  let [username, addr, pass] = auth;

  if (
    addr !== r.socket.remoteAddress ||
    r.headers.authorization !== accounts.get(username)
  ) {
    socket.close();
    console.log(
      `${ip} failed authentication with ${auth.join(";")} (${
        r.headers.authorization
      }; should've been ${accounts.get(username)})`
    );
    return;
  }

  console.info(`${username} [${ip}] joined`);
  server.clients.forEach((v) =>
    v.send(
      JSON.stringify({
        type: "MESSAGE",
        user: "[SYSTEM]",
        data: `${username} has joined chat (${ip})\n`,
      })
    )
  );
  socket.on("message", (data, b) => {
    console.log(`[${username}]`, data.toString());
    server.clients.forEach((v) =>
      v.send(
        JSON.stringify({
          type: "MESSAGE",
          user: username,
          data: data.toString(),
        })
      )
    );
  });
});

console.log("start");
