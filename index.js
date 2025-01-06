const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors({ optionsSuccessStatus: 200 }));  // some legacy browsers choke on 204
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get("/api/:date", function (req, res) {
  let timestamp = req.params.date; // changed code 'req.params.date'
  if (timestamp.match(/\d{5,}/)) {
    timestamp = +timestamp;
  }
  console.log(timestamp);
  let date = new Date(timestamp);
  if (date.toUTCString() == "Invalid Date") {
    res.json({ error: date.toUTCString() });

    console.log({ error: date });
  }
  res.json({ unix: date.valueOf(), utc: date.toUTCString() });
});

// changed code for ' app.get ("/api" '
app.get("/api", (req, res) => {
  let date = new Date();
  res.json({ unix: date.valueOf(), utc: date.toUTCString() });
});

// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  console.log({ greeting: "hello API" });
  res.json({ greeting: 'hello API' });
});

// API endpoint for whoami
app.get("/api/whoami", (req, res) => {
  console.log({
    ipaddress: req.ip,
    language: req.headers["accept-language"],
    software: req.headers["user-agent"],
  });
  res.json({
    ipaddress: req.ip,
    language: req.headers["accept-language"],
    software: req.headers["user-agent"],
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});