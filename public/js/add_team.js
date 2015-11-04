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
    $http.get("/allPlayers/" + $scope.teamToAdd + "/" + $scope.rosterYear).then(function(response) {
        console.log(response["data"]);
        $scope.roster = response["data"];
    });
  }

  $scope.addNewPlayer = function() {
    $http.get("/addPlayer/" + $scope.newFirstName + "/" + $scope.newLastName).then(function(response) {
        // update the onscreen roster
        // the idea being, person adds a new player
        // new player automatically gets added to the current roster
        // then, you can hit 'save roster' at the bottom
        // i need an 'add existing player' button too
        // or, an 'add existing player' form to add or something like that
        console.log(response["data"]);
        var fname = response["data"]["first_name"].trim();
        var lname = response["data"]["last_name"].trim();
        var newPlayerObj = {first_name:fname, last_name:lname};
        $scope.roster.splice(0, 0, newPlayerObj);
        $scope.newFirstName = "";
        $scope.newLastName = "";
    });
  }


}]);












