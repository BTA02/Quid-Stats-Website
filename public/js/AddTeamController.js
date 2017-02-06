angular.module('app').controller('AddTeamController', ['$scope', '$http', function($scope, $http) {
	
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