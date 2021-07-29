angular.module('app').controller('WatchGameController', ['$scope', '$http', '$interval', '$sce', function($scope, $http, $interval, $sce) {
	
	$scope.Math = window.Math;

	$scope.playerVars = {
		fs: 0
	};
	
	$interval( function() {
		if ($scope.vidObj) {
			$scope.updateOnFieldPlayers();
			$scope.updateScoreboard();
		}
	},50);
	
	$scope.closeDialog = function(which) {
		document.getElementById(which).style.display='none';document.getElementById('fade').style.display='none';
	};
	
	$scope.getAllGames = function() {
		$scope.allGames = [];
		$http.get("/allGames/" + $scope.homeTeam).then(function(response) {
			$scope.allGames = response.data;
		});
    };
	
	$scope.getAllPlayers = function() {
		var idAndYearAndOpponent;
		idAndYearAndOpponent = $scope.vidObj.split(",");
		$scope.selectedVideo = idAndYearAndOpponent[0];
		// Set this to my videogular config
		var videoUrl = "https://www.youtube.com/watch?v=" + $scope.selectedVideo;
		$scope.year = idAndYearAndOpponent[1];
		$scope.awayTeam = idAndYearAndOpponent[2];
		$scope.allPlayers = [];
		$scope.allHomePlayers = [];
		$scope.allAwayPlayers = [];
		$scope.bothTeamsPlayersMap = new Map();

		$http.get("/allPlayers/" + $scope.homeTeam + "/" + $scope.year).then(function(response) {
			$scope.allPlayers += response.data;
			$scope.allHomePlayers = response.data;
			
			for (var i = 0; i < $scope.allHomePlayers.length; i++) {
				var currentPlayer = $scope.allHomePlayers[i]
				$scope.bothTeamsPlayersMap.set(currentPlayer.objectId, currentPlayer);
			}
			initVals();
		});

		$http.get("/allPlayers/" + $scope.awayTeam + "/" + $scope.year).then(function(response) {
			$scope.allPlayers += response.data;
			$scope.allAwayPlayers = response.data;
			
			for (var i = 0; i < $scope.allAwayPlayers.length; i++) {
				var currentPlayer = $scope.allAwayPlayers[i]
				$scope.bothTeamsPlayersMap.set(currentPlayer.objectId, currentPlayer);
			}
		});
    };
	
	function initVals() {
		// init filters
		$scope.playerFilter="allPlayers";
		$scope.eventFilter="allEvents";
		
		setOnFieldToBlank();
		$scope.subMap = new Map();
		$scope.originalStats = [];
		var statsUrl;
        statsUrl = "/allStats/" + $scope.selectedVideo
		$http.get(statsUrl).then(function(response) {
			for (var i = 0; i < response.data.length; i++) {
				var statObj = response.data[i]; // This is going to return every stat, both teams. How do I reconcile that? Why would I need to?
				$scope.originalStats.push(statObj);
				var id = statObj.player_id;
				var inId = statObj.player_in_id;
				var player = $scope.bothTeamsPlayersMap.get(id);
				var playerIn = $scope.bothTeamsPlayersMap.get(inId);
				if (player) {
					statObj.player_name = player.first_name + ' ' + player.last_name;
					statObj.player_first_name = player.first_name;
					statObj.player_last_name = player.last_name;
					statObj.player_display_name = getPlayerDisplayName(player.first_name, player.last_name);
				} else { 
					statObj.player_name = id;
				}
				if (playerIn) {
					statObj.player_in_name = playerIn.first_name + ' ' + playerIn.last_name;
					statObj.player_in_display_name = getPlayerDisplayName(playerIn.first_name, playerIn.last_name);
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
	}
	
	function setOnFieldToBlank() {
		var chaserA = {objectId:"chaserA", first_name:"Chaser", last_name:"A"};
		var chaserB = {objectId:"chaserB", first_name:"Chaser", last_name:"B"};
		var chaserC = {objectId:"chaserC", first_name:"Chaser", last_name:"C"};
		var keeperA = {objectId:"keeper", first_name:"Keeper", last_name:""};
		var beaterA = {objectId:"beaterA", first_name:"Beater", last_name:"A"};
		var beaterB = {objectId:"beaterB", first_name:"Beater", last_name:"B"};
		var seekerA = {objectId:"seeker", first_name:"Seeker", last_name:""};
        $scope.onFieldPlayersHome = [chaserA, chaserB, chaserC, keeperA, beaterA, beaterB, seekerA];
        
        var chaser1 = {objectId:"chaser1", first_name:"Chaser", last_name:"1"};
		var chaser2 = {objectId:"chaser2", first_name:"Chaser", last_name:"2"};
		var chaser3 = {objectId:"chaser3", first_name:"Chaser", last_name:"3"};
		var keeper1 = {objectId:"keeper1", first_name:"Keeper", last_name:"1"};
		var beater1 = {objectId:"beater1", first_name:"Beater", last_name:"1"};
		var beater2 = {objectId:"beater2", first_name:"Beater", last_name:"2"};
		var seeker1 = {objectId:"seeker1", first_name:"Seeker", last_name:"1"};
        $scope.onFieldPlayersAway = [chaser1, chaser2, chaser3, keeper1, beater1, beater2, seeker1];
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
		var endTime = $scope.videoPlayer.playerInfo.currentTime + 1;
		setOnFieldToBlank();
		for (var i = startTime; i < endTime; i++) {
			if ($scope.subMap.get(i) !== null && $scope.subMap.get(i) !== undefined) {
				var arrayOfSubs = $scope.subMap.get(i);
				for (var j = 0; j < arrayOfSubs.length; j++) {
					// debugger;
					applySub(arrayOfSubs[j]);
				}
			}
		}
	};
	
	$scope.toggleClock = function() {
		if ($scope.isRunning) {
			$scope.isRunning = false;
			addStat(null, null, 'PAUSE_CLOCK', null)
		} else {
			$scope.isRunning = true;
			addStat(null, null, 'START_CLOCK', null)
		}
	}
    
	// Axtell here... hm...
	var playerSelected;
	var overlayId;
	$scope.positionSelected;
	function startEvent(playerId, _overlayId) {
		$scope.videoPlayer.pauseVideo();
		playerSelected = playerId;
		overlayId = _overlayId;
		document.getElementById(_overlayId).style.display='flex';document.getElementById('fade').style.display='block';
	}

	$scope.startHomeEvent = function(playerId, position) {
		$scope.positionSelected = position;
		startEvent(playerId, 'allHomePlayersPicker');
	}

	$scope.startAwayEvent = function(playerId, position) {
		$scope.positionSelected = position;
		startEvent(playerId, 'allAwayPlayersPicker');
	}

	$scope.finishHomeEvent = function(playerSelectedOnOverlay, statSelectedOnOverlay) {
		$scope.finishEvent(playerSelectedOnOverlay, statSelectedOnOverlay, $scope.homeTeam);
		autoTogglePossession(statSelectedOnOverlay, true)
	}

	$scope.finishAwayEvent = function(playerSelectedOnOverlay, statSelectedOnOverlay) {
		if (isGroupStat(statSelectedOnOverlay)) {
			playerSelected = null;
		} 
		if (shouldConvertToHomeStat(statSelectedOnOverlay)) {
			statSelectedOnOverlay = convertToHomeStat(statSelectedOnOverlay)
			$scope.finishEvent(playerSelectedOnOverlay, statSelectedOnOverlay, $scope.homeTeam);
		} else {
			$scope.finishEvent(playerSelectedOnOverlay, statSelectedOnOverlay, $scope.awayTeam);
		}
		autoTogglePossession(statSelectedOnOverlay, false)
	}

	function isGroupStat(stat) {
		if (stat == "ZERO_BLUDGERS_FORCED" || stat == "ZERO_BLUDGERS_GIVEN") {
			return true;
		}
		return false;
	}

	function shouldConvertToHomeStat(stat) {
		if (stat == "ZERO_BLUDGERS_FORCED" || stat == "ZERO_BLUDGERS_GIVEN") {
			return true;
		} else {
			return false;
		}
	}

	function convertToHomeStat(stat) {
		if (stat == "ZERO_BLUDGERS_FORCED") {
			return "ZERO_BLUDGERS_GIVEN";
		}
		if (stat == "ZERO_BLUDGERS_GIVEN") {
			return "ZERO_BLUDGERS_FORCED";
		}
	}
	
	$scope.finishEvent = function(playerSelectedOnOverlay, statSelectedOnOverlay, teamId) {
		if (playerSelectedOnOverlay) {
			// this is a simple sub
			addStat(playerSelected, playerSelectedOnOverlay, statSelectedOnOverlay, teamId);
			$scope.closeDialog(overlayId);
			return;
		}
		if (statSelectedOnOverlay == null) {
			$scope.closeDialog(overlayId);
			return;
		}

		if (statSelectedOnOverlay == "YELLOW_CARD" || statSelectedOnOverlay == "RED_CARD") {
			addStat($scope.playerTapped, null, stat, teamId);
			if (isKeeper) {
				$scope.startHomeSwap(playerId);
			} else {
				$scope.closeDialog(overlayId);
			}
		} else if (statSelectedOnOverlay == "SWAP") {
		} else {
			if (statSelectedOnOverlay == "ZERO_BLUDGERS_FORCED" || statSelectedOnOverlay == "ZERO_BLUDGERS_GIVEN") {
				playerSelectedOnOverlay = null
			}
			addStat(playerSelected, null, statSelectedOnOverlay, teamId);
			$scope.closeDialog(overlayId)
		}
	}

	$scope.startHomeSwap = function(playerId) {
		$scope.statType = "SWAP";
		$scope.videoPlayer.pauseVideo();
		$scope.subbingPlayer = playerId;
		document.getElementById('onFieldPlayersHomePicker').style.display='flex';document.getElementById('fade').style.display='block';
	};
	
	$scope.startStat = function(stat) {
		if ($scope.subMap.size == 0) {
			addStat(null, null, stat, null);
		} else {
			$scope.statType = stat;
			$scope.videoPlayer.pauseVideo();
			document.getElementById('onFieldPlayersHomePicker').style.display='flex';document.getElementById('fade').style.display='block';
		}
	};
	
	$scope.playerClicked = function(playerInId, teamId) {
		if ($scope.statType == "SUB") {
			addStat($scope.subbingPlayer, playerInId, "SUB", teamId);
			$scope.closeDialog('allPlayersPicker');
		} else if ($scope.statType == "YELLOW_CARD" || $scope.statType == "RED_CARD") {
			addStat(playerInId, "null", $scope.statType, teamId);
			var indexOfCarded = -1;
			
			for (var i = 0; i < $scope.onFieldPlayersHome.length; i++) {
				if ($scope.onFieldPlayersHome[i]['objectId'] == playerInId) {
					indexOfCarded = i;
				}
			}
			if (indexOfCarded == 3) {
				$scope.startSwap(playerInId);
			} else {
				$scope.closeDialog('onFieldPlayersHomePicker');
			}
		} else if ($scope.statType == "SWAP") {
			addStat($scope.subbingPlayer, playerInId, "SWAP", teamId);
			$scope.closeDialog('onFieldPlayersHomePicker');
		} else {
			addStat(playerInId, null, $scope.statType, teamId);
			$scope.closeDialog('onFieldPlayersHomePicker');
		}
	};

	//startHomeEvent(null, 'possession')
	// finishHomeEvent(null, 'OFFENSE')
	$scope.startHomeOffensivePossession = function() {
		addStat(null, null, 'OFFENSE', $scope.homeTeam)
	}

	$scope.startAwayOffensivePossession = function() {
		addStat(null, null, 'DEFENSE', $scope.homeTeam)
	}

	$scope.homeTeamGainBludgers = function() {
		addStat(null, null, 'GAIN_CONTROL', $scope.homeTeam)
	}
	
	$scope.awayTeamGainBludgers = function() {
		addStat(null, null, 'LOSE_CONTROL', $scope.homeTeam)
	}
	
	function applySub(sub) {
		if (sub.team_id == $scope.homeTeam) {
			applyHomeSub(sub)
		} else {
			applyAwaySub(sub)
		}
	}
	
	function applyHomeSub(sub) {
		var index = -1;
		var swapIndex = -1;
		// both are 'not found'
		
		for (var i = 0; i < $scope.onFieldPlayersHome.length; i++) {
			if ($scope.onFieldPlayersHome[i].objectId == sub.player_id) {
				index = i;
			}
			if ($scope.onFieldPlayersHome[i].objectId == sub.player_in_id) {
				swapIndex = i;
			}
		}
		//index coming back as -1 each time
		// take a player from bench put them on field
		if (index != -1 && swapIndex == -1) {
			$scope.onFieldPlayersHome[index] = $scope.bothTeamsPlayersMap.get(sub.player_in_id);
		}
		// swap two on field players
		if (index != -1 && swapIndex != -1) {
			var temp = $scope.onFieldPlayersHome[index];
			$scope.onFieldPlayersHome[index] = $scope.onFieldPlayersHome[swapIndex];
			$scope.onFieldPlayersHome[swapIndex] = temp;
		}
	}

	function applyAwaySub(sub) {
		var index = -1;
		var swapIndex = -1;
		// both are 'not found'
		
		for (var i = 0; i < $scope.onFieldPlayersAway.length; i++) {
			if ($scope.onFieldPlayersAway[i].objectId == sub.player_id) {
				index = i;
			}
			if ($scope.onFieldPlayersAway[i].objectId == sub.player_in_id) {
				swapIndex = i;
			}
		}
		//index coming back as -1 each time
		if (index != -1 && swapIndex == -1) {
			$scope.onFieldPlayersAway[index] = $scope.bothTeamsPlayersMap.get(sub.player_in_id);
		}
		if (index != -1 && swapIndex != -1) {
			var temp = $scope.onFieldPlayersAway[index];
			$scope.onFieldPlayersAway[index] = $scope.onFieldPlayersAway[swapIndex];
			$scope.onFieldPlayersAway[swapIndex] = temp;
		}

	}
	
	$scope.updateScoreboard = function() {
		if ($scope.originalStats == undefined) {
			return;
		}
		$scope.gameTime = getDisplayTime($scope.videoPlayer.playerInfo.currentTime, $scope.originalStats);

		var endTime = $scope.videoPlayer.playerInfo.currentTime + 1;
		$scope.homeScore = 0;
		$scope.awayScore = 0;
		
		$scope.curOD = "?";
		$scope.curBludgers = 0;
		$scope.curControl = "?";
		$scope.isRunning = false;
		$scope.previousStart = 0;
		$scope.previousPause = 0;
		
		for (var i = 0; i < $scope.originalStats.length; i++) {
			var curStat = $scope.originalStats[i];
			if (curStat.time > endTime) {
				break;
			}
			if (curStat.stat_name === "GOAL" && curStat.team_id == $scope.homeTeam) {
				$scope.homeScore += 10;
			}
			if ((curStat.stat_name === "GOAL" && curStat.team_id == $scope.awayTeam) || curStat.stat_name === 'AWAY_GOAL') {
				$scope.awayScore += 10;
			}
			if (curStat.stat_name === "SNITCH_CATCH") {
				$scope.homeScore += 35;
			}
			if (curStat.stat_name === "AWAY_SNITCH_CATCH") {
				$scope.awayScore += 35;
			}
			if (curStat.stat_name === "OFFENSE") {
				$scope.curOD = "Home Team";
			}
			if (curStat.stat_name === "DEFENSE") {
				$scope.curOD = "Away Team";
			}
			if (curStat.stat_name === "GAIN_CONTROL") {
				$scope.curControl = "Home Team";
			}
			if (curStat.stat_name === "LOSE_CONTROL") {
				$scope.curControl = "Away Team";
			}
			if (curStat.stat_name === "START_CLOCK") {
				$scope.isRunning = true;
				$scope.previousStart = curStat.time;
			}
			if (curStat.stat_name === "PAUSE_CLOCK") {
				$scope.isRunning = false;
				$scope.previousPause = curStat.time;
			}
		}
	};
	
	$scope.addCard = function(cardType) {
		$scope.statType = cardType;
		$scope.videoPlayer.pauseVideo();
		
		document.getElementById('onFieldPlayersHomePicker').style.display='flex';document.getElementById('fade').style.display='block';
	};

	/**
	 * Adds a stat to the backend. Upon receipt of the response, adds it to the events list in order
	 * 
	 * @param {string} playerId 
	 * @param {string} playerInId 
	 * @param {string} stat 
	 * @param {string} teamId 
	 * @param {int} timeAdjust Amount of time to add or subtract from the current game time for the event
	 */
	function addStat(playerId, playerInId, stat, teamId, timeAdjust = 0) {
		$scope.videoPlayer.pauseVideo();
		// no such thing as an "opposite" stat. It just happens and I need to filter it query-side

		var timeOfEvent = $scope.videoPlayer.playerInfo.currentTime + timeAdjust;
		
		var data = {
				team_id : teamId,
				vid_id : $scope.selectedVideo,
				year : $scope.year,
				player_id : playerId,
				player_in_id : playerInId,
				time : timeOfEvent,
				stat : stat,
		};
		
		$http.post("/addStat", data).then(function(response){
			var id = response.data.player_id;
			var inId = response.data.player_in_id;
			var player = $scope.bothTeamsPlayersMap.get(id);
			var playerIn = $scope.bothTeamsPlayersMap.get(inId);
			if (player) {
				response.data.player_name = player.first_name + ' ' + player.last_name;
				response.data.player_display_name = getPlayerDisplayName(player.first_name, player.last_name);
			} else {
				response.data.player_name = null;
			}
			if (playerIn) {
				response.data.player_in_name = playerIn.first_name + ' ' + playerIn.last_name;
				response.data.player_in_display_name = getPlayerDisplayName(playerIn.first_name, playerIn.last_name);
			} else {
				response.data.player_in_name = inId;
			}
			$scope.originalStats.push(response.data);

			if (stat === "SUB" || stat == "SWAP") {
				addSubToMap(response.data);
				applySub(response.data);
			}
			if (stat === "SNITCH_CATCH" || stat === "AWAY_SNITCH_CATCH") {
				addStat(null, null, "PAUSE_CLOCK", null);
			}

			$scope.originalStats.sort(function(a, b){
				return a.time - b.time;
			});
			$scope.filterEvents('added');
		});
		
		// data.team_id
		
		// $http.post("/addStat",)
	};

	function getPlayerDisplayName(firstName, lastName) {
		return firstName.slice(0, 2) + ". " + lastName;
	}
	
	$scope.addOppositeStat = function(stat, teamId) {
		var teamIdToUse;
		if (teamId == $scope.homeTeam) {
			teamIdToUse = $scope.awayTeam;
		} else {
			teamIdToUse = $scope.homeTeam;
		}
		if (stat == 'OFFENSE') {
			stat = 'DEFENSE';
		} else if (stat == 'DEFENSE') {
			stat = 'OFFENSE';
		} else if (stat == 'GOAL') {
			stat = 'AWAY_GOAL';
		} else if (stat == 'GAIN_CONTROL') {
			stat = 'LOSE_CONTROL';
		} else if (stat == 'LOSE_CONTROL') {
			stat = 'GAIN_CONTROL';
		} else if (stat == 'SNITCH_CATCH') {
			stat = 'AWAY_SNITCH_CATCH';
		 } else {
			console.log("No opposite stat to add (like a sub)");
			// do nothing, but DO return
			return;
		}
		var data = {
				team_id : teamIdToUse,
				vid_id : $scope.selectedVideo,
				year : $scope.year,
				player_id : null,
				player_in_id : null,
				time : $scope.videoPlayer.playerInfo.currentTime,
				stat : stat
		};
		
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
		$http.post("/deleteStat", data).then(function(response) {
			var index = findStatIndex(response.data);
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
		$scope.seekToTime('replay', $scope.videoPlayer.playerInfo.currentTime);
	};

	$scope.skipForward = function() {
		$scope.seekToTime('forward', $scope.videoPlayer.playerInfo.currentTime);
	}
	
	$scope.seekToTime = function(statName, time) {
		if (statName == 'SUB' || statName == "SWAP" || statName == 'PAUSE_CLOCK' || statName == 'START_CLOCK') {
			$scope.videoPlayer.seekTo(time);
		} else if (statName == 'replay') {
			$scope.videoPlayer.seekTo(time-5);
		} else if (statName == 'forward') {
			$scope.videoPlayer.seekTo(time+5);
		} else {
			$scope.videoPlayer.seekTo(time-5);
		}
	};

	$scope.togglePublic = function() {
		if ($scope.statsPublic) {
			alert("You have now made the stats for this game publically available. This will also show your username under the 'Public Stats' tab. You may undo this at any time by flipping the switch back to private");
		}
		var data = {
				team_id : $scope.homeTeam,
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
		// var url = "quid-stats-website-bta02.c9users.io/public/" + author + "/" + $scope.homeTeam + "/" + $scope.selectedVideo + "/" + $scope.year + "/" + $scope.playerFilter + "/" + $scope.eventFilter;
		var url = "quidstats.herokuapp.com/public/" + author + "/" + $scope.homeTeam + "/" + $scope.selectedVideo + "/" + $scope.year + "/" + $scope.playerFilter + "/" + $scope.eventFilter;
		prompt("The following URL will bring someone to this page, with the filters set as they are now. They will not be able to edit events. If the 'Public' switch is put back to 'Private', this URL will break", url);
	};

	/**
	 * Function to toggle quaffle possession. This should give quaffle to the other team on
	 * goals, takeaways, and turnovers for the home team only. Only an "away goal" should cause
	 * an auto-toggle on the possession. The tenet here is that every offensive possession ends with
	 * a "shot", "goal", or "turnover".
	 * 
	 * @param {*} stat String name of the stat being recorded 
	 * @param {*} homeTeam Indicates if the "home" team did the stat. True if yes, false if no
	 */
	function autoTogglePossession(stat, homeTeam) {
		if (stat == 'AWAY_GOAL') {
			addStat(null, null, 'OFFENSE', $scope.homeTeam, 1)
			return;
		}
		if (homeTeam) {
			if (stat == 'GOAL' || stat == 'TURNOVER') {
				addStat(null, null, 'DEFENSE', $scope.homeTeam, 1)
			} else if (stat === 'TAKEAWAY') {
				addStat(null, null, 'OFFENSE', $scope.homeTeam, 1)
			}
			return;
		}
		if (!homeTeam) {
			if (stat == 'GOAL') {
				addStat(null, null, 'OFFENSE', $scope.homeTeam, 1)
			}
			return
		}
	}

	/**
	 * Record a generic "Away Goal" event for one-sided stats recording
	 */
	$scope.startAwayGoal = function() {
		addStat(null, null, 'AWAY_GOAL', null);
	}

	/**
	 * @param {*} videoTime current video time
	 * @param {*} statsList list of all stats events
	 */
	function calculateGameTimeSeconds(videoTime, statsList) {
		var totalTimeToRemove = 0;

		var paused = true;
		var breakPoint = 0;
		for (var i = 0; i < statsList.length; i++) {
			var curStat = statsList[i];
			if (curStat.time > videoTime + 1) {
				break;
			}

			if (curStat.stat_name === 'START_CLOCK') {
				if (paused) {
					totalTimeToRemove += curStat.time - breakPoint;
				}
				paused = false;
			} else if (curStat.stat_name === 'PAUSE_CLOCK') {
				paused = true;
				breakPoint = curStat.time;
			}
		}
		if (paused) {
			return breakPoint - totalTimeToRemove;
		} else {
			return videoTime - totalTimeToRemove
		}
	}

	function getDisplayTime(videoTime, statsList) {
		var totalTimeSeconds = calculateGameTimeSeconds(videoTime, statsList);
		var minutes = totalTimeSeconds / 60;
		var seconds = totalTimeSeconds % 60; 
		if (seconds < 10) {
			return Math.trunc(minutes) + ":0" + Math.trunc(seconds)
		} else {
			return Math.trunc(minutes) + ":" + Math.trunc(seconds)
		}
	}
	
}]);