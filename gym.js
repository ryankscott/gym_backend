// @flow
const fetch = require("node-fetch");
const low = require("lowdb");
const moment = require("moment");
const _ = require("lodash");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = low(adapter);

let saveEntityFunc = (entity, c) => {
  db
    .get(entity)
    .push(c)
    .write();
};

let saveEntity = _.curry(saveEntityFunc);
const saveClass = saveEntity("classes");
const saveTrainers = saveEntity("trainers");
const saveClassType = saveEntity("classType");

const classFilter = inputClass => {
  return {
    Club: inputClass.Club,
    ClassName: inputClass.ClassName,
    StartDateTime: inputClass.StartDateTime
  };
};

const queryClasses = query => {
  /* Should expect an object that looks like
     *  {
     *     name: "BodyPump, RPM"
     *     club: "Auckland City"
     *     before: "2018-07-18T19:10:00Z12:00",
     *     after: "2018-07-18T20:10:00Z12:00",
     *  }
     */

  const name = _.get(query, "name");
  const club = _.get(query, "club");
  const before = _.get(query, "before");
  const after = _.get(query, "after");

  let names = name ? name.split(",") : [];
  names = _.map(names, n => n.toLowerCase());
  const classesByName = queryClassesByName(...names);

  let clubs = club ? club.split(",") : [];
  clubs = _.map(clubs, c => c.toLowerCase());
  const classesByClub = queryClassesByClub(...clubs);

  // Here be dragons - I assume this is in NZT!!
  const classesByDate = queryClassesByDate(before, after);

  const allClasses = _.intersection(
    classesByName,
    classesByClub,
    classesByDate
  );
  const reducedClasses = _.map(allClasses, classFilter);
  return _.sortBy(reducedClasses, ["StartDateTime"]);
};

const queryAllClasses = () => {
  return db.get("classes").value();
};

const queryClassesByName = (...name) => {
  if (name.length == 0) {
    return queryAllClasses();
  }
  return db
    .get("classes")
    .filter(c => {
      return _.indexOf(name, c.ClassName.toLowerCase()) >= 0;
    })
    .value();
};

const queryClassesByDate = (
  before = moment().add(7, "days"),
  after = moment()
) => {
  return db
    .get("classes")
    .filter(c => {
      return (
        moment(c.StartDateTime).isBefore(before) &&
        moment(c.StartDateTime).isAfter(after)
      );
    })
    .value();
};

const queryClassesByClub = (...club) => {
  if (club.length == 0) {
    return queryAllClasses();
  }
  return db
    .get("classes")
    .filter(c => {
      return _.indexOf(club, c.Club.Name.toLowerCase()) >= 0;
    })
    .value();
};

const removeOldClasses = () => {
  return db
    .get("classes")
    .remove(c => {
      moment(c.StartDateTime).isBefore(moment().subtract(7, "days"));
    })
    .write();
};

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

  removeOldClasses();
};

db.defaults({ classes: [], trainers: [], classType: [] }).write();
getClasses();

module.exports.queryClasses = queryClasses;
