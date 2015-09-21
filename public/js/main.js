var statsApp = angular.module('statsApp', ['youtube-embed']);

var page

statsApp.controller('StatsController', ['$scope', '$http', function($scope, $http){
  
  $scope.getGames = function() {
  	$scope.games = [];
  	$http.get("/games/" + $scope.team).then(function(response) {
  		$scope.games = response["data"];
      console.log($scope.games);
  	});
    
    $scope.selectedGames = [];
  }

  $scope.switchGames = function() {
  	for (var i = 0; i < $scope.selectedGames.length; i++) {
  		console.log($scope.selectedGames[i]);
  	}
  }

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
  		console.log(response["data"]);
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

  $scope.loadVideo = function() {
    console.log(id);
    $scope.theBestVideo = id;
  }



  // $scope.theBestVideo = 'sMKoNBRZM1M';

}]);












