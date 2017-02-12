angular.module('app').controller('CoachingToolsController', ['$scope', '$http', '$interval', '$sce', function($scope, $http, $interval, $sce) {
    
	// Videogular code
	$scope.that = this;
	$scope.videoPlayer = $scope.that;
	var controller = $scope.that;
	controller.API = null;
	controller.onPlayerReady = function(API) {
		controller.API = API;
	};
	
	// Using floor so timestamps are more consistent
	var getTimeInSeconds = function() {
		return (Math.floor($scope.videoPlayer.API.currentTime / 100) / 10);
	};
	
	
	$scope.that.onEnterDrawing = function onEnter(currentTime, timeLapse, params) {
		$scope.that.API.pause();
		console.log("Here");
		console.log(currentTime);
		console.log(timeLapse);
		console.log(getTimeInSeconds());
		for(var i = 0; i < $scope.drawingsAndNotes.length; i++) {
			console.log($scope.drawingsAndNotes[i].time);	
		}
		redraw(getTimeInSeconds());
	};
	$scope.that.onEnterNote = function onLeave(currentTime, timeLapse, params) {
		// alert("hey");
	};
	
	$scope.that.config = {
		sources: [
			// Dummy video of US Nat 9
			{src: "https://www.youtube.com/watch?v=VfzdLacYQto"},
			{src: $sce.trustAsResourceUrl("http://static.videogular.com/assets/videos/videogular.mp4"), type: "video/mp4"},
			{src: $sce.trustAsResourceUrl("http://static.videogular.com/assets/videos/videogular.webm"), type: "video/mp4"},
			{src: $sce.trustAsResourceUrl("http://static.videogular.com/assets/videos/videogular.ogg"), type: "video/mp4"}
		],
		theme: "/lib/videogular-themes-default/videogular.css",
		plugins: {
			poster: "http://www.videogular.com/assets/images/videogular/png"
		},
		cuePoints: {
			events: []
		},
	};
	
	$scope.that.addCuePoint = function(timeStamp) {
		console.log("here1");
		var point = {
			timeLapse: {
				start: timeStamp,
				end: timeStamp+.1
			},
			onEnter: $scope.that.onEnterDrawing.bind($scope.that),
		};
		$scope.that.config.cuePoints.events.push(point);
	};


	$scope.Math = window.Math;
	
	$scope.closeDialog = function(which) {
		document.getElementById(which).style.display='none';document.getElementById('fade').style.display='none';
	};
	
	$scope.getAllGames = function() {
		$scope.allGames = [];
		$http.get("/allGames/" + $scope.team).then(function(response) {
			$scope.allGames = response.data;
		});
	};

	
	$scope.initVals = function() {
		var idAndYearAndOpponent;
		idAndYearAndOpponent = $scope.vidObj.split(",");
		$scope.selectedVideo = idAndYearAndOpponent[0];
		// Set this to my videogular config
		var videoUrl = "https://www.youtube.com/watch?v=" + $scope.selectedVideo;
		$scope.that.config['sources'] = [{src:videoUrl}];
		$scope.seekToTime(null, 0);
		$scope.year = idAndYearAndOpponent[1];
		$scope.opponent = idAndYearAndOpponent[2];
		$scope.drawingsAndNotes = [];
		document.getElementById('coachingCanvas').style.zIndex = 3;
		clickXMap = {};
		clickYMap = {};
		clickDragMap = {};
		var notesUrl;
		notesUrl = "/allNotes/" + $scope.selectedVideo + "/" + $scope.team;
		
		$http.get(notesUrl).then(function(response) {
			for (var i = 0; i < response.data.length; i++) {
				response.data[i].stat_name = "NOTE";
				$scope.drawingsAndNotes.push(response.data[i]);
			}
		});
		$http.get("/getDrawings/" + $scope.selectedVideo + "/" + $scope.team).then(function(response) {
			clickXMap = JSON.parse(response.data.xMap);
			clickYMap = JSON.parse(response.data.yMap);
			clickDragMap = JSON.parse(response.data.dragMap);
			// add the approrpiate values in to my $scope.drawingsAndNotes field
			for (var key in clickXMap) {
				if (clickXMap.hasOwnProperty(key)) {
					$scope.drawingsAndNotes.push({statName: 'DRAWING', time: parseFloat(key).toFixed(1)});
					$scope.that.addCuePoint(parseFloat(key));
				}
			}
			$scope.drawingsAndNotes.sort(function(a, b){
				return a.time - b.time;
			});
		});
	};
	
	
	$scope.startNote = function() {
		$scope.videoPlayer.pause();
		document.getElementById('noteOverlay').style.display='block';document.getElementById('fade').style.display='block';
	};
	
	$scope.addNote = function() {
		var data = {
				vid_id : $scope.selectedVideo,
				team_id : $scope.team,
				fall_year : $scope.year,
				time : getTimeInSeconds(),
				good_bad_filter : $scope.goodBad,
				o_d_filter : $scope.oD,
				note : $scope.noteText
		};
		// $scope.addStat($scope.posNegNeut, $scope.oDBreak);
		$http.post("/addNote", data).then(function(response) {
			$scope.noteText = "";
			// add it to the all stats? how would I do that?
			response.data.stat_name = "NOTE";
			$scope.originalStats.push(response.data);
			$scope.originalStats.sort(function(a, b){
					return a.time - b.time;
				});
			$scope.filterEvents('added');
			$scope.drawingsAndNotes.push(response.data);
			$scope.drawingsAndNotes.sort(function(a, b) {
				return a.time - b.time;
			});
		});
		$scope.goodBad = "";
		$scope.oD = "";
		$scope.noteText = "";
		$scope.closeDialog('noteOverlay');
	};
	
	$scope.deleteStat = function(objId, statName) {
		var data = {
			object_id : objId,
			stat : statName
		};
		// I also need to get the ID of the object created on the other team here
		$http.post("/deleteStat", data).then(function(response) {
			// do nothing for now
			//remove locally
			var index = findStatIndex(response.data);
			if (statName === 'NOTE') {
				var func = function(drawingObject) {
					return drawingObject.time.toFixed(1) === $scope.originalStats[index].time.toFixed(1);
				};
				var ii = $scope.drawingsAndNotes.findIndex(func);
				if (ii > -1) {
					$scope.drawingsAndNotes.splice(ii, 1);
				}
			}
			if (index !== -1) {
				$scope.originalStats.splice(index, 1);
			}
			$scope.filterEvents('deleted');
		});
	};
	
	function findStatIndex(stat) {
		for (var i = 0; i < $scope.originalStats.length; i++) {
			if ($scope.originalStats[i].objectId == stat.objectId) {
				return i;
			}
		}
	}
	
	$scope.instantReplay = function() {
		$scope.seekToTime(null, getTimeInSeconds());
	};
	
	$scope.seekToTime = function(statName, time) {
		time = time < 5 ? 5 : time;
		if (statName == 'SUB' || statName == "SWAP" || statName == 'PAUSE_CLOCK' || statName == 'START_CLOCK') {
			$scope.videoPlayer.API.seekTime(time, false);
		} else {
			$scope.videoPlayer.API.seekTime(time-5, false);
		}
	};

	$scope.showNote = function(index) {
		$scope.videoPlayer.API.pause();
		$scope.displayNoteText = $scope.displayStats[index].note;
		document.getElementById('displayNoteOverlay').style.display='block';document.getElementById('fade').style.display='block';
	};
	
	var canvas = document.getElementById('coachingCanvas');
	if (canvas) {
		var context = canvas.getContext("2d");
		canvas.setAttribute('height', context.canvas.clientHeight);
		canvas.setAttribute('width', context.canvas.clientWidth);
	}
	
	// These need to be objects, with key being the time, val being the array
	var clickXMap = {};
	var clickYMap = {};
	var clickDragMap = {};
	var paint;
	var xScale = 1.0;
	var yScale = 1.0;
	
	window.onresize = resizeCanvas;
	// resizeCanvas();
	
	$scope.eraseDrawingsAtTimeStamp = function() {
		var timeStamp = getTimeInSeconds();
		timeStamp = (Math.round(timeStamp * 10) / 10);
		delete clickXMap[timeStamp];
		delete clickYMap[timeStamp];
		delete clickDragMap[timeStamp];
		context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight); // Clears the canvas
		var func = function findIndexByTimeStamp(drawingObject) {
			return drawingObject.time === timeStamp.toFixed(1);
		};
		var index = $scope.drawingsAndNotes.findIndex(func);
		if (index > -1) {
			$scope.drawingsAndNotes.splice(index, 1);
		}
		$scope.saveDrawings(true);
	};
		
	// These are functions for the buttons on the .erb screen
	$scope.playVideo = function() {
		$scope.saveDrawings();
		context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight); // Clears the canvas
		$scope.videoPlayer.API.play();
	};
	
	$scope.pauseVideo = function() {
		$scope.saveDrawings();
		$scope.videoPlayer.API.pause();
	};
	
	function resizeCanvas() {
		xScale = context.canvas.clientWidth / parseFloat(1000);
		yScale = context.canvas.clientHeight / parseFloat(1000);
		
		canvas.setAttribute('height', context.canvas.clientHeight);
		canvas.setAttribute('width', context.canvas.clientWidth);
		
		redraw(getTimeInSeconds());
	}

	function addClick(x, y, dragging) {
		var timeStamp = getTimeInSeconds();
		timeStamp = (Math.round(timeStamp * 10) / 10);
		if (!clickXMap[timeStamp]) {
			clickXMap[timeStamp] = [];
		}
		if (!clickYMap[timeStamp]) {
			clickYMap[timeStamp] = [];
		}
		if (!clickDragMap[timeStamp]) {
			clickDragMap[timeStamp] = [];
		}
		// Convert from real coordinates to model coordinates
		x = x / xScale;
		y = y / yScale;
		clickXMap[timeStamp].push(x);
		clickYMap[timeStamp].push(y);
		clickDragMap[timeStamp].push(dragging);
		
	}
	
	
	function redraw(timeStamp) {
		context.strokeStyle = "#ffff00";
		context.lineJoin = "round";
		context.lineWidth = 5;
		if (clickXMap[timeStamp]) {
			context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight); // Clears the canvas
			for(var i=0; i < clickXMap[timeStamp].length; i++) {		
				context.beginPath();
				if (clickDragMap[timeStamp][i] && i) {
					var x = clickXMap[timeStamp][i-1] * xScale;
					var y = clickYMap[timeStamp][i-1] * yScale;
					context.moveTo(x, y);
				 } else {
					 var xx = (clickXMap[timeStamp][i] * xScale) - 1;
					 var yy = clickYMap[timeStamp][i] * yScale;
					 context.moveTo(xx, yy);
				 }
				 var xxx = clickXMap[timeStamp][i] * xScale;
				 var yyy = clickYMap[timeStamp][i] * yScale;
				 context.lineTo(xxx, yyy);
				 context.closePath();
				 context.stroke();
			}
		}
	}
	
	$('#coachingCanvas').mousedown(function(e) {
		var mouseX = e.pageX - e.target.offsetParent.offsetLeft;
		var mouseY = e.pageY - e.target.offsetParent.offsetTop;
		paint = true;
		addClick(mouseX, mouseY);
		redraw(getTimeInSeconds());
	});
	
	$('#coachingCanvas').mousemove(function(e) {
		if(paint){
			var mouseX = e.pageX - e.target.offsetParent.offsetLeft;
			var mouseY = e.pageY - e.target.offsetParent.offsetTop;
			addClick(mouseX, mouseY, true);
			redraw(getTimeInSeconds());
		}
	});
	
	$('#coachingCanvas').mouseup(function(e){
		paint = false;
	});
	
	$('#coachingCanvas').mouseleave(function(e){
		paint = false;
	});
	
	$scope.saveDrawings = function(fromDelete) {
		var timeStamp = getTimeInSeconds();
		console.log("Saving");
		console.log(timeStamp);
		console.log(timeStamp.toString());
		console.log("--------");
		// if there are no drawings at this timestamp don't add anything to the thing...
		// Don't know what to do about that yet
		if (clickXMap[timeStamp] == null) {
			return;
		}
		var data = {
			vid_id : $scope.selectedVideo,
			team_id : $scope.team,
			timeStamp : timeStamp,
			clickXMap : JSON.stringify(clickXMap),
			clickYMap : JSON.stringify(clickYMap),
			clickDragMap : JSON.stringify(clickDragMap)
		};
		$http.post("/saveDrawings", data).then(function(response){
			if (response.status === 200) {
				var func = function findIndexByTimeStamp(drawingObject) {
					return drawingObject.time === timeStamp.toFixed(1);
				};
				if($scope.drawingsAndNotes.findIndex(func) === -1 && !fromDelete && screenIsNotEmpty(timeStamp)) {
					$scope.drawingsAndNotes.push({statName: 'DRAWING', time: timeStamp.toFixed(1)});
					$scope.drawingsAndNotes.sort(function(a, b){
						return a.time - b.time;
					});
					$scope.that.addCuePoint(timeStamp);
				}
			} else {
				alert('Failed to save drawing, please try again');
			}
		});
	};
	
	function screenIsNotEmpty(timeStamp) {
		return clickXMap[timeStamp] && clickXMap[timeStamp].length > 0;
	};
	
}]);