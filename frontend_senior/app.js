window.addEventListener("DOMContentLoaded", function () {
  console.time("calendar");

  const calendar = new Calendar("calendar", { start: 9, end: 21, animationDelay: 100 });

  calendar.setEvents(events).init().showEvents();
  console.log("events :", calendar.events.sorted());

  console.timeEnd("calendar");
});
