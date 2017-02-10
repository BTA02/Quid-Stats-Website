angular.module('app').controller('ViewStatsControllerExp', ['$scope', '$http', function($scope, $http) {

	$scope.getAllGames = function() {
		$scope.doneGames = [];
		$http.get("/allGames/" + $scope.team).then(function(response) {
			$scope.doneGames = response.data;
			for (var i = 0; i < $scope.doneGames.length; i++) {
				var gameId = $scope.doneGames[i]['vid_id'];
				$scope.selectedGames[gameId] = false;
			}
		});
	};
	
	$scope.calcStats = function(userId) {
		var ids = "";
		for (var i = 0; i < $scope.doneGames.length; i++) {
			var id = $scope.doneGames[i]['vid_id'];
			if ($scope.selectedGames[id] == true) {
				ids += id;
				ids += ',';
			}
		}
		if (ids == "") {
			alert("Please select some games");
			return;
		}

		$http.get("/calcFullStats/" + userId + "/" + $scope.statSelected + "/" + $scope.per + "?team_id=" + $scope.team + "&ids=" + ids).then(function(response) {
			if ($scope.statSelected == "chaser_raw_stats") {
				$scope.displayStatType = "raw";
			} else if ($scope.statSelected == "possessions") {
				$scope.displayStatType = "possessions";
			} else if ($scope.statSelected == "possessions_agg") {
				$scope.displayStatType = "possessions_agg";
			} else {
				$scope.displayStatType = "pm";
			}
			$scope.statsDisp = response.data;
			console.log("response data");
			console.log($scope.statsDisp);
			// if ($scope.isPlusMinus) {
			//   $scope.sortPMMap("GROUP");
			// } else {
			//   $scope.sortMap("first_name");
			// }
		});
	};
	
	$scope.selectedGames = {};
	$scope.changeAllSelected = function() {
		$scope.allSelected = false;
	};
	
	$scope.selectAll = function(allBool) {
		for (var i = 0; i < $scope.doneGames.length; i++) {
			var id = $scope.doneGames[i]['vid_id'];
			$scope.selectedGames[id] = allBool;
		}
		$scope.allSelected = allBool;
	};
	
	$scope.sortPMMap = function(category) {
		var aVal = 0;
		var bVal = 0;
		$scope.statsDisp.sort(function(a, b) {
			if (category == "ratio") {
				aVal = a[1][category].substr(0, a[1][category].indexOf(':'));
				bVal = b[1][category].substr(0, b[1][category].indexOf(':'));
			} else if (category == "GROUP") {
				aVal = a[0][0];
				bVal = b[0][0];
				return aVal.localeCompare(bVal);
			} else {
				aVal = a[1][category];
				bVal = b[1][category];
			}
			if (aVal == bVal) {
				return a[0][0].localeCompare(b[0][0]);
			}
			return (bVal - aVal);
		});
	};
	
	$scope.sortMap = function(category) {
		var aVal = 0;
		var bVal = 0;
		
		$scope.statsDisp.sort(function(a, b) {
			// names stuff
			if (category == "first_name") {
				if (a[category] == "?") {
					return 1;
				} else if (b[category] == "?") {
					return -1;
				}
				var retVal = a[category].localeCompare(b[category]);
				if (retVal == 0) {
					return (a["last_name"].localeCompare(b["last_name"]));
				}
				return retVal;
			} else if (category == "last_name") {
				if (a[category] == "?") {
					return 1;
				} else if (b[category] == "?") {
					return -1;
				}
				var retVal = a[category].localeCompare(b[category]);
				if (retVal == 0) {
					return (a["first_name"].localeCompare(b["first_name"]));
				}
				return retVal;
			}
			// numbers stuff
			if (category == "ratio") {
				aVal = a[category].substr(0, a[category].indexOf(':'));
				bVal = b[category].substr(0, b[category].indexOf(':'));
			} else {
				aVal = a[category];
				bVal = b[category];
			}
			if (aVal == bVal) {
				var fNameVal = a["first_name"].localeCompare(b["first_name"]);
				var lNameVal = a["last_name"].localeCompare(b["last_name"]);
				if (fNameVal != 0) {
					return fNameVal;
				} else {
					return lNameVal;
				}
			}
			return (bVal - aVal);
		});
	};

}]);