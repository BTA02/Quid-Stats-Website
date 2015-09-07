var statsApp = angular.module('statsApp', []);

var page

statsApp.controller('StatsController', ['$scope', '$http', function($scope, $http){
  $scope.message = 'Really';
  $scope.getGames = function() {
  	$http.get("/games/" + $scope.team).then(function(response) {
  		$scope.games = response["data"]
  		
  	})
  }
}]);
