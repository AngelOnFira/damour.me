/*
Client side code for content sharer

author: DamourYouKnow
*/

var socket = io();

$(document).ready(function() {
	var url = window.location.href;
	var idFromUrl = "";
	var c = url.length - 1;
	while (url.charAt(c) != "=" && url.charAt(c) != '/') {
		idFromUrl = url.charAt(c) + idFromUrl;
		c--;
	}

	socket.emit("joinRoom", idFromUrl);

	socket.on("joinRoomFailed", function() {
		console.log("Join failed");
		socket.emit("createRoom");
	});

	socket.on("joinRoomSuccess", function() {
		console.log("Join successfull");
		$("#roomTitle").html(
			"<p>Share this room:" + window.location.protocol + "//"
				+ window.location.hostname + "/player?room="
				+ idFromUrl + "</p>"
		);
	});

	socket.on("newRoom", function(id) {
		window.location.href = window.location.protocol + "//"
			+ window.location.hostname + "/player?room="
			+ id;
	});

	socket.on("message", function(message) {
		$("#log").html("<p class='warning'>" + message + "</p>");
		setTimeout(function() {
			$("#log").empty();
		}, 2500);

	});

	socket.on("nextContent", function(data) {
		var linkStr = "https://www.youtube.com/embed/" + data.id +
			"?autoplay=1";

		var seconds = Math.round(data.time.millis / 1000);
		linkStr = linkStr + "&start=" + seconds;

		$("#contentPlayer").attr({"src": linkStr});
	});

	socket.on("updateQueue", function(queue) {
		$("#contentQueue").html("<p>Current queue:<\p>");
		for (var i = 0; i < queue.length; i++) {
			$("#contentQueue").append("<p>" + queue[i].title + "<\p>");
		}
	});

	// add song to queue if add button is pressed
	$("#queueButton").click(function() {
		socket.emit("addSong", $("#inputArea").val());
		$("#inputArea").val("");
	});

	// add song to queue if enter is pressed
	$("#inputArea").keydown(function(event) {
		if (event.keyCode === 13) {
			socket.emit("addSong", $(this).val());
			$("#inputArea").val("");
		}
	});
});
