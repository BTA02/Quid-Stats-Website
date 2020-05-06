angular.module('app').controller('OverlayRecordStatsController', ['$scope', '$http', '$interval', '$sce', function($scope, $http, $interval, $sce) {
	
	$scope.Math = window.Math;
	
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
        $scope.homePlayersMap = new Map();
        $scope.getAllHomePlayers();
        $scope.getAllAwayPlayers();
    }
	
	$scope.getAllHomePlayers = function() {
		var idAndYearAndOpponent;
		idAndYearAndOpponent = $scope.vidObj.split(",");
		$scope.selectedVideo = idAndYearAndOpponent[0];
		// Set this to my videogular config
		var videoUrl = "https://www.youtube.com/watch?v=" + $scope.selectedVideo;
		$scope.year = idAndYearAndOpponent[1];
		$scope.awayTeam = idAndYearAndOpponent[2];
		$scope.allHomePlayers = [];
		$http.get("/allPlayers/" + $scope.homeTeam + "/" + $scope.year).then(function(response) {
			$scope.allHomePlayers = response.data;
			for (var i = 0; i < $scope.allHomePlayers.length; i++) {
				$scope.bothTeamsPlayersMap.set($scope.homePlayers[i].objectId, $scope.allPlayers[i]);
			}
			initVals();
		});
    };
    
    $scope.getAllAwayPlayers = function() {
        var idAndYearAndOpponent;
		idAndYearAndOpponent = $scope.vidObj.split(",");
		$scope.selectedVideo = idAndYearAndOpponent[0];
		// Set this to my videogular config
		$scope.year = idAndYearAndOpponent[1];
		$scope.awayTeam = idAndYearAndOpponent[2];
        $scope.allAwayPlayers = [];
        // Axtell check $scope.opponent here
		$http.get("/allPlayers/" + $scope.opponent + "/" + $scope.year).then(function(response) {
			$scope.allAwayPlayers = response.data;
			for (var i = 0; i < $scope.allAwayPlayers.length; i++) {
				$scope.bothTeamsPlayersMap.set($scope.awayPlayers[i].objectId, $scope.allPlayers[i]);
			}
			initVals();
		});
    }
	
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
				var statObj = response.data[i]; // This is going to return every stat, both teams. How do I reconcile that?
				$scope.originalStats.push(statObj);
				var id = statObj.player_id;
				var inId = statObj.player_in_id;
				var player = $scope.bothTeamsPlayersMap.get(id);
				var playerIn = $scope.bothTeamsPlayersMap.get(inId);
				if (player) {
					statObj.player_name = player.first_name + ' ' + player.last_name;
					statObj.player_first_name = player.first_name;
					statObj.player_last_name = player.last_name;
					statObj.player_display_name = player.first_name[0] + '. ' + player.last_name;
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
        
        // I don't really need this
		if (notesUrl != undefined) {
			$http.get(notesUrl).then(function(response) {
				for (var i = 0; i < response.data.length; i++) {
					response.data[i].stat_name = "NOTE";
					$scope.originalStats.push(response.data[i]);
				}
				$scope.originalStats.sort(function(a, b){
						return a.time - b.time;
					});
				$scope.filterEvents('init');
			});
		}
        
        // I don't really need this
		$http.get("/videoPermissions/" + $scope.homeTeam + "/" + $scope.selectedVideo).then(function(response) {
			if (response.data == 'true') {
				$scope.statsPublic = true;
			} else {
				$scope.statsPublic = false;
			}
		});
	}
	
	function setOnFieldToBlank() {
		var chaserA = {objectId:"chaserA", first_name:"Chaser", last_name:"A"};
		var chaserB = {objectId:"chaserB", first_name:"Chaser", last_name:"B"};
		var chaserC = {objectId:"chaserC", first_name:"Chaser", last_name:"C"};
		var keeperA = {objectId:"keeperA", first_name:"Keeper", last_name:"A"};
		var beaterA = {objectId:"beaterA", first_name:"Beater", last_name:"A"};
		var beaterB = {objectId:"beaterB", first_name:"Beater", last_name:"B"};
		var seekerA = {objectId:"seekerA", first_name:"Seeker", last_name:"A"};
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
    
    // Axtell here... hm...
 
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
		document.getElementById('onFieldPlayersHomePicker').style.display='block';document.getElementById('fade').style.display='block';
	};
	
	$scope.startStat = function(stat) {
		// Axtell here
		// This is the idea that, when adding stats, if there are no subs, just add generic stats
		if ($scope.subMap.size == 0) {
			$scope.addStat(null, null, stat, null);
		} else {
			$scope.statType = stat;
			$scope.videoPlayer.pauseVideo();
			document.getElementById('onFieldPlayersHomePicker').style.display='block';document.getElementById('fade').style.display='block';
		}
	};
	
	$scope.playerClicked = function(playerInId) {
		if ($scope.statType == "SUB") {
			$scope.addStat($scope.subbingPlayer, playerInId, "SUB");
			$scope.closeDialog('allPlayersPicker');
		} else if ($scope.statType == "YELLOW_CARD" || $scope.statType == "RED_CARD") {
			$scope.addStat(playerInId, "null", $scope.statType);
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
			$scope.addStat($scope.subbingPlayer, playerInId, "SWAP");
			$scope.closeDialog('onFieldPlayersHomePicker');
		} else {
			$scope.addStat(playerInId, null, $scope.statType, null);
			$scope.closeDialog('onFieldPlayersHomePicker');
		}
	};
	
	function applySub(sub) {
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
		if (index != -1 && swapIndex == -1) {
			$scope.onFieldPlayersHome[index] = $scope.bothTeamsPlayersMap.get(sub.player_in_id);
		}
		if (index != -1 && swapIndex != -1) {
			var temp = $scope.onFieldPlayersHome[index];
			$scope.onFieldPlayersHome[index] = $scope.onFieldPlayersHome[swapIndex];
			$scope.onFieldPlayersHome[swapIndex] = temp;
		}
	}
	
	$scope.updateScoreboard = function() {
		if ($scope.originalStats == undefined) {
			return;
		}
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
		
		document.getElementById('onFieldPlayersHomePicker').style.display='block';document.getElementById('fade').style.display='block';
	};
	
	$scope.startNote = function() {
		$scope.videoPlayer.pauseVideo();
		document.getElementById('noteOverlay').style.display='block';document.getElementById('fade').style.display='block';
	};
	
	$scope.addNote = function() {
		var data = {
				vid_id : $scope.selectedVideo,
				team_id : $scope.homeTeam,
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
			$scope.filterEvents('added');
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
				team_id : $scope.homeTeam,
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
			var player = $scope.bothTeamsPlayersMap.get(id);
			var playerIn = $scope.bothTeamsPlayersMap.get(inId);
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
			console.log("No opposite stat to add (like a sub)");
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
		$scope.seekToTime("", $scope.videoPlayer.getCurrentTime());
	};
	
	$scope.seekToTime = function(statName, time) {
		if (statName == 'SUB' || statName == "SWAP" || statName == 'PAUSE_CLOCK' || statName == 'START_CLOCK') {
			$scope.videoPlayer.seekTo(time);
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
	
	$scope.showNote = function(index) {
		$scope.videoPlayer.pauseVideo();
		$scope.displayNoteText = $scope.displayStats[index].note;
		document.getElementById('displayNoteOverlay').style.display='block';document.getElementById('fade').style.display='block';
	};
		
}]);