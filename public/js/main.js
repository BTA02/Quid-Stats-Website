var statsApp = angular.module('statsApp', []);

var page

statsApp.controller('StatsController', ['$scope', '$http', function($scope, $http){
  $scope.message = 'Really';
  $scope.getGames = function() {
  	$scope.games = []
  	$http.get("/games/" + $scope.team).then(function(response) {
  		$scope.games = response["data"];
  	});
  }

  $scope.switchGames = function() {
  	for (var i = 0; i < $scope.selectedGames.length; i++) {
  		//console.log($scope.selectedGames[i]);
  	}
  }

  $scope.calcStats = function() {
  	var ids = $scope.selectedGames.join(",");

  	$http.get("/calc_stats/" + $scope.statSelected + "?team_id=" + $scope.team + "&ids=" + ids).then(function(response) {
  		console.log(response["data"]);
  	});
	
  }

}]);
