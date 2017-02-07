var exports = module.exports = {};
var fileOperations = require("./fileOperations.js");
var path = require("path");
var url = require("url");
var YouTube = require("youtube-node");
var main = require("./app.js");
var server = main.server;
var app = main.app;
var io = require("socket.io")(server);

const ROOT = "./public/";
const MAX_TIME = 10 * 60 * 1000;
const YT = "https://www.youtube.com/watch?v=";

var rooms = {};

var contentQueue = [];
var currentContent = {};
var idQueue = [];
var currentStart = 0;

app.get("/player*", function(request, response) {
	response.sendFile(path.join(__dirname, ROOT + "contentPlayer.html"));

	// check for id
	var urlObj = url.parse(request.url, true);
	var id = urlObj.path.substring("/player/".length, urlObj.path.length);
	console.log(id);
	if (id in rooms) {

	}

	// create new room if no id
	else {
		var newRoom = {
			"contentQueue": [],
			"idQueue": [],
			"currentContent": {},
			"currentStart": 0,
			"userCount": 1,
			"skipVotes": 0,
			"creator": ""
		};
		rooms[id] = newRoom;
	}
});

io.on("connection", function(socket) {
	var handleNextContent = function() {
		contentQueue.pop();
		idQueue.pop();
		playNextContent();
		updateQueue();
	};

	var playNextContent = function() {
		// do nothing if queue is empty
		if (contentQueue.length == 0) {
			// TODO maybe throw up a panel in place of the video?
			return;
		}

		logMessage("Playing next content...");

		// unqueue previous song
		currentContent = contentQueue[contentQueue.length - 1];
		currentTime = convertTime(currentContent.contentDetails.duration);
		currentStart = Date.now();

		var startTime = {};
		startTime.millis = 0;
		io.emit("nextContent", {id: currentContent.id, time: startTime});

		setTimeout(handleNextContent, currentTime.millis + 3000);
	};

	var updateQueue = function() {
		var queue = [];
		for (var i = contentQueue.length - 1; i >=0; i--) {
			var content = {};
			content.title = contentQueue[i].snippet.title;
			content.duration = convertTime(
				contentQueue[i].contentDetails.duration
			);
			queue.push(content);
		}

		io.emit("updateQueue", queue);
	};

	logMessage("Connection received");
	updateQueue();

	// send current song
	if (contentQueue.length >= 1) {
		var startTime = {};
		startTime.millis = Date.now() - currentStart;
		socket.emit("nextContent", {id: currentContent.id, time: startTime});
	}

	socket.on("skip", function() {

	});

	/*
	Handler for client adding song to playlist
	*/
	socket.on("addSong", function(link) {
		var urlObj = url.parse(link, true);

		if (!urlObj.query.hasOwnProperty("v")) {
			socket.emit("message", "Error finding content.");
			return;
		}

		var id = urlObj.query.v;

		var yt = new YouTube();
		var key = fileOperations.loadJSON("ytkey.json").key
		yt.setKey(key);
		yt.getById(id, function(error, result) {
			if (error || result.items.length == 0) {
				socket.emit("message", "Error finding content.");
				logMessage(error);
			}
			// check for dupe
			else if (idQueue.indexOf(result.items[0].id) >= 0) {
				socket.emit("message", "Already in queue.");
			}
			else if (
				convertTime(result.items[0].contentDetails.duration).millis
				> MAX_TIME) {

				socket.emit("message", "Content longer than 10 minutes");
			}
			else if (!result.items[0].status.embeddable) {
				socket.emit("message", "Content not embeddable.");
			}
			else {
				logMessage(
					"Adding video " + result.items[0].snippet.title
				);

				contentQueue.unshift(result.items[0]);
				idQueue.unshift(result.items[0].id);
				updateQueue();

				// play right away if first in queue
				if (contentQueue.length == 1) {
					playNextContent();
				}
			}
		});
	});

	/*
	Handler or client disconnecting from chat
	*/
	socket.on("disconnect", function(data) {
		logMessage("Client disconnected");
	});
});

/*
Creates a time object from YouTube's duration string
*/
function convertTime(time) {
	var timeNew = {};
	var hStr = "";
	var mStr = "";
	var sStr = "";
	var c = time.length - 1;

	if (time.charAt(c) == 'S') {
		c--;
		while (!isNaN(time.charAt(c))) {
			sStr = time.charAt(c) + sStr;
			c--;
		}
	}
	if (time.charAt(c) == 'M') {
		c--;
		while (!isNaN(time.charAt(c))) {
			mStr = time.charAt(c) + mStr;
			c--;
		}
	}
	if (time.charAt(c) == 'H') {
		c--;
		while (!isNaN(time.charAt(c))) {
			hStr = time.charAt(c) + hStr;
			c--;
		}
	}

	h = parseInt(hStr);
	m = parseInt(mStr);
	s = parseInt(sStr);
	if (isNaN(h)) h = 0;
	if (isNaN(m)) m = 0;
	if (isNaN(s)) s = 0;
	timeNew.hours = h;
	timeNew.minutes = m;
	timeNew.seconds = s;
	timeNew.millis = (s * 1000) + (m * 60 * 1000) + (h * 60 * 60 * 1000);
	return timeNew;
};

function logMessage(message) {
	console.log(new Date() + ": " + message);
};

function createId(len) {
    var text = "";
    var possible = "patmorinPATMORIN";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
};
