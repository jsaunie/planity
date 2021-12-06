const DEFAULT_OPTIONS = {
  start: 0,
  end: 24,
  animationDelay: 300,
};

const Utils = {
  colorGen: function () {
    let letters = "0123456789abcdef";

    let hastag = "#";

    for (let i = 0; i < 6; i++) {
      hastag += letters[Math.floor(Math.random() * 16)];
    }

    return hastag;
  },
};

class Event {
  duration = 60;

  constructor(event, options = DEFAULT_OPTIONS) {
    this.id = event.id;
    this.duration = event.duration;

    const startAt = Event.getDateFromHour(event.start);

    this.startAt = startAt;
    this.endAt = new Date(startAt.getTime() + event.duration * 60000);

    this.options = { ...options };
  }

  static sortEvents (e1, e2) {
    return e1.startAt.getTime() - e2.startAt.getTime();
  }

  static getDateFromHour(hour) {
    const date = new Date();

    date.setHours(...hour.split(":"));
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
  }

  update(payload) {
    Object.keys(payload).forEach((key) => (this[key] = payload[key]));
    return this;
  }

  createElement() {
    const element = document.createElement("div");

    element.classList.add("event");
    element.setAttribute("id", this.id);
    element.innerHTML = this.id;
    element.style.backgroundColor = Utils.colorGen();

    this.setElement(element);

    return element;
  }

  setElement(element) {
    this.element = element;

    return this;
  }

  setElementStyle({ x, y, height, width }) {
    if (!this.element) {
      return;
    }

    this.element.style.top = y + "px";
    this.element.style.left = x + "px";
    this.element.style.height = height + "%";
    this.element.style.width = width + "%";

    return this.element;
  }

  calcX() {
    return !!this.abscissa ? (this.abscissa[0] * window.innerWidth) / 100 : 0;
  }

  calcY(start, end) {
    return (
      ((((this.startAt.getHours() - start + this.startAt.getMinutes() / 60) *
        100) /
        (end - start)) *
        window.innerHeight) /
      100
    );
  }

  calcHeight(start, end) {
    return (this.duration * 100) / ((end - start) * 60);
  }

  setOverlappedEventIds(events) {
    this.overlappedEventIds = [
      ...events
        .filter(
          (e) =>
            e.id !== this.id &&
            ((this.startAt >= e.startAt && this.startAt < e.endAt) ||
              (e.startAt >= this.startAt && e.startAt < this.endAt))
        )
        .map((e) => e.id),
    ];

    return this;
  }

  getDimensions() {
    return {
      x: this.calcX(),
      y: this.calcY(this.options.start, this.options.end),
      height: this.calcHeight(this.options.start, this.options.end),
      width: this.width,
    };
  }
}

class Events {
  events = {};

  constructor(events = [], options = DEFAULT_OPTIONS) {
    this.setEvents(events);
    this.options = { ...options };
  }

  has(eventId) {
    return !!this.get(eventId);
  }

  get(eventId) {
    return this.events[eventId];
  }

  filterDisplayableEvents(event) {
    return (
      (event.startAt.getHours() >= this.options.start &&
        event.endAt.getHours() <= this.options.end) ||
      (event.endAt.getHours() > this.options.start &&
        event.endAt.getMinutes() > 0 &&
        event.startAt.getHours() < this.options.end)
    );
  }

  setEvents(events) {
    const wrappedEvents = events
      .map((event) => new Event(event, this.options))
      .sort(Event.sortEvents)
      .filter(this.filterDisplayableEvents.bind(this));

    this.events = wrappedEvents.reduce((dictionary, event) => {
      dictionary[event.id] = event.setOverlappedEventIds(wrappedEvents);
      return dictionary;
    }, {});

    const recursive = (eventId, three = [], callback) => {
      let event = this.get(eventId);

      if (three.includes(eventId) || event.child) {
        return event.overlappedEventIds;
      }

      three = [...three, eventId];

      let group = event.overlappedEventIds
        .reduce(
          (acc, id) => {
            if (three.includes(id)) {
              return acc;
            }

            acc = [...acc, ...recursive(id, three, callback)];

            this.update(id, { child: true });

            return acc;
          },
          [...event.overlappedEventIds]
        )
        .filter((value, index, self) => self.indexOf(value) === index); // Filter by unique value

      callback(event.overlappedEventIds.length);

      this.update(event.id, { group });

      return group;
    };

    this.sorted().forEach((e) => {
      const event = this.get(e.id);

      if (event.child) {
        return;
      }

      let maxEvents = event.overlappedEventIds.length;

      recursive(event.id, [], (count) => maxEvents = count > maxEvents ? count : maxEvents);

      this.update(event.id, { maxEvents });
    });

    return this;
  }

  update(eventId, payload) {
    if (!this.has(eventId)) {
      throw new Error(`Event ${eventId} does not exists!`);
    }

    const events = { ...this.events };
    events[eventId] = events[eventId].update(payload);
    this.events = { ...events };

    return this;
  }

  sorted() {
    return this.toArray().sort(Event.sortEvents);
  }

  toArray() {
    return Object.values(this.events);
  }
}

class Calendar {
  events;

  constructor(containerId, options = DEFAULT_OPTIONS) {
    if (options.start > options.end) {
      throw new Error('"start" cannot be greater than "end"');
    }

    this.setContainerById(containerId);
    this.options = { ...options };
    this.events = new Events([], options);
  }

  /**
   * Get the largest space
   *
   * @param {nnumber[][]} spaces - [start, end][]
   * @return {number[]} - [start, end]
   */
  static getTheLargestSpace(spaces = []) {
    return (spaces.length > 1
      ? spaces.sort((e1, e2) => e2[1] - e2[0] - (e1[1] - e1[0]))
      : spaces)[0]; // Take the first
  }

  /**
   * Get available spaces between each space
   *
   * @param {number} width
   * @param {number[][]} spaces - [id, start, end][]
   * @return {number[][]} - [start, end][]
   */
  static getAvailableSpaces(width, spaces) {
    return spaces
      .sort((s1, s2) => s1[1] - s2[1])
      .reduce((acc, space, index) => {
        // Left
        if (
          space[0] > 0 &&
          (!!spaces[index - 1] ? spaces[index - 1][1] < space[0] : true)
        ) {
          acc = [...acc, [Math.max(space[0] - width, 0), space[0]]];
        }

        // Right
        if (
          space[1] < 100 &&
          (!!spaces[index + 1] ? spaces[index + 1][0] > space[1] : true)
        ) {
          acc = [...acc, [space[1], Math.min(space[1] + width, 100)]];
        }

        return acc;
      }, []);
  }

  init() {
    this.setupEvents();

    window.addEventListener("resize", this.resizeEvents.bind(this));

    return this;
  }

  setupEvents() {
    const recursive = (eventId, parentId = null, counter, callback) => {
      const event = this.events.get(eventId);

      // Ignore if the event has already been traversed
      if (!!event.traversed) {
        return;
      }

      this.events.update(eventId, { traversed: true });

      const width = counter > 0 ? 100 / counter : 100;

      if (!!parentId) {
        // Only take spaces from events that the current event overlaps
        const spaces = event.group.reduce((acc, id) => {
          const e = this.events.get(id);
          if (!e.abscissa || id === eventId) {
            return acc;
          }

          acc = [...acc, e.abscissa];

          return acc;
        }, []);

        const availableSpaces = Calendar.getAvailableSpaces(
          width,
          spaces
        );
        const abscissa = Calendar.getTheLargestSpace(availableSpaces); // Space occupied by the current event in the abscissa axis

        if (!!abscissa) {
          this.events.update(eventId, {
            abscissa,
            traversed: true,
            width,
          });
        } else {
          callback(eventId);
        }
      } else {
        this.events.update(eventId, {
          width,
          abscissa: [0, width], // Default space occupied by the current event in the abscissa axis
          traversed: true,
        });
      }

      event.overlappedEventIds.forEach((id) => {
        if (parentId == id) {
          return;
        }
        recursive(id, eventId, counter, callback);
      });
    };

    this.events.sorted().forEach((event) => {
      let group = [event.id];
      let callback = (eventId) => {
        if (!group.includes(eventId)) {
          group = [...group, eventId];
          event.group.forEach((id) =>
            this.events.update(id, { traversed: false, abscissa: null })
          );
          recursive(event.id, null, group.length, callback);
        }
      };
      recursive(event.id, null, 1, callback);
    });
  }

  setEvents(events) {
    this.events.setEvents(events);

    return this;
  }

  setContainerById(containerId) {
    if (!containerId) {
      throw new Error("containerId is missing!");
    }

    let container = document.getElementById(containerId);

    if (!container) {
      throw new Error("container not found in the document!");
    }

    this.container = container;

    return this;
  }

  showEvents() {
    if (!this.container) {
      throw new Error("Container element not found!");
    }

    const events = this.events.sorted();
    let i = 0;

    let interval = setInterval(() => {
      const event = events[i];
      const element = event.createElement();

      event.setElementStyle(event.getDimensions());

      this.events.update(event.id, { element });

      this.container.appendChild(element);
      i++;

      if (i >= events.length) {
        clearInterval(interval);
      }
    }, this.options.animationDelay);
  }

  resizeEvents() {
    this.events
      .toArray()
      .forEach((event) => event.setElementStyle(event.getDimensions()));
  }
}

// Set global variable
window.Calendar = Calendar;
