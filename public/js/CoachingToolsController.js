angular.module('app').controller('CoachingToolsController', ['$scope', '$http', '$interval', '$sce', function($scope, $http, $interval, $sce) {
    
	// Videogular code
	var controller = this;
	controller.API = null;
	controller.onPlayerReady = function(API) {
		controller.API = API;
	};
	
	this.onEnterDrawing = function onEnter(currentTime, timeLapse, params) {
		this.API.pause();
		redraw();
	};
	this.onEnterNote = function onLeave(currentTime, timeLapse, params) {
		// alert("hey");
	};
	this.onEnterEvent = function onLeave(currentTime, timeLapse, params) {
		// alert("he1y");
	};
	
	this.config = {
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
	
	this.addCuePoint = function(timeStamp) {
		var point = {
			timeLapse: {
				start: timeStamp
			},
			onEnter: this.onEnterDrawing.bind(this),
		};
		this.controller.cuePoints.events.push(point);
	};


	$scope.Math = window.Math;
	
	$interval( function(){
		if ($scope.videoPlayer !== null && $scope.videoPlayer !== undefined) {
			$scope.updateOnFieldPlayers();
			$scope.updateScoreboard();
			// focus the player so that when you click elsewhere, video gets the focus back
		}
	},100);
	
	$scope.closeDialog = function(which) {
		document.getElementById(which).style.display='none';document.getElementById('fade').style.display='none';
	};
	
	$scope.getAllGames = function() {
		$scope.allGames = [];
		$http.get("/allGames/" + $scope.team).then(function(response) {
			$scope.allGames = response.data;
		});
	};
	
	$scope.getAllPlayers = function() {
		var idAndYearAndOpponent;
		idAndYearAndOpponent = $scope.vidObj.split(",");
		$scope.selectedVideo = idAndYearAndOpponent[0];
		// Set this to my videogular config
		var videoUrl = "https://www.youtube.com/watch?v=" + $scope.selectedVideo;
		this.controller.config['sources'] = [{src:videoUrl}];
		$scope.year = idAndYearAndOpponent[1];
		$scope.opponent = idAndYearAndOpponent[2];
		$scope.allPlayers = [];
		$http.get("/allPlayers/" + $scope.team + "/" + $scope.year).then(function(response) {
			$scope.allPlayers = response.data;
			$scope.playersMap = new Map();
			for (var i = 0; i < $scope.allPlayers.length; i++) {
				$scope.playersMap.set($scope.allPlayers[i].objectId, $scope.allPlayers[i]);
			}
			initVals();
		});
	};
	
	function initVals() {
		// init filters
		$scope.playerFilter="allPlayers";
		$scope.eventFilter="allEvents";
		
		setOnFieldToBlank();
		$scope.subMap = new Map();
		$scope.originalStats = [];
		$scope.drawingsAndNotes = [];
		clickXMap = {};
		clickYMap = {};
		clickDragMap = {};
		var statsUrl;
		var notesUrl;
		statsUrl = "/allStats/" + $scope.selectedVideo + "/" + $scope.team;
		notesUrl = "/allNotes/" + $scope.selectedVideo + "/" + $scope.team;
		$http.get(statsUrl).then(function(response) {
			for (var i = 0; i < response.data.length; i++) {
				var statObj = response.data[i];
				$scope.originalStats.push(statObj);
				var id = statObj.player_id;
				var inId = statObj.player_in_id;
				var player = $scope.playersMap.get(id);
				var playerIn = $scope.playersMap.get(inId);
				if (player) {
					statObj.player_name = player.first_name + ' ' + player.last_name;
				} else {
					statObj.player_name = id;

				}
				if (playerIn) {
					statObj.player_in_name = playerIn.first_name + ' ' + playerIn.last_name;
				} else {
					statObj.player_in_name = inId;
				}
				if (statObj.stat_name === "SUB" || statObj.stat_name === "SWAP") {
					addSubToMap(statObj);
				}
			}
			$scope.originalStats.sort(function(a, b){
					return a.time - b.time;
				});
			$scope.filterEvents('init');
		});
		
		if (notesUrl != undefined) {
			$http.get(notesUrl).then(function(response) {
				for (var i = 0; i < response.data.length; i++) {
					response.data[i].stat_name = "NOTE";
					$scope.originalStats.push(response.data[i]);
					$scope.drawingsAndNotes.push(response.data[i]);
				}
				$scope.originalStats.sort(function(a, b){
						return a.time - b.time;
					});
				$scope.filterEvents('init');
				$scope.drawingsAndNotes.sort(function(a, b){
					return a.time - b.time;
				});
			});
		}
		
		$http.get("/videoPermissions/" + $scope.team + "/" + $scope.selectedVideo).then(function(response) {
			if (response.data == 'true') {
				$scope.statsPublic = true;
			} else {
				$scope.statsPublic = false;
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
					this.addCuePoint(parseFloat(key));
				}
			}
			$scope.drawingsAndNotes.sort(function(a, b){
				return a.time - b.time;
			});
		});
	}
	
	function setOnFieldToBlank() {
		var chaserA = {objectId:"chaserA", first_name:"Chaser", last_name:"A"};
		var chaserB = {objectId:"chaserB", first_name:"Chaser", last_name:"B"};
		var chaserC = {objectId:"chaserC", first_name:"Chaser", last_name:"C"};
		var keeper = {objectId:"keeper", first_name:"Keeper", last_name:""};
		var beaterA = {objectId:"beaterA", first_name:"Beater", last_name:"A"};
		var beaterB = {objectId:"beaterB", first_name:"Beater", last_name:"B"};
		var seeker = {objectId:"seeker", first_name:"Seeker", last_name:""};
		$scope.onFieldPlayers = [chaserA, chaserB, chaserC, keeper, beaterA, beaterB, seeker];
	}
	
	function addSubToMap(subStat) {
		var arrayAtTime = $scope.subMap.get(subStat.time);
		if (arrayAtTime !== null && arrayAtTime !== undefined) {
			arrayAtTime.push(subStat);
		} else {
			arrayAtTime = [subStat];
			$scope.subMap.set(subStat.time, arrayAtTime);
		}
	}
	
	function removeSubFromMap(subStat) {
		if (subStat.stat_name != "SUB" && subStat.stat_name != "SWAP") {
			return;
		}
		var arrayAtTime = $scope.subMap.get(subStat.time);

		if (arrayAtTime !== null) {
			var index = -1;
			for(var i = 0; i < arrayAtTime.length; i++) {
				if (arrayAtTime[i].objectId === subStat.objectId) {
					index = i;
					break;
				}
			}

			//finds the object index
			if (index > -1) {
				arrayAtTime.splice(index, 1);

			}
		}
	}
 
	$scope.updateOnFieldPlayers = function() {
		if (!$scope.videoPlayer) {
			return;
		}
		var startTime = 0;
		var endTime = $scope.videoPlayer.getCurrentTime() + 1;
		setOnFieldToBlank();
		for (var i = startTime; i < endTime; i++) {
			if ($scope.subMap.get(i) !== null && $scope.subMap.get(i) !== undefined) {
				var arrayOfSubs = $scope.subMap.get(i);
				for (var j = 0; j < arrayOfSubs.length; j++) {
					applySub(arrayOfSubs[j]);
				}
			}
		}
	};
 
	$scope.startSub = function(playerId) {
		$scope.statType = "SUB";
		$scope.videoPlayer.pauseVideo();
		$scope.subbingPlayer = playerId;
		document.getElementById('allPlayersPicker').style.display='block';document.getElementById('fade').style.display='block';
	};
 
	$scope.startSwap = function(playerId) {
		$scope.statType = "SWAP";
		$scope.videoPlayer.pauseVideo();
		$scope.subbingPlayer = playerId;
		document.getElementById('onFieldPlayersPicker').style.display='block';document.getElementById('fade').style.display='block';
	};
	
	$scope.startStat = function(stat) {
		// Axtell here
		// This is the idea that, when adding stats, if there are no subs, just add generic stats
		if ($scope.subMap.size == 0) {
			$scope.addStat(null, null, stat, null);
		} else {
			$scope.statType = stat;
			$scope.videoPlayer.pauseVideo();
			document.getElementById('onFieldPlayersPicker').style.display='block';document.getElementById('fade').style.display='block';
		}
	};
	
	$scope.playerClicked = function(playerInId) {
		if ($scope.statType == "SUB") {
			$scope.addStat($scope.subbingPlayer, playerInId, "SUB");
			$scope.closeDialog('allPlayersPicker');
		} else if ($scope.statType == "YELLOW_CARD" || $scope.statType == "RED_CARD") {
			$scope.addStat(playerInId, "null", $scope.statType);
			var indexOfCarded = -1;
			
			for (var i = 0; i < $scope.onFieldPlayers.length; i++) {
				if ($scope.onFieldPlayers[i]['objectId'] == playerInId) {
					indexOfCarded = i;
				}
			}
			if (indexOfCarded == 3) {
				$scope.startSwap(playerInId);
			} else {
				$scope.closeDialog('onFieldPlayersPicker');
			}
		} else if ($scope.statType == "SWAP") {
			$scope.addStat($scope.subbingPlayer, playerInId, "SWAP");
			$scope.closeDialog('onFieldPlayersPicker');
		} else {
			$scope.addStat(playerInId, null, $scope.statType, null);
			$scope.closeDialog('onFieldPlayersPicker');
		}
	};
	
	function applySub(sub) {
		var index = -1;
		var swapIndex = -1;
		// both are 'not found'
		
		for (var i = 0; i < $scope.onFieldPlayers.length; i++) {
			if ($scope.onFieldPlayers[i].objectId == sub.player_id) {
				index = i;
			}
			if ($scope.onFieldPlayers[i].objectId == sub.player_in_id) {
				swapIndex = i;
			}
		}
		//index coming back as -1 each time
		if (index != -1 && swapIndex == -1) {
			$scope.onFieldPlayers[index] = $scope.playersMap.get(sub.player_in_id);
		}
		if (index != -1 && swapIndex != -1) {
			var temp = $scope.onFieldPlayers[index];
			$scope.onFieldPlayers[index] = $scope.onFieldPlayers[swapIndex];
			$scope.onFieldPlayers[swapIndex] = temp;
		}
	}
	
	$scope.updateScoreboard = function() {
		var endTime = $scope.videoPlayer.getCurrentTime() + 1;
		$scope.homeScore = 0;
		$scope.awayScore = 0;
		
		$scope.curOD = "?";
		$scope.curBludgers = 0;
		$scope.curControl = -1;
		
		for (var i = 0; i < $scope.originalStats.length; i++) {
			if ($scope.originalStats[i].time > endTime) {
				break;
			}
			if ($scope.originalStats[i].stat_name === "GOAL") {
				$scope.homeScore += 1;
			}
			if ($scope.originalStats[i].stat_name === "AWAY_GOAL") {
				$scope.awayScore += 1;
			}
			if ($scope.originalStats[i].stat_name === "SNITCH_CATCH") {
				$scope.homeScore += 3;
			}
			if ($scope.originalStats[i].stat_name === "AWAY_SNITCH_CATCH") {
				$scope.awayScore += 3;
			}
			if ($scope.originalStats[i].stat_name === "OFFENSE") {
				$scope.curOD = "OFFENSE";
				$scope.curBludgers = $scope.originalStats[i].bludger_count;
			}
			if ($scope.originalStats[i].stat_name === "DEFENSE") {
				$scope.curOD = "DEFENSE";
				$scope.curBludgers = $scope.originalStats[i].bludger_count;
			}
			if ($scope.originalStats[i].stat_name === "GAIN_CONTROL") {
				$scope.curControl = 1;
			}
			if ($scope.originalStats[i].stat_name === "LOSE_CONTROL") {
				$scope.curControl = 0;
			}

		}
	};
	
	$scope.addCard = function(cardType) {
		$scope.statType = cardType;
		$scope.videoPlayer.pauseVideo();
		
		document.getElementById('onFieldPlayersPicker').style.display='block';document.getElementById('fade').style.display='block';
	};
	
	$scope.startNote = function() {
		$scope.videoPlayer.pauseVideo();
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
	
	$scope.addStat = function(playerId, playerInId, stat, bludgers) {
		$scope.videoPlayer.pauseVideo();
		$scope.addOppositeStat(stat, bludgers);
		
		var data = {
				team_id : $scope.team,
				vid_id : $scope.selectedVideo,
				year : $scope.year,
				player_id : playerId,
				player_in_id : playerInId,
				time : $scope.videoPlayer.getCurrentTime(),
				stat : stat,
				bludger_count : bludgers
		};
		
		$http.post("/addStat", data).then(function(response){
			var id = response.data.player_id;
			var inId = response.data.player_in_id;
			var player = $scope.playersMap.get(id);
			var playerIn = $scope.playersMap.get(inId);
			if (player) {
				response.data.player_name = player.first_name + ' ' + player.last_name;
			} else {
				response.data.player_name = null;
			}
			if (playerIn) {
				response.data.player_in_name = playerIn.first_name + ' ' + playerIn.last_name;
			} else {
				response.data.player_in_name = inId;
			}
			$scope.originalStats.push(response.data);

			if (stat === "SUB" || stat == "SWAP") {
				addSubToMap(response.data);
				applySub(response.data);
			}
			if (stat === "SNITCH_CATCH" || stat === "AWAY_SNITCH_CATCH") {
				$scope.addStat(null, null, "PAUSE_CLOCK");
			}

			$scope.originalStats.sort(function(a, b){
				return a.time - b.time;
			});
			$scope.filterEvents('added');
		});
		
		// data.team_id
		
		// $http.post("/addStat",)
	};
	
	$scope.addOppositeStat = function(stat, bludgers) {
		console.log("adding opposite of", stat, bludgers);
		// gotta get the opponent somehow
		// also have to inverse the stat as well
		if (stat == 'OFFENSE') {
			stat = 'DEFENSE';
		} else if (stat == 'DEFENSE') {
			stat = 'OFFENSE';
		} else if (stat == 'OFFENSIVE_DRIVE') {
			stat = 'DEFENSIVE_DRIVE';
		} else if (stat == 'DEFENSIVE_DRIVE') {
			stat = 'OFFENSIVE_DRIVE';
		} else if (stat == 'GOAL') {
			stat = 'AWAY_GOAL';
		} else if (stat == 'AWAY_GOAL') {
			stat = 'GOAL';
		} else if (stat == 'GAIN_CONTROL') {
			stat = 'LOSE_CONTROL';
		} else if (stat == 'LOSE_CONTROL') {
			stat = 'GAIN_CONTROL';
		} else if (stat == 'SEEKERS_RELEASED') {
			// do nothing, but don't return
		} else if (stat == 'SNITCH_CATCH') {
			stat = 'AWAY_SNITCH_CATCH';
		} else if (stat == 'AWAY_SNITCH_CATCH') {
			stat = 'SNITCH_CATCH';
		} else if (stat == 'START_CLOCK') {
			// do nothing, but don't return
		} else if (stat == 'PAUSE_CLOCK') {
			// do nothing, but don't return
		} else {
			console.log("in here for some reason");
			// do nothing, but DO return
			return;
		}
		var data = {
				team_id : $scope.opponent,
				vid_id : $scope.selectedVideo,
				year : $scope.year,
				player_id : null,
				player_in_id : null,
				time : $scope.videoPlayer.getCurrentTime(),
				stat : stat,
				bludger_count : bludgers
		};
		
		if ($scope.opponent == null) {
			console.log("opponent is null");
			return;
		}
		// Don't actually need to do anything, just post the opposite, niiiice
		$http.post("/addStat", data).then(function(response){
			// I'm going to need to handle this
			console.log("adding opposite response", response)
		});
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
			removeSubFromMap(response.data);
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
		$scope.seekToTime("", $scope.videoPlayer.getCurrentTime());
	};

	$scope.seekToTime = function(statName, time) {
		if (statName == 'SUB' || statName == "SWAP" || statName == 'PAUSE_CLOCK' || statName == 'START_CLOCK') {
			$scope.videoPlayer.seekTo(time);
		} else {
			$scope.videoPlayer.seekTo(time-5);
		}
	};

	$scope.adjustTime = function(val, curTime, id) {
		var newTime = curTime + val;
		$http.get("/updateStatTime/" + id + "/" + newTime).then(function(response) {
			// update the stat box visuals
			// maybe even resort?
			// would reloading the list work better?
		});
	};

	$scope.togglePublic = function() {
		if ($scope.statsPublic) {
			alert("You have now made the stats for this game publically available. This will also show your username under the 'Public Stats' tab. You may undo this at any time by flipping the switch back to private");
		}
		var data = {
				team_id : $scope.team,
				vid_id : $scope.selectedVideo,
				privacy : $scope.statsPublic
		};
		$http.post("/setPermissions", data).then(function(response) {});
	};
	
	$scope.filterEvents = function(whichFilter) {
		if (!$scope.playerFilter || !$scope.eventFilter) {
			return;
		}
		$scope.displayStats = [];
		if (
				($scope.eventFilter == "AWAY_GOAL" 
				|| $scope.eventFilter == "NOTE"
				|| $scope.eventFilter == "GAIN_CONTROL"
				|| $scope.eventFilter == "LOSE_CONTROL"
				|| $scope.eventFilter == "OFFENSE"
				|| $scope.eventFilter == "OFFENSIVE_DRIVE"
				|| $scope.eventFilter == "DEFENSE"
				|| $scope.eventFilter == "DEFENSIVE_DRIVE") 
				&& whichFilter == 'events') {
			$scope.playerFilter = "allPlayers";
		}
		
		for (var i = 0; i < $scope.originalStats.length; i++) {
			var statName = $scope.originalStats[i].stat_name;
			var player1 = $scope.originalStats[i].player_id;
			var player2 = $scope.originalStats[i].player_in_id;
			
			var eventMatch = false;
			var playerMatch = false;
			
			if ($scope.eventFilter == statName || $scope.eventFilter == "allEvents") {
				eventMatch = true;
			}
			if ($scope.eventFilter == "allEvents" && statName == "NOTE") {
				eventMatch = false;
			}
			if ($scope.playerFilter == player1 || $scope.playerFilter == player2) {
				playerMatch = true;
			}
			if ($scope.playerFilter == "allPlayers") {
				playerMatch = true;
			}
			if (eventMatch && playerMatch) {
				$scope.displayStats.push($scope.originalStats[i]);
			}
			
			
		}

	};
	
	$scope.getURLWithFilters = function(author) {
		// var url = "quid-stats-website-bta02.c9users.io/public/" + author + "/" + $scope.team + "/" + $scope.selectedVideo + "/" + $scope.year + "/" + $scope.playerFilter + "/" + $scope.eventFilter;
		var url = "quidstats.herokuapp.com/public/" + author + "/" + $scope.team + "/" + $scope.selectedVideo + "/" + $scope.year + "/" + $scope.playerFilter + "/" + $scope.eventFilter;
		prompt("The following URL will bring someone to this page, with the filters set as they are now. They will not be able to edit events. If the 'Public' switch is put back to 'Private', this URL will break", url);
	};
	
	$scope.showNote = function(index) {
		$scope.videoPlayer.pauseVideo();
		$scope.displayNoteText = $scope.displayStats[index].note;
		document.getElementById('displayNoteOverlay').style.display='block';document.getElementById('fade').style.display='block';
	};
	
	// Start of drawing stuff
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
	
	$scope.togglePenTool = function(valToMoveTo) {
		if($scope.videoPlayer == undefined) {
			return;
		}
		if(valToMoveTo != undefined) {
			$scope.penSelected = valToMoveTo;
		} else {
			$scope.penSelected = !$scope.penSelected;
		}
		if($scope.penSelected) {
			$scope.videoPlayer.pauseVideo();
			document.getElementById('coachingCanvas').style.zIndex = 2;
			$scope.penButtonText = "Done Drawing";
			resizeCanvas();
		} else {
			document.getElementById('coachingCanvas').style.zIndex = -1;
			$scope.penButtonText = "Start Drawing";
		} 
		redraw();
		$scope.saveDrawings();
	};
	
	$scope.eraseDrawingsAtTimeStamp = function() {
		var timeStamp = $scope.videoPlayer.getCurrentTime();
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
		$scope.videoPlayer.seekTo($scope.videoPlayer.getCurrentTime() + .1);
		context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight); // Clears the canvas
		// $scope.videoPlayer.playVideo();
	};
	
	$scope.pauseVideo = function() {
		$scope.saveDrawings();
		// $scope.videoPlayer.pauseVideo();
	};
	
	function resizeCanvas() {
		xScale = context.canvas.clientWidth / parseFloat(1000);
		yScale = context.canvas.clientHeight / parseFloat(1000);
		
		canvas.setAttribute('height', context.canvas.clientHeight);
		canvas.setAttribute('width', context.canvas.clientWidth);
		
		redraw();
	}

	function addClick(x, y, dragging) {
		var timeStamp = $scope.videoPlayer.getCurrentTime();
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
		
		// add a cuepoint, right?
		addCuePoint(timeStamp);
	}
	
	
	function redraw(isFromPaused) {
		var timeStamp = $scope.videoPlayer.getCurrentTime();
		timeStamp = (Math.round(timeStamp * 10) / 10);
		timeStamp = JSON.parse(JSON.stringify(timeStamp));
		context.strokeStyle = "#ffff00";
		context.lineJoin = "round";
		context.lineWidth = 5;
		if (clickXMap[timeStamp]) {
			context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight); // Clears the canvas
			$scope.videoPlayer.pauseVideo();
			if(isFromPaused) {
				$scope.videoPlayer.seekTo(timeStamp);
				$scope.togglePenTool(true);
			}
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
		redraw();
	});
	
	$('#coachingCanvas').mousemove(function(e) {
		if(paint){
			var mouseX = e.pageX - e.target.offsetParent.offsetLeft;
			var mouseY = e.pageY - e.target.offsetParent.offsetTop;
			addClick(mouseX, mouseY, true);
			redraw();
		}
	});
	
	$('#coachingCanvas').mouseup(function(e){
		paint = false;
	});
	
	$('#coachingCanvas').mouseleave(function(e){
		paint = false;
	});
	
	$scope.saveDrawings = function(fromDelete) {
		var timeStamp = $scope.videoPlayer.getCurrentTime();
		timeStamp = (Math.round(timeStamp * 10) / 10);
		// if there are no drawings at this timestamp don't add anything to the thing...
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