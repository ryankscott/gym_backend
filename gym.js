const fetch = require("node-fetch");
const low = require("lowdb");
const _ = require("lodash");
const FileSync = require("lowdb/adapters/FileSync");
const parse = require("date-fns/parse");
const addDays = require("date-fns/addDays");
const subDays = require("date-fns/subDays");
const isBefore = require("date-fns/isBefore");
const isAfter = require("date-fns/isAfter");
const getHours = require("date-fns/getHours");
const isSameDay = require("date-fns/isSameDay");

const { logger } = require("./logger.js");

const saveEntities = (db, jsonClasses) => {
  let classes = _.get(jsonClasses, "Classes");
  const startTime = new Date();
  logger.log("info", "Saving %d classes", classes.length);
  let trainers = _.get(jsonClasses, "Trainers");
  let classType = _.get(jsonClasses, "ClassType");
  _.map(classes, c => {
    saveClasses(db, c);
  });
  _.map(trainers, t => {
    saveTrainers(db, t);
  });

  _.map(classType, ct => {
    saveClassType(db, ct);
  });
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;
  logger.log("info", "Saved all classes in %d s", duration);
};

const saveClasses = (db, c) => {
  db
    .get("classes")
    .push(c)
    .write();
};

const saveTrainers = (db, c) => {
  db
    .get("trainers")
    .push(c)
    .write();
};

const saveClassType = (db, c) => {
  db
    .get("classType")
    .push(c)
    .write();
};

const classFilter = inputClass => {
  return {
    Club: inputClass.Club,
    ClassName: inputClass.ClassName,
    StartDateTime: inputClass.StartDateTime
  };
};

const queryAllClasses = db => {
  return db.get("classes").value();
};

const queryClassTypes = db => {
  return db.get("classType").value();
};

const queryClasses = (db, query) => {
  /* Should expect an object that looks like
     *  {
     *     name: "BodyPump, RPM"
     *     club: "Auckland City"
     *     date: "2018-07-18T19:10:00Z12:00,2018-07-18T20:10:00Z12:00",
     *     hour: "6,7,8,9,10" 
     *  }
     */

  const name = _.get(query, "name");
  const club = _.get(query, "club");
  const date = _.get(query, "date");
  const hour = _.get(query, "hour");

  let names = name ? name.split(",") : [];
  names = _.map(names, n => n.toLowerCase());
  const classesByName = queryClassesByName(...names);

  let clubs = club ? club.split(",") : [];
  clubs = _.map(clubs, c => c.toLowerCase());
  const classesByClub = queryClassesByClub(...clubs);

  let dates = date ? date.split(",") : [];
  const classesByDate = queryClassesByDate(...dates);

  // Here be dragons - I assume this is in NZT!!
  let hours = hour ? hour.split(",") : [];
  hours = _.map(hours, hour => {
    return parseInt(hour, 10);
  });
  const classesByHour = queryClassesByHour(...hours);

  const allClasses = _.intersection(
    classesByName,
    classesByClub,
    classesByDate,
    classesByHour
  );
  const reducedClasses = _.map(allClasses, classFilter);
  return _.sortBy(reducedClasses, ["StartDateTime"]);
};

const queryClassesByName = (db, ...id) => {
  if (id.length == 0) {
    return queryAllClasses(db);
  }
  return db
    .get("classes")
    .filter(c => {
      return _.indexOf(id, c.ClassCode) >= 0;
    })
    .value();
};

const queryClassesByDate = (db, ...dates) => {
  if (dates.length == 0) {
    return queryAllClasses(db);
  }
  return db
    .get("classes")
    .filter(c => {
      const sameDays = _.map(dates, date => {
        return isSameDay(date, c.StartDateTime);
      });
      return _.indexOf(sameDays, true) >= 0;
    })
    .value();
};

const queryClassesByHour = (db, ...hours) => {
  if (hours.length == 0) {
    return queryAllClasses();
  }

  return db
    .get("classes")
    .filter(c => {
      return _.indexOf(hours, getHours(c.StartDateTime)) >= 0;
    })
    .value();
};

const queryClassesByClub = (db, ...club) => {
  if (club.length == 0) {
    return queryAllClasses();
  }
  return db
    .get("classes")
    .filter(c => {
      return _.indexOf(club, c.Club.ClubCode) >= 0;
    })
    .value();
};

const deleteEntities = db => {
  deleteClasses(db);
  deleteClassTypes(db);
  deleteTrainers(db);
};

const deleteTrainers = db => {
  return db
    .get("trainers")
    .remove()
    .write();
};

const deleteClassTypes = db => {
  return db
    .get("classType")
    .remove()
    .write();
};

const deleteClasses = db => {
  logger.log("info", "Removing all classes");
  return db
    .get("classes")
    .remove()
    .write();
};

const deleteOldClasses = db => {
  return db
    .get("classes")
    .delete(c => {
      moment(c.StartDateTime).isBefore(moment().subtract(7, "days"));
    })
    .write();
};

const getClasses = db => {
  logger.log("info", "Fetching new classes");
  const startTime = new Date();
  fetch("https://www.lesmills.co.nz/api/timetable/get-timetable-epi", {
    method: "POST",
    body: "Club=01,09,13,06",
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  })
    .then(res => res.json())
    .then(json => {
      const endTime = new Date();
      const duration = (endTime - startTime) / 1000;
      logger.log("info", "Fetched all classes in %d s", duration);
      saveEntities(json);
    })

    .catch(err => console.log(err));

  deleteOldClasses();
};

const createDB = fileName => {
  const adapter = new FileSync(fileName);
  return low(adapter);
};

const createDefaultTables = db => {
  db.defaults({ classes: [], trainers: [], classType: [] }).write();
};
const deleteDB = db => {};

module.exports = {
  saveEntities,
  deleteEntities,
  deleteOldClasses,
  queryClasses,
  queryClassesByName,
  queryClassesByDate,
  queryClassesByHour,
  queryClassTypes,
  getClasses,
  deleteClasses,
  createDefaultTables,
  createDB,
  deleteDB
};
