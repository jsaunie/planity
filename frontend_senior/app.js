window.addEventListener("DOMContentLoaded", function () {
  console.time("calendar");

  const calendar = new Calendar("calendar", {
    start: 9, // From 0 to 24
    end: 21, // From 0 to 24
    animationDelay: 10, // ms
  });

  calendar
    // Events is a global variable from calendar/events.js file
    .setEvents(events)
    /**
     * Uncomment this line and comment the call of "setEvents" method
     * if you want to generate events instead of defining events from calendar/event.js file
     */
    // .generateRandomEvents(10)
    .init()
    .showEvents();

  console.log("Events :", calendar.events.sorted());

  console.timeEnd("calendar");
});
