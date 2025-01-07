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

app.get("/api/timestamp/:date_string?", (req, res) => {
  let dateString = req.params.date_string;
  console.log(`Received date string: ${dateString}`);
  let date;
  if (!dateString) {
    date = new Date();
  } else {
    if (/\d{5,}/.test(dateString)) {
      dateString = parseInt(dateString);
    }
    date = new Date(dateString);
  }
  console.log(`Parsed date: ${date}`);
  if (date.toString() === "Invalid Date") {
    res.json({ error: "Invalid Date" });
    return; // Add return statement here
  } else {
    res.json({ unix: date.getTime(), utc: date.toUTCString() });
  }
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