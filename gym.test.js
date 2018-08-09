const {
  saveEntities,
  deleteEntities,
  createDB,
  deleteDB,
  createDefaultTables,
  deleteClasses,
  queryClassesByName,
  queryClassesByHour,
  queryClassesByDate
} = require("./gym.js");
const _ = require("lodash");
const isSameDay = require("date-fns/isSameDay");
const getHours = require("date-fns/getHours");

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const fs = require("fs");
const rawData = fs.readFileSync("test.json", "utf8");
const entities = JSON.parse(rawData);

var db;
beforeAll(() => {
  db = createDB("db_test.json");
  createDefaultTables(db);
});

afterAll(() => {
  deleteDB(db);
});

beforeEach(() => {
  saveEntities(db, entities);
});

afterEach(() => {
  deleteEntities(db);
});

test("It should return all classes when not provided with any class name", () => {
  const cs = queryClassesByName(db);
  expect(cs.length).toBe(144);
});

test("It should return classes with the name 'CXWORX'", () => {
  const cs = queryClassesByName(db, "26");
  const nonCX = _.reject(cs, c => {
    return c.ClassName == "CXWORX";
  });
  expect(nonCX.length).toBe(0);
});

test("It should return classes that start on 2018-08-08  ", () => {
  const cs = queryClassesByDate(db, "2018-08-08");
  const outsideOfDateRange = _.reject(cs, c => {
    return isSameDay(c.StartDateTime, "2018-08-08");
  });
  expect(outsideOfDateRange.length).toBe(0);
});

test("It should return classes that start on 2018-08-08 or 2018-08-09  ", () => {
  const cs = queryClassesByDate(db, "2018-08-08", "2018-08-09");
  const outsideOfDateRange = _.reject(cs, c => {
    return (
      isSameDay(c.StartDateTime, "2018-08-08") ||
      isSameDay(c.StartDateTime, "2018-08-09")
    );
  });
  expect(outsideOfDateRange.length).toBe(0);
});

test("It should return classes that start at 8:00am ", () => {
  const cs = queryClassesByHour(db, 8);
  const outsideOfHourRange = _.reject(cs, c => {
    return getHours(c.StartDateTime) == 8;
  });
  expect(outsideOfHourRange.length).toBe(0);
});

test("It should return classes that start at 8:00am or 3:00pm ", () => {
  const cs = queryClassesByHour(db, 8, 15);
  const outsideOfHourRange = _.reject(cs, c => {
    return getHours(c.StartDateTime) == 8 || getHours(c.StartDateTime) == 15;
  });
  expect(outsideOfHourRange.length).toBe(0);
});
