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
    $http.get("/roster/" + $scope.teamToAdd + "/" + $scope.rosterYear).then(function(response) {
        $scope.roster = console.log(response["data"]);
    });
  }

}]);












