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
  	//console.log($scope.selectedGames[0]);
  	// var ids = $scope.selectedGames.map(function(i){
  	// 	return i['id'];
  	// });

  	$http.get("/calc_stats/" + $scope.statSelected + "?team_id=" + $scope.team + "&ids=" + ids).then(function(response) {
  		console.log(response["data"]);
  		$scope.statsDisp = response["data"];
  		console.log($scope.statsDisp[Object.keys($scope.statsDisp)[0]]);
  	});
	
  }

}]);
