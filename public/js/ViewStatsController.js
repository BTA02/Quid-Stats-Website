angular.module('app').controller('ViewStatsController', ['$scope', '$http', function($scope, $http) {
	
	$scope.getDoneGames = function(userId) {
		$scope.doneGames = [];
		$http.get("/doneGames/" + $scope.team + "/" + userId).then(function(response) {
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

		$scope.per = 0;
		$scope.per += $scope.perMinute;

		$http.get("/calcStats/" + userId + "/" + $scope.statSelected + "/" + $scope.per + "?team_id=" + $scope.team + "&ids=" + ids).then(function(response) {
			if ($scope.statSelected == "raw_stats") {
				$scope.isPlusMinus = false;
				// sort the data?
			} else {
				$scope.isPlusMinus = true;
			}
			$scope.statsDisp = response.data;
			//console.log("resp", response.data);
			if ($scope.isPlusMinus) {
				$scope.sortPMMap("GROUP");
			} else {
				$scope.sortMap("first_name");
			}
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
	
	$scope.pmCategoriesToDisplay = [
		'GROUP',
		'PLUS',
		'MINUS',
		'NET',
		'RATIO',
		'TIME'
	];

	$scope.rawCategoriesToDisplay = [
		'FIRST', 
		'LAST', 
		'SHOTS', 
		'GOALS', 
		'ASSISTS',
		'POINTS',
		'TURNOVERS', 
		'TAKEAWAYS',
		// 'YELLOWS',
		// 'REDS',
		// 'SNITCHES',
		'PLUS',
		'MINUS',
		'NET',
		'RATIO',
		'TIME'
	];
	
	$scope.beaterCategoriesToDisplay = [
		'FIRST',
		'LAST',
		'BEATS_THROWN',
		'BEATS_HIT',
		'BEAT_PERCENT'
	];
	
	$scope.otherCategoriesToDisplay = [
		'FIRST',
		'LAST',
		'SNITCH_CATCHES',
		'TIME_SEEKING',
		'YELLOWS',
		'REDS'
	];
	
	$scope.sortPMMap = function(category) {
		category = $scope.convertCategoryName(category);
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
		category = $scope.convertCategoryName(category);
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
	
	$scope.convertCategoryName = function(category) {
		var ret;
		switch(category) {
			case "FIRST":
				ret = "first_name";
				break;
			case "LAST":
				ret = "last_name";
				break;
			case "SHOTS":
				ret = "shot";
				break;
			case "GOALS":
				ret = "goal";
				break;
			case "ASSISTS":
				ret = "assist";
				break;
			case "POINTS":
				ret = "point";
				break;
			case "TURNOVERS":
				ret = "turnover";
				break;
			case "TAKEAWAYS":
				ret = "takeaway";
				break;
			case "YELLOWS":
				ret = "yellow_card";
				break;
			case "REDS":
				ret = "red_card";
				break;
			case "SNITCHES":
				ret = "snitch_catch";
				break;
			case "PLUS":
				ret = "plusses";
				break;
			case "MINUS":
				ret = "minuses";
				break;
			case "NET":
				ret = "net";
				break;
			case "RATIO":
				ret = "ratio";
				break;
			case "TIME":
				ret = "time";
				break;
			default:
				ret = category;
		}
		return ret;
	};
	
}]);