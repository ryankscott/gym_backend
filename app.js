// @flow

const express = require("express");
const _ = require("lodash");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");

const { logger } = require("./logger.js");
const {
  createDB,
  createDefaultTables,
  queryClasses,
  queryClassTypes,
  deleteClasses,
  getClasses
} = require("./gym.js");

var app = express();
app.use(morgan("dev"));
app.use(cors());

app.use(express.static("build"));

// Set up DB
var db = createDB("db.json");
createDefaultTables(db);
getClasses(db);

const DBRefreshInterval = 24 * 60 * 60 * 1000; // hours * minutes * seconds * ms
setInterval(() => {
  deleteClasses(db);
  getClasses(db);
}, DBRefreshInterval);

app.get("/classes", (req, res) => {
  const queryString = req.query;
  const allClasses = queryClasses(db, queryString);
  console.log(allClasses);
  res.send(allClasses);
});

app.get("/classtypes", (req, res) => {
  const allClassTypes = queryClassTypes(db);
  res.send(allClassTypes);
});

app.listen(3000, () =>
  logger.log("info", "Gym Timetable app listening on port 3000!")
);
