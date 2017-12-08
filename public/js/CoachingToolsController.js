angular.module('app').controller('CoachingToolsController', ['$scope', '$http', '$interval', '$sce', function($scope, $http, $interval, $sce) {
    
	$scope.Math = window.Math;
	
	var interv;
	$scope.curStoppedTime;

	$scope.fullScreen = {
		text: "F.S.",
		isFullScreen: false
	};

	$scope.playPauseButtonText = "Play";
		
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

		
		$scope.originalStats = [];
		$scope.year = idAndYearAndOpponent[1];
		$scope.opponent = idAndYearAndOpponent[2];
		$scope.drawingsAndNotes = [];
		
		document.getElementById('coachingCanvas').style.zIndex = 3;
		resizeCanvas();
		
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
					$scope.drawingsAndNotes.push({statName: 'DRAWING', time: parseFloat(key)});
				}
			}
			$scope.drawingsAndNotes.sort(function(a, b){
				return a.time - b.time;
			});
		});
	};
	
	
	$scope.startNote = function() {
		$scope.pauseVideo();
		document.getElementById('noteOverlay').style.display='block';document.getElementById('fade').style.display='block';
	};
	
	$scope.addNote = function() {
		var data = {
				vid_id : $scope.selectedVideo,
				team_id : $scope.team,
				fall_year : $scope.year,
				time : $scope.videoPlayer.getCurrentTime(),
				good_bad_filter : $scope.goodBad,
				o_d_filter : $scope.oD,
				note : $scope.noteText
		};
		$http.post("/addNote", data).then(function(response) {
			$scope.noteText = "";
			// add it to the all stats? how would I do that?
			response.data.stat_name = "NOTE";
			$scope.originalStats.push(response.data);
			$scope.originalStats.sort(function(a, b){
					return a.time - b.time;
				});
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
		context.clearRect(0, 0, context.canvas.clientWidth, 
							context.canvas.clientHeight);
		$scope.seekToTime("", $scope.videoPlayer.getCurrentTime());
	};
	
	$scope.seekToTime = function(statName, time) {
		if (statName == 'SUB' || statName == "SWAP" || statName == 'PAUSE_CLOCK' || statName == 'START_CLOCK') {
			$scope.videoPlayer.seekTo(time);
		} else {
			$scope.videoPlayer.seekTo(time-5);
		}
	};

	$scope.showNote = function(index) {
		$scope.pauseVideo();
		$scope.displayNoteText = $scope.displayStats[index].note;
		document.getElementById('displayNoteOverlay').style.display='block';document.getElementById('fade').style.display='block';
	};
	
	$scope.playPauseVideo = function() {
		var state = $scope.videoPlayer.getPlayerState();
		if (state === 1) {
			$scope.pauseVideo();
			$scope.playPauseButtonText = "Play";
		} else {
			$scope.playVideo();
			$scope.playPauseButtonText = "Pause";
		}
	}

	$scope.playVideo = function() {
		$scope.curStoppedTime = null;
		$scope.videoPlayer.playVideo();
		interv = $interval( function() {
			if ($scope.vidObj) {
				$scope.checkCuepoints($scope.videoPlayer.getCurrentTime());
				console.log("looking...");
			}
		}, 5);
		context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
	};
	
	$scope.pauseVideo = function() {
		$interval.cancel(interv);
		$scope.videoPlayer.pauseVideo();
	};

	$scope.toggleFullScreen = function() {
		$scope.fullScreen.isFullScreen = !$scope.fullScreen.isFullScreen;
	}
	
	// Cuepoints
	$scope.checkCuepoints = function(time) {
		var timeToCheck = $scope.getRoundedTime(time);

		// AXTELL this checks for 1.04, 1.05 AND 1.06 and checks

		if (clickXMap[timeToCheck] != null) { 
			// || clickXMap[timeToCheck-.01] != null
			// || clickXMap[time+.01] != null ) {
			$scope.pauseVideo();
			$scope.curStoppedTime = timeToCheck;
			redraw($scope.curStoppedTime);
			console.log("there is something at " + time);
		}
	};

	$scope.getRoundedTimePaused = function() {
		var time = $scope.videoPlayer.getCurrentTime();
		if ($scope.curStoppedTime != null) {
			return $scope.curStoppedTime;
		}
		return $scope.getRoundedTime(time);
	}

	$scope.getRoundedTime = function(time) {
		return Math.floor(100 * time) / 100;
	}
	
	// Drawing
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
	
	$scope.eraseDrawingsAtTimeStamp = function() {
		var timeStamp = $scope.getRoundedTimePaused();
		delete clickXMap[timeStamp];
		delete clickYMap[timeStamp];
		delete clickDragMap[timeStamp];
		context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight); // Clears the canvas
		var func = function findIndexByTimeStamp(drawingObject) {
			return drawingObject.time === timeStamp;
		};
		var index = $scope.drawingsAndNotes.findIndex(func);
		if (index > -1) {
			$scope.drawingsAndNotes.splice(index, 1);
		}
		$scope.saveDrawings(true);
	};
		
	function resizeCanvas() {
		xScale = context.canvas.clientWidth / parseFloat(1000);
		yScale = context.canvas.clientHeight / parseFloat(1000);
		
		canvas.setAttribute('height', context.canvas.clientHeight);
		canvas.setAttribute('width', context.canvas.clientWidth);
		
		if ($scope.videoPlayer != null) {
			redraw($scope.getRoundedTimePaused());
		}
	}

	function addClick(x, y, dragging) {
		var timeStamp = $scope.getRoundedTimePaused();

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
		redraw($scope.getRoundedTimePaused());
	});
	
	$('#coachingCanvas').mousemove(function(e) {
		if(paint){
			var mouseX = e.pageX - e.target.offsetParent.offsetLeft;
			var mouseY = e.pageY - e.target.offsetParent.offsetTop;
			addClick(mouseX, mouseY, true);
			redraw($scope.getRoundedTimePaused());
		}
	});
	
	$('#coachingCanvas').mouseup(function(e){
		paint = false;
	});
	
	$('#coachingCanvas').mouseleave(function(e){
		paint = false;
	});
	
	$scope.saveDrawings = function(fromDelete) {
		var timeStamp = $scope.getRoundedTimePaused();

		if (clickXMap[timeStamp] == null && !fromDelete) {
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
					return drawingObject.time === timeStamp;
				};
				if($scope.drawingsAndNotes.findIndex(func) === -1 && !fromDelete && screenIsNotEmpty(timeStamp)) {
					$scope.drawingsAndNotes.push({statName: 'DRAWING', time: timeStamp});
					$scope.drawingsAndNotes.sort(function(a, b){
						return a.time - b.time;
					});
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