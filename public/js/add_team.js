var statsApp = angular.module('statsApp', [])

var page

statsApp.controller('StatsController', ['$scope', '$http', function($scope, $http) {
  
  $scope.checkPasswords = function() {
    if ($scope.pass1 == null) {
        return false;
    }
    if ($scope.pass1.length == 0) {
      return false;
    }
    return $scope.pass1 === $scope.pass2;
  }

  $scope.getRoster = function() {
    $scope.roster = [];
    $http.get("/allPlayers/" + $scope.teamToAdd 
      + "/" + $scope.rosterYear).then(function(response) {
        $scope.roster = response["data"];
    });
  }

  $scope.addNewPlayer = function() {
    $http.get("/addPlayer/" + $scope.newFirstName.trim()
      + "/" + $scope.newLastName.trim()).then(function(response) {
        // update the onscreen roster
        // the idea being, person adds a new player
        // new player automatically gets added to the current roster
        // then, you can hit 'save roster' at the bottom
        // i need an 'add existing player' button too
        // or, an 'add existing player' form to add or something like that
        console.log(response["data"]);
        var fname = response["data"]["first_name"].trim();
        var lname = response["data"]["last_name"].trim();
        var objId = response["data"]["objectId"];
        var newPlayerObj = {first_name:fname, last_name:lname, objectId:objId};
        $scope.roster.splice(0, 0, newPlayerObj);
        $scope.newFirstName = "";
        $scope.newLastName = "";
    });
  }

  $scope.saveRoster = function() {
    console.log($scope.roster);
    // take all the players 
    // generate a full list of ids
    // set that as the new field in rosters
    // so, I need all the object ids
    var ids = [];
    for (var i = 0; i < $scope.roster.length; i++) {
      ids.push($scope.roster[i]["objectId"]);
    }
    console.log(ids);
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
      // "/newTeam/" + $scope.newTeamName + "/" $scope.rosterYear + "/" + ids).then(function(response) {
      //   response["data"];
      // }
      $http.get("/newTeam/" + $scope.newTeamName + "/" + $scope.rosterYear + "/" + ids).then(function(response) {
        response["data"];
        location.reload();
        // refresh
      });
    } else {
      // $http.get("/updateTeam/" + $scope.)
    }
    // } else {
    //   $http.get("/updateTeam/" + $scope.teamToAdd + "/" + ids).then(function(response) {
    //     response["data"];
    // }
  }

  $scope.updatePlayer = function(player) {
    $http.get("/updatePlayer/" 
      + player["objectId"] 
      + "/" + player["first_name"] 
      + "/" + player["last_name"]).then(function(response) {
        response["data"];
    });
  }



}]);












