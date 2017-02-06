angular.module('app').controller('HomeController', ['$scope', '$http', function($scope, $http) {

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