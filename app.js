const express = require("express");
const _ = require("lodash");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");

const { logger } = require("./logger.js");
const {
  queryClasses,
  queryClassTypes,
  removeClasses,
  getClasses
} = require("./gym.js");

var app = express();
app.use(morgan("dev"));
app.use(cors());

app.use(express.static("build"));

const DBRefreshInterval = 24 * 60 * 60 * 1000; // hours * minutes * seconds * ms
setInterval(() => {
  queries.removeClasses();
  queries.getClasses();
}, DBRefreshInterval);

app.get("/classes", (req, res) => {
  const queryString = req.query;
  const allClasses = queryClasses(queryString);
  res.send(allClasses);
});

app.get("/classtypes", (req, res) => {
  const allClassTypes = queryClassTypes();
  res.send(allClassTypes);
});

app.listen(3000, () =>
  logger.log("info", "Gym Timetable app listening on port 3000!")
);
