const fetch = require("node-fetch");
const low = require("lowdb");
const _ = require("lodash");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = low(adapter);

let saveEntity = (entity, c) => {
  db
    .get(entity)
    .push(c)
    .write();
};

saveEntity = _.curry(saveEntity);
saveClass = saveEntity("classes");
saveTrainers = saveEntity("trainers");
saveClassType = saveEntity("classType");

const saveClasses = jsonClasses => {
  let classes = _.get(jsonClasses, "Classes");
  let trainers = _.get(jsonClasses, "Trainers");
  let classType = _.get(jsonClasses, "ClassType");
  _.map(classes, saveClass);
  _.map(trainers, saveTrainers);
  _.map(classType, saveClassType);
};

const getClasses = () => {
  fetch("https://www.lesmills.co.nz/api/timetable/get-timetable-epi", {
    method: "POST",
    body: "Club=01,09,13,06",
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  })
    .then(res => res.json())
    .then(json => saveClasses(json))
    .catch(err => console.log(err));
  // TODO: Handle failures properly
};

db.defaults({ classes: [], trainers: [], classType: [] }).write();
getClasses();
