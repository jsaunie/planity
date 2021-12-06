window.addEventListener("DOMContentLoaded", function () {
  console.time("calendar");

  const calendar = new Calendar("calendar", { start: 9, end: 21, animationDelay: 100 });

  calendar
    .setEvents(events) // Events is a global variable from events.js file
    // .generateRandomEvents(10)
    .init()
    .showEvents();
  console.log("events :", calendar.events.sorted());

  console.timeEnd("calendar");
});
