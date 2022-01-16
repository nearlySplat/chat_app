import ws from "ws";
import fetch from "node-fetch";

function c() {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
}
function p() {
  process.stdout.write("> ");
}
async function load() {
  const username = process.argv[2],
    ip = "::ffff:127.0.0.1",
    password = "asd";

  await fetch("http://localhost:8080/create_account", {
    headers: {
      "Content-Type": "application/json",
      username,
      password,
    },
    method: "POST",
  });

  const socket = new ws("ws://localhost:8088", {
    headers: {
      Authorization: Buffer.from(`${username};${ip};${password}`).toString(
        "base64"
      ),
    },
  });

  socket.on("open", () => {
    console.log("Connected to server");
  });

  socket.on("message", (data) => {
    let json = JSON.parse(data);
    switch (json.type) {
      case "JOIN":
        if (json.user !== username) {
          c();
          console.log(`${json.user} has joined the room`);
        }
        break;
      case "MESSAGE":
        if (json.user !== username) {
          c();
          process.stdin.write(`${json.user}: ${json.data}`);
        }
        break;
    }
    p();
  });

  process.stdin.on("data", (d) => socket.send(d));
}

load();
