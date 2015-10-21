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
        console.log($scope.allStats[i]);
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
  		console.log($scope.selectedGames[i]);
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

  $interval( function(){
    if ($scope.videoPlayer != null) {
      $scope.updateOnFieldPlayers(); 
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
          console.log("Applying sub " + arrayOfSubs[j]["player_in_id"]);
          applySub(arrayOfSubs[j]);
        }
      }
    }
  }

  function applySub(sub) {
    // So I think I want to apply this to the initValues
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
      + "/" + "nwlMkrbCJ9"  //meant to be author id here, will get eventually
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
        console.log(response["data"]);
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
    $http.get("/deleteStat/" +objId).then(function(response) {
      // do nothing for now
      //remove locally
      var index = findStatIndex(response["data"]);
      if (index !== -1) {
        $scope.allStats.splice(index, 1);
      }
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
    console.log($scope.selectedGames);
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

  	$http.get("/calc_stats/" + $scope.statSelected + "?team_id=" + $scope.team + "&ids=" + ids).then(function(response) {
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

}]);












