angular.module('app').controller('AddVideoController', ['$scope', '$http', function($scope, $http) {
	
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