const fetch = require("node-fetch");
const low = require("lowdb");
const _ = require("lodash");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = low(adapter);

function saveClass(c) {
  // TODO: Catch failures
  db
    .get("classes")
    .push(c)
    .write();
  return;
}

function saveTrainers(c) {
  // TODO: Catch failures
  db
    .get("trainers")
    .push(c)
    .write();
  return;
}

function parseClasses(jsonClasses) {
  _.map(jsonClasses.Classes, saveClass);
  _.map(jsonClasses.Trainers, saveTrainers);
}

function GetClasses() {
  fetch("https://www.lesmills.co.nz/api/timetable/get-timetable-epi", {
    method: "POST",
    body: "Club=01,09,13,06",
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  })
    .then(res => res.json())
    .then(json => parseClasses(json))
    .catch(err => console.log(err));
  // TODO: Handle failures properly
}
db.defaults({ classes: [], trainers: [] }).write();
GetClasses();
