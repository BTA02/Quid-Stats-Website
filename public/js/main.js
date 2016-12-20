var app = angular.module('app', ['youtube-embed', 'luegg.directives', 'angucomplete-alt', 'snap', 'ngYoutubeEmbed']);

app.filter('time', function() {
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

app.filter('statNameFilter', function() {

  return function(value) {
    if (!value) {
      return;
    }
    var ret = value.replace(/_/g, ' ');
    ret = ret.toLowerCase();
    ret = ret.replace( /\b\w/g, function (m) {
      return m.toUpperCase();
    });
    ret = ret.replace(/\"|\[|\]/g, "");
    return ret;
  };

});

app.controller('RecordFullStatsController', ['$scope', '$http', '$interval', function($scope, $http, $interval) {
  
  $interval( function(){
    if ($scope.videoPlayer !== null && $scope.videoPlayer !== undefined) {
      $scope.updateOnFieldPlayers();
      $scope.updateScoreboard();
      // focus the player so that when you click elsewhere, video gets the focus back
    }
    redraw();
  }, 500);
  
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
    var statsUrl;
    var notesUrl;
    statsUrl = "/allStats/" + $scope.selectedVideo + "/" + $scope.team;
    notesUrl = "/allNotes/" + $scope.selectedVideo + "/" + $scope.team;
    $http.get(statsUrl).then(function(response) {
      console.log(response);
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
        }
        $scope.originalStats.sort(function(a, b){
            return a.time - b.time;
          });
        $scope.filterEvents('init');
      });
    }
    
    $http.get("/videoPermissions/" + $scope.team + "/" + $scope.selectedVideo).then(function(response) {
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
        console.log($scope.onFieldPlayers[i]['objectId']);
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
    
    // console.log("data");
    // console.log(data);
    
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
  var context = canvas.getContext("2d");
  canvas.setAttribute('height', context.canvas.clientHeight);
  canvas.setAttribute('width', context.canvas.clientWidth);
  // These need to be objects, with key being the time, val being the array
  var clickXMap = {};
  var clickYMap = {};
  var clickDragMap = {};
  var paint;
  
  window.onresize = resizeCanvas;
  
  $scope.coachingChanged = function() {
    redraw();
  };
  
  $scope.selectPenTool = function() {
    resizeCanvas();
    redraw();
  };
  
  $scope.playVideo = function() {
    $scope.videoPlayer.playVideo();
  };
  
  $scope.pauseVideo = function() {
    $scope.videoPlayer.pauseVideo();
  };
  
  function resizeCanvas() {
    canvas.setAttribute('height', context.canvas.clientHeight);
    canvas.setAttribute('width', context.canvas.clientWidth);
  }

  function addClick(x, y, dragging) {
    var timeStamp = $scope.videoPlayer.getCurrentTime().toFixed(1);
    if (!clickXMap[timeStamp]) {
      clickXMap[timeStamp] = [];
    }
    if (!clickYMap[timeStamp]) {
      clickYMap[timeStamp] = [];
    }
    if (!clickDragMap[timeStamp]) {
      clickDragMap[timeStamp] = [];
    }
    clickXMap[timeStamp].push(x);
    clickYMap[timeStamp].push(y);
    clickDragMap[timeStamp].push(dragging);
  }
  
  function redraw() {
    var timeStamp = $scope.videoPlayer.getCurrentTime().toFixed(1);
    context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight); // Clears the canvas
    context.strokeStyle = "#ffff00";
    context.lineJoin = "round";
    context.lineWidth = 5;
    
    for(var i=0; i < clickXMap[timeStamp].length; i++) {		
      $scope.videoPlayer.pauseVideo();
      context.beginPath();
      if(clickDragMap[timeStamp][i] && i){
        context.moveTo(clickXMap[timeStamp][i-1], clickYMap[timeStamp][i-1]);
       }else{
         context.moveTo(clickXMap[timeStamp][i]-1, clickYMap[timeStamp][i]);
       }
       context.lineTo(clickXMap[timeStamp][i], clickYMap[timeStamp][i]);
       context.closePath();
       context.stroke();
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
  
}]);

app.controller('ViewFullStatsController', ['$scope', '$http', function($scope, $http) {

  $scope.getAllGames = function() {
    $scope.doneGames = [];
    $http.get("/allGames/" + $scope.team).then(function(response) {
      $scope.doneGames = response.data;
      for (var i = 0; i < $scope.doneGames.length; i++) {
        var gameId = $scope.doneGames[i]['vid_id'];
        $scope.selectedGames[gameId] = false;
      }
    });
  };
  
  $scope.calcStats = function(userId) {
    var ids = "";
    for (var i = 0; i < $scope.doneGames.length; i++) {
      var id = $scope.doneGames[i]['vid_id'];
      if ($scope.selectedGames[id] == true) {
        ids += id;
        ids += ',';
      }
    }
    if (ids == "") {
      alert("Please select some games");
      return;
    }

  	$http.get("/calcFullStats/" + userId + "/" + $scope.statSelected + "/" + $scope.per + "?team_id=" + $scope.team + "&ids=" + ids).then(function(response) {
  		if ($scope.statSelected == "chaser_raw_stats") {
  			$scope.displayStatType = "raw";
  		} else if ($scope.statSelected == "possessions") {
  			$scope.displayStatType = "possessions";
  		} else if ($scope.statSelected == "possessions_agg") {
  		  $scope.displayStatType = "possessions_agg";
  		} else {
  		  $scope.displayStatType = "pm";
  		}
  		$scope.statsDisp = response.data;
  		console.log("response data");
  		console.log($scope.statsDisp);
      // if ($scope.isPlusMinus) {
      //   $scope.sortPMMap("GROUP");
      // } else {
      //   $scope.sortMap("first_name");
      // }
  	});
  };
  
  $scope.selectedGames = {};
  $scope.changeAllSelected = function() {
    $scope.allSelected = false;
  };
  
  $scope.selectAll = function(allBool) {
    for (var i = 0; i < $scope.doneGames.length; i++) {
      var id = $scope.doneGames[i]['vid_id'];
      $scope.selectedGames[id] = allBool;
    }
    $scope.allSelected = allBool;
  };
  
  $scope.sortPMMap = function(category) {
    var aVal = 0;
    var bVal = 0;
    $scope.statsDisp.sort(function(a, b) {
      if (category == "ratio") {
        aVal = a[1][category].substr(0, a[1][category].indexOf(':'));
        bVal = b[1][category].substr(0, b[1][category].indexOf(':'));
      } else if (category == "GROUP") {
        aVal = a[0][0];
        bVal = b[0][0];
        return aVal.localeCompare(bVal);
      } else {
        aVal = a[1][category];
        bVal = b[1][category];
      }
      if (aVal == bVal) {
        return a[0][0].localeCompare(b[0][0]);
      }
      return (bVal - aVal);
    });
  };
  
  $scope.sortMap = function(category) {
    var aVal = 0;
    var bVal = 0;
    
    $scope.statsDisp.sort(function(a, b) {
      // names stuff
      if (category == "first_name") {
        if (a[category] == "?") {
          return 1;
        } else if (b[category] == "?") {
          return -1;
        }
        var retVal = a[category].localeCompare(b[category]);
        if (retVal == 0) {
          return (a["last_name"].localeCompare(b["last_name"]));
        }
        return retVal;
      } else if (category == "last_name") {
        if (a[category] == "?") {
          return 1;
        } else if (b[category] == "?") {
          return -1;
        }
        var retVal = a[category].localeCompare(b[category]);
        if (retVal == 0) {
          return (a["first_name"].localeCompare(b["first_name"]));
        }
        return retVal;
      }
      // numbers stuff
      if (category == "ratio") {
        aVal = a[category].substr(0, a[category].indexOf(':'));
        bVal = b[category].substr(0, b[category].indexOf(':'));
      } else {
        aVal = a[category];
        bVal = b[category];
      }
      if (aVal == bVal) {
        var fNameVal = a["first_name"].localeCompare(b["first_name"]);
        var lNameVal = a["last_name"].localeCompare(b["last_name"]);
        if (fNameVal != 0) {
          return fNameVal;
        } else {
          return lNameVal;
        }
      }
      return (bVal - aVal);
    });
  };

}]);

app.controller('ViewStatsController', ['$scope', '$http', function($scope, $http) {
  
  $scope.getDoneGames = function(userId) {
    $scope.doneGames = [];
    $http.get("/doneGames/" + $scope.team + "/" + userId).then(function(response) {
      $scope.doneGames = response.data;
      for (var i = 0; i < $scope.doneGames.length; i++) {
        var gameId = $scope.doneGames[i]['vid_id'];
        $scope.selectedGames[gameId] = false;
      }
    });
  };
  
  $scope.calcStats = function(userId) {
    var ids = "";
    for (var i = 0; i < $scope.doneGames.length; i++) {
      var id = $scope.doneGames[i]['vid_id'];
      if ($scope.selectedGames[id] == true) {
        ids += id;
        ids += ',';
      }
    }
    if (ids == "") {
      alert("Please select some games");
      return;
    }

    $scope.per = 0;
    $scope.per += $scope.perMinute;

  	$http.get("/calcStats/" + userId + "/" + $scope.statSelected + "/" + $scope.per + "?team_id=" + $scope.team + "&ids=" + ids).then(function(response) {
  		if ($scope.statSelected == "raw_stats") {
  			$scope.isPlusMinus = false;
  			// sort the data?
  		} else {
  			$scope.isPlusMinus = true;
  		}
  		$scope.statsDisp = response.data;
  		//console.log("resp", response.data);
      if ($scope.isPlusMinus) {
        $scope.sortPMMap("GROUP");
      } else {
        $scope.sortMap("first_name");
      }
  	});
  };
  
  $scope.selectedGames = {};
  $scope.changeAllSelected = function() {
    $scope.allSelected = false;
  };

  $scope.selectAll = function(allBool) {
    for (var i = 0; i < $scope.doneGames.length; i++) {
      var id = $scope.doneGames[i]['vid_id'];
      $scope.selectedGames[id] = allBool;
    }
    $scope.allSelected = allBool;
  };
  
  $scope.pmCategoriesToDisplay = [
    'GROUP',
    'PLUS',
    'MINUS',
    'NET',
    'RATIO',
    'TIME'
  ];

  $scope.rawCategoriesToDisplay = [
    'FIRST', 
    'LAST', 
    'SHOTS', 
    'GOALS', 
    'ASSISTS',
    'POINTS',
    'TURNOVERS', 
    'TAKEAWAYS',
    // 'YELLOWS',
    // 'REDS',
    // 'SNITCHES',
    'PLUS',
    'MINUS',
    'NET',
    'RATIO',
    'TIME'
  ];
  
  $scope.beaterCategoriesToDisplay = [
    'FIRST',
    'LAST',
    'BEATS_THROWN',
    'BEATS_HIT',
    'BEAT_PERCENT'
  ];
  
  $scope.otherCategoriesToDisplay = [
    'FIRST',
    'LAST',
    'SNITCH_CATCHES',
    'TIME_SEEKING',
    'YELLOWS',
    'REDS'
  ];
  
  $scope.sortPMMap = function(category) {
    category = $scope.convertCategoryName(category);
    var aVal = 0;
    var bVal = 0;
    $scope.statsDisp.sort(function(a, b) {
      if (category == "ratio") {
        aVal = a[1][category].substr(0, a[1][category].indexOf(':'));
        bVal = b[1][category].substr(0, b[1][category].indexOf(':'));
      } else if (category == "GROUP") {
        aVal = a[0][0];
        bVal = b[0][0];
        return aVal.localeCompare(bVal);
      } else {
        aVal = a[1][category];
        bVal = b[1][category];
      }
      if (aVal == bVal) {
        return a[0][0].localeCompare(b[0][0]);
      }
      return (bVal - aVal);
    });
  };
  
  $scope.sortMap = function(category) {
    category = $scope.convertCategoryName(category);
    var aVal = 0;
    var bVal = 0;
    $scope.statsDisp.sort(function(a, b) {
      // names stuff
      if (category == "first_name") {
        if (a[category] == "?") {
          return 1;
        } else if (b[category] == "?") {
          return -1;
        }
        var retVal = a[category].localeCompare(b[category]);
        if (retVal == 0) {
          return (a["last_name"].localeCompare(b["last_name"]));
        }
        return retVal;
      } else if (category == "last_name") {
        if (a[category] == "?") {
          return 1;
        } else if (b[category] == "?") {
          return -1;
        }
        var retVal = a[category].localeCompare(b[category]);
        if (retVal == 0) {
          return (a["first_name"].localeCompare(b["first_name"]));
        }
        return retVal;
      }
      // numbers stuff
      if (category == "ratio") {
        aVal = a[category].substr(0, a[category].indexOf(':'));
        bVal = b[category].substr(0, b[category].indexOf(':'));
      } else {
        aVal = a[category];
        bVal = b[category];
      }
      if (aVal == bVal) {
        var fNameVal = a["first_name"].localeCompare(b["first_name"]);
        var lNameVal = a["last_name"].localeCompare(b["last_name"]);
        if (fNameVal != 0) {
          return fNameVal;
        } else {
          return lNameVal;
        }
      }
      return (bVal - aVal);
    });
  };
  
  $scope.convertCategoryName = function(category) {
    var ret;
    switch(category) {
      case "FIRST":
        ret = "first_name";
        break;
      case "LAST":
        ret = "last_name";
        break;
      case "SHOTS":
        ret = "shot";
        break;
      case "GOALS":
        ret = "goal";
        break;
      case "ASSISTS":
        ret = "assist";
        break;
      case "POINTS":
        ret = "point";
        break;
      case "TURNOVERS":
        ret = "turnover";
        break;
      case "TAKEAWAYS":
        ret = "takeaway";
        break;
      case "YELLOWS":
        ret = "yellow_card";
        break;
      case "REDS":
        ret = "red_card";
        break;
      case "SNITCHES":
        ret = "snitch_catch";
        break;
      case "PLUS":
        ret = "plusses";
        break;
      case "MINUS":
        ret = "minuses";
        break;
      case "NET":
        ret = "net";
        break;
      case "RATIO":
        ret = "ratio";
        break;
      case "TIME":
        ret = "time";
        break;
      default:
        ret = category;
    }
    return ret;
  };
  
}]);

app.controller('AddTeamController', ['$scope', '$http', function($scope, $http) {
  
  // Apparently I need to init my vals
  $scope.pendingRoster = [];
  
  
  $scope.getRoster = function() {
    $scope.roster = [];
    $http.get("/allPlayers/" + $scope.teamToAdd 
      + "/" + $scope.rosterYear).then(function(response) {
        $scope.roster = response["data"];
    });
    $http.get("/allPlayers").then(function(response) {
      $scope.people = response["data"];
    });
  };

  $scope.addNewPlayer = function() {
    var firstNameElt = document.getElementById('autocompleteFirst_value');
    var lastNameElt = document.getElementById('autocompleteLast_value');
    var newFirstName = firstNameElt.value;
    var newLastName = lastNameElt.value;

    $http.get("/addPlayer/" + newFirstName.trim()
      + "/" + newLastName.trim()).then(function(response) {
        var fname = response["data"]["first_name"].trim();
        var lname = response["data"]["last_name"].trim();
        var objId = response["data"]["objectId"];
        var newPlayerObj = {first_name:fname, last_name:lname, objectId:objId};
        console.log(newPlayerObj);
        $scope.pendingRoster.splice(0, 0, newPlayerObj);
        $scope.$broadcast('angucomplete-alt:clearInput', 'autocompleteFirst');
        $scope.$broadcast('angucomplete-alt:clearInput', 'autocompleteLast');
    });
  };

  $scope.addExistingPlayer = function(selected) {
    var existingPlayerObj = {
      first_name: selected.originalObject.first_name,
      last_name: selected.originalObject.last_name,
      objectId: selected.originalObject.objectId
    };
    $scope.pendingRoster.splice(0, 0, existingPlayerObj);
    $scope.$broadcast('angucomplete-alt:clearInput', 'autocompleteFirst');
    $scope.$broadcast('angucomplete-alt:clearInput', 'autocompleteLast');

  };

  $scope.saveRoster = function() {
    var ids = [];
    for (var i = 0; i < $scope.roster.length; i++) {
      ids.push($scope.roster[i]["objectId"]);
    }
    for (var i = 0; i < $scope.pendingRoster.length; i++) {
      ids.push($scope.pendingRoster[i]["objectId"]);
    }

    if ($scope.teamToAdd == "new") {
      // creating a new team with the roster given
      if ($scope.rosterYear == null) {
        alert("Please select a year");
        return;
      }
      if ($scope.newTeamName == null || $scope.newTeamName == "") {
        alert("Please add a team name");
        return;
      }
      console.log("here?", "/newTeam/" + $scope.newTeamName + "/" + $scope.rosterYear + "/" + ids)
      $http.get("/newTeam/" + $scope.newTeamName + "/" + $scope.rosterYear + "/" + ids).then(function(response) {
        response["data"];
        location.reload();
      });
    } else {
      $http.get("/updateTeam/" + $scope.teamToAdd + "/" + $scope.rosterYear + "/" + ids).then(function(response) {
        response["data"];
        location.reload();
      });
    }
  };
  
  $scope.removePlayerFromPending = function(playerToRemove) {
    // find object in array, then remove it
    for(var i = 0; i < $scope.pendingRoster.length; i++) {
      console.log($scope.pendingRoster[i].objectId);
      if ($scope.pendingRoster[i]["objectId"] == playerToRemove["objectId"]) {
        $scope.pendingRoster.splice(i, 1);
        console.log($scope.pendingRoster);
        break;
      }
    }
  };
  
}]);

app.controller('AddVideoController', ['$scope', '$http', function($scope, $http) {
  
  $scope.addVideo = function() {
    if ($scope.team == null) {
      alert("Please select a team");
    }
    if ($scope.addTeamOpponent == null) {
      alert("Please select an opponent");
    }
    else if ($scope.fallYear == null) {
      alert("Please select a fall year");
    }
    else if ($scope.vidPreview === null) {
      alert("Please enter a video id");
    } else if ($scope.vidDesc === null) {
      alert("Please add a description");
    } else {
      // this is where the check needs to happen
      $http.get("/addVideo/" + $scope.vidPreview + "/" + $scope.team + "/" + $scope.addTeamOpponent + "/" + $scope.fallYear + "/" + $scope.vidDesc).then(function(response) {
        location.reload();
      });
    }
  };
  
}]);

app.controller('PublicController', ['$scope', '$http', function($scope, $http) {
  
}]);

app.controller('HomeController', ['$scope', '$http', function($scope, $http) {

  $scope.checkUsername = function() {
    if ($scope.signupUsername == null || 
      ($scope.signupUsername.length < 5 || $scope.signupUsername.length > 20)) {
      return false;
    }
    if ($scope.signupUsername.match(/^[a-zA-Z0-9_]*$/)) {
      return true;
    } else {
      return false;
    }
  };

  $scope.checkPasswords = function() {
    if ($scope.pass1 == null) {
      return false;
    }
    if ($scope.pass1.length == 0) {
      return false;
    }
    return $scope.pass1 == $scope.pass2;
  };

  // Add team functions
}]);
