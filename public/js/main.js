var statsApp = angular.module('statsApp', ['youtube-embed'])
.filter('time', function() {
    var conversions = {
      'ss': angular.identity,
      'mm': function(value) { return value * 60; },
      'hh': function(value) { return value * 3600; }
    };
    
    var padding = function(value, length) {
      var zeroes = length - ('' + (value)).length,
          pad = '';
      while(zeroes-- > 0) pad += '0';
      return pad + value;
    };
    
    return function(value, unit, format, isPadded) {
      var totalSeconds = conversions[unit || 'ss'](value),
          hh = Math.floor(totalSeconds / 3600),
          // mm = Math.floor((totalSeconds % 3600) / 60),
          mm = Math.floor(totalSeconds / 60),
          ss = totalSeconds % 60;
      
      format = format || 'hh:mm:ss';
      isPadded = angular.isDefined(isPadded)? isPadded: true;
      hh = isPadded? padding(hh, 2): hh;
      mm = isPadded? padding(mm, 2): mm;
      ss = isPadded? padding(ss, 2): ss;
      
      return format.replace(/hh/, hh).replace(/mm/, mm).replace(/ss/, ss);
    };
  });

var page

statsApp.controller('StatsController', ['$scope', '$http', '$interval', function($scope, $http, $interval) {
  
  $scope.getDoneGames = function() {
  	$scope.doneGames = [];
  	$http.get("/doneGames/" + $scope.team).then(function(response) {
  		$scope.doneGames = response["data"];
  	});
    $scope.selectedGames = [];
  }

  // Recording stats section

  $scope.getAllGames = function() {
    $scope.allGames = [];
    $http.get("/allGames/" + $scope.team).then(function(response) {
      $scope.allGames = response["data"];
    });
  }

  $scope.getAllPlayers = function() {
    var idAndYear;
    idAndYear = $scope.vidObj.split(",");
    $scope.selectedVideo = idAndYear[0];
    $scope.year = idAndYear[1];
    $scope.allPlayers = [];
    // initVals();
    $http.get("/allPlayers/" + $scope.team + "/" + $scope.year).then(function(response) {
      $scope.allPlayers = response["data"];
      $scope.playersMap = new Map();
      for (var i = 0; i < $scope.allPlayers.length; i++) {
        $scope.playersMap.set($scope.allPlayers[i]["objectId"], $scope.allPlayers[i]);
      }
      initVals();
    });
  }

  function initVals() {
    setOnFieldToBlank();
    $scope.subMap = new Map();
    $scope.allStats = [];
    // $scope.gameTime = 0;
    $http.get("/allStats/" + $scope.selectedVideo + "/" + $scope.team + "/" + "nwlMkrbCJ9").then(function(response) {
      // this returns all the events from a single game
      $scope.allStats = response["data"];
      for (var i = 0; i < $scope.allStats.length; i++) {
        // add the player names to the objects here
        var id = $scope.allStats[i]["player_id"];
        var inId = $scope.allStats[i]["player_in_id"];
        var player = $scope.playersMap.get(id);
        var playerIn = $scope.playersMap.get(inId);
        if (player) {
          $scope.allStats[i]["player_name"] = player["first_name"] + ' ' + player["last_name"];
        } else {
          $scope.allStats[i]["player_name"] = id;

        }
        if (playerIn) {
          $scope.allStats[i]["player_in_name"] = playerIn["first_name"] + ' ' + playerIn["last_name"];
        } else {
          $scope.allStats[i]["player_in_name"] = inId;
        }
        if ($scope.allStats[i]["stat_name"] === "SUB") {
          addSubToMap($scope.allStats[i]);
        }
      }
      // I need to think about this, what do I need?
      // Well, ideally, the statObj would have the player object
      // But it doesn't
      // So, dynamically, I need to add the value, right?
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

  $scope.switchGames = function() {
  	for (var i = 0; i < $scope.selectedGames.length; i++) {

  	}
  }

  // All subbing stuff
  function addSubToMap(subStat) {
    var arrayAtTime = $scope.subMap.get(subStat["time"]);
    if (arrayAtTime != null) {
      arrayAtTime.push(subStat);
    } else {
      arrayAtTime = [subStat];
      $scope.subMap.set(subStat["time"], arrayAtTime);
    }
  }

  function removeSubFromMap(subStat) {
    // Didn't quite work. The index was -18
    var arrayAtTime = $scope.subMap.get(subStat["time"]);

    if (arrayAtTime != null) {
      var index = -1;
      for(var i = 0; i < arrayAtTime.length; i++) {
        if (arrayAtTime[i]["objectId"] === subStat["objectId"]) {
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

  $interval( function(){
    if ($scope.videoPlayer != null) {
      $scope.updateOnFieldPlayers();
      $scope.updateScoreboard();
    }
  }, 500);


  $scope.updateOnFieldPlayers = function() {
    var startTime = 0;
    var endTime = $scope.videoPlayer.getCurrentTime() + 1;
    setOnFieldToBlank();
    for (var i = startTime; i < endTime; i++) {
      if ($scope.subMap.get(i) != null) {
        var arrayOfSubs = $scope.subMap.get(i);
        for (var j = 0; j < arrayOfSubs.length; j++) {
          applySub(arrayOfSubs[j]);
        }
      }
    }
  }

  $scope.updateScoreboard = function() {
    var startTime = 0;
    var endTime = $scope.videoPlayer.getCurrentTime() + 1;
    var pausedTime = 0;
    var pauseStart = 0;
    var pauseEnd = 0;
    $scope.homeScore = 0;
    $scope.awayScore = 0;
    // $scope.gameTime = $scope.videoPlayer.getCurrentTime();
    for (var i = 0; i < $scope.allStats.length; i++) {
      if ($scope.allStats[i]["time"] > endTime) {
        break;
      }
      if ($scope.allStats[i]["stat_name"] === "GOAL") {
        $scope.homeScore += 1;
      }
      if ($scope.allStats[i]["stat_name"] === "AWAY_GOAL") {
        $scope.awayScore += 1;
      }
      if ($scope.allStats[i]["stat_name"] === "SNITCH_CATCH") {
        $scope.awayScore += 3;
      }
      if ($scope.allStats[i]["stat_name"] === "AWAY_SNITCH_CATCH") {
        $scope.awayScore += 3;
      }
      // if ($scope.allStats[i]["stat_name"] === "PAUSE_CLOCK") {
      //   pauseStart = $scope.allStats[i]["time"];
      // }
      // if ($scope.allStats[i]["stat_name"] === "START_CLOCK") {
      //   pauseEnd = $scope.allStats[i]["time"];
      //   pausedTime += (pauseEnd - pauseStart);
      //   pauseStart = 0;
      //   pauseEnd = 0;
      //   $scope.gameTime = endTime - 1 - pausedTime;
      // }

    }
    
  }

  function applySub(sub) {
    var index = -1;
    for (var i = 0; i < $scope.onFieldPlayers.length; i++) {
      if ($scope.onFieldPlayers[i].objectId == sub["player_id"]) {
        index = i;
      }
    }
    //index coming back as -1 each time
    if (index !== -1) {
      $scope.onFieldPlayers[index] = $scope.playersMap.get(sub["player_in_id"]);
    }
  }

  $scope.startSub = function(playerId) {
    $scope.videoPlayer.pauseVideo();
    $scope.subbingPlayer = playerId;
  }

  $scope.subPlayer = function(playerInId) {
    $scope.addStat($scope.subbingPlayer, playerInId, "SUB");
  }

  $scope.addStat = function(playerId, playerInId, stat) {
    $scope.videoPlayer.pauseVideo();
    var curTime = $scope.videoPlayer.getCurrentTime();


    $http.get("/addStat/" + $scope.selectedVideo 
      + "/" + $scope.team
      + "/" + $scope.year
      + "/" + playerId 
      + "/" + stat 
      + "/" + $scope.videoPlayer.getCurrentTime() 
      + "/" + playerInId).then(function(response) {
        // handle errors here, if I get them
        var id = response["data"]["player_id"];
        var inId = response["data"]["player_in_id"];
        var player = $scope.playersMap.get(id);
        var playerIn = $scope.playersMap.get(inId);
        if (player) {
          response["data"]["player_name"] = player["first_name"] + ' ' + player["last_name"];
        } else {
          response["data"]["player_name"] = id;

        }
        if (playerIn) {
          response["data"]["player_in_name"] = playerIn["first_name"] + ' ' + playerIn["last_name"];
        } else {
          response["data"]["player_in_name"] = inId;
        }
        $scope.allStats.push(response["data"]);
        if (stat === "SUB") {
          addSubToMap(response["data"]);
          applySub(response["data"]);
        }
        $scope.allStats.sort(function(a, b){
          return a["time"] - b["time"];
        })
    });
  }

  $scope.deleteStat = function(objId) {
    $http.get("/deleteStat/" + objId).then(function(response) {
      // do nothing for now
      //remove locally
      var index = findStatIndex(response["data"]);
      if (index !== -1) {
        $scope.allStats.splice(index, 1);
      }
      removeSubFromMap(response["data"]);
    });
  }

  function findStatIndex(stat) {
    for (var i = 0; i < $scope.allStats.length; i++) {
      if ($scope.allStats[i].objectId == stat["objectId"]) {
        return i;
      }
    }
  }




  // Viewing stats page

  $scope.calcStats = function() {
    var ids;
    if ($scope.selectedGames == null || $scope.selectedGames.length == 0) {
      alert("Please select some games");
      return;
    } else {
      ids = $scope.selectedGames.join(",");
    }
  	//console.log($scope.selectedGames[0]);
  	// var ids = $scope.selectedGames.map(function(i){
  	// 	return i['id'];
  	// });
    $scope.per = 0;
    $scope.per += $scope.perMinute;
  	$http.get("/calc_stats/" + $scope.statSelected + "/" + $scope.per + "?team_id=" + $scope.team + "&ids=" + ids).then(function(response) {
  		if ($scope.statSelected == "raw_stats") {
  			$scope.isPlusMinus = false;
  			// sort the data?
  		} else {
  			$scope.isPlusMinus = true;
  		}
  		$scope.statsDisp = response["data"];
  	});
  }

  $scope.selectedGames = [];
  $scope.toggleGame = function(id) {  
    var index = $scope.selectedGames.indexOf(id);
    if (index > -1) {
      $scope.selectedGames.splice(index, 1);
    } else {
      $scope.selectedGames.push(id);
    }
  }

  $scope.seekToTime = function(time) {
    $scope.videoPlayer.seekTo(time-5);
  }

  $scope.addVideo = function() {
    $scope.vidPreview;
    $scope.fallYear;
    $scope.vidDesc;

    // alert($scope.vidPreview + ' ' + $scope.teamVidToAdd + ' ' + $scope.fallYear);
    if ($scope.team == null) {
      alert("Please select a team");
    }
    else if ($scope.fallYear == null) {
      alert("Please select a fall year");
    }
    else if ($scope.vidPreview == null) {
      alert("Please enter a video id");
    } else if ($scope.vidDesc == null) {
      alert("Please add a description");
    } else if (search($scope.vidPreview, $scope.allGames)) {
      alert("This video has already been entered for this team");
    } else {
      // if (exists in $scope.allGames)
      // 
      $http.get("/addVideo/" + $scope.vidPreview + "/" + $scope.team + "/" + $scope.fallYear + "/" + $scope.vidDesc).then(function(response) {
        console.log(response["data"]);
      });
    }
    
  }

  function search(nameKey, myArray){
    for (var i=0; i < myArray.length; i++) {
      if (myArray[i].vid_id === nameKey) {
          return true;
      }
    }
    return false;
  }

}]);












