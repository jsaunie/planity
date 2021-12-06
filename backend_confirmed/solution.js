const readline = require("readline");
const fs = require("fs");

console.time("find");

// Options
var [requestedId] = process.argv.slice(2);

if (!requestedId) throw "Id is missing in command options";

const stream = fs.createReadStream("input.json");

const readInterface = readline.createInterface({
  input: stream,
  output: process.stdout,
  console: false,
});

let stack = [];
let stackIncludesId = false;

readInterface.on("line", function (line) {

  if (line.includes("{") || line.includes("]") ) {
    stack = [];
  }

  stack.push( line.includes("}") ? '}' : line);

  if (line.includes(requestedId)) {
    stackIncludesId = true;
  }

  if (line.includes("}") && stackIncludesId) {
    const item = JSON.parse(stack.join(''));
    if (!!item) {
      console.log(item.name);
    }
    readInterface.close(); // Stop the stream
    readInterface.removeAllListeners();

    console.timeEnd("find");
  }
});

