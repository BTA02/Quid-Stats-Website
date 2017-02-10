'use strict';
var app = angular.module('app', ['angucomplete-alt', 'snap', 
								'ngSanitize', 'com.2fdevs.videogular', 
								'com.2fdevs.videogular.plugins.controls',
								'info.vietnamcode.nampnq.videogular.plugins.youtube']);

app.filter('time', function() {
	var conversions = {
		'ss': angular.identity,
		'mm': function(value) { return value * 60; },
		'hh': function(value) { return value * 3600; }
	};
	
	var padding = function(value, length) {
		var zeroes = length - ('' + (value)).length,
				pad = '';
		while(zeroes-- > 0) pad += '0';
		return pad + value;
	};
	
	return function(value, unit, format, isPadded) {
		var totalSeconds = conversions[unit || 'ss'](value),
				hh = Math.floor(totalSeconds / 3600),
				// mm = Math.floor((totalSeconds % 3600) / 60),
				mm = Math.floor(totalSeconds / 60),
				ss = totalSeconds % 60;

		format = format || 'hh:mm:ss';
		isPadded = angular.isDefined(isPadded)? isPadded: true;
		hh = isPadded? padding(hh, 2): hh;
		mm = isPadded? padding(mm, 2): mm;
		ss = isPadded? padding(ss, 2): ss;
		
		return format.replace(/hh/, hh).replace(/mm/, mm).replace(/ss/, ss);
	};
});

app.filter('statNameFilter', function() {

	return function(value) {
		if (!value) {
			return;
		}
		var ret = value.replace(/_/g, ' ');
		ret = ret.toLowerCase();
		ret = ret.replace( /\b\w/g, function (m) {
			return m.toUpperCase();
		});
		ret = ret.replace(/\"|\[|\]/g, "");
		return ret;
	};

});

app.controller('RecordFullStatsController', ['$scope', '$http', '$interval', '$sce', function($scope, $http, $interval, $sce) {

}]);

app.controller('ViewFullStatsController', ['$scope', '$http', function($scope, $http) {

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

app.controller('ViewStatsController', ['$scope', '$http', function($scope, $http) {
	
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

app.controller('AddTeamController', ['$scope', '$http', function($scope, $http) {
	
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

app.controller('AddVideoController', ['$scope', '$http', function($scope, $http) {
	
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

app.controller('PublicController', ['$scope', '$http', function($scope, $http) {
	
}]);

app.controller('HomeController', ['$scope', '$http', function($scope, $http) {

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

app.controller('RankingsController', ['$scope', function($scope) {
	
	$scope.combinedRankings = [];
	$scope.combinedRankings.push(["Q.C. Boston", 1, 1, 1]);
	$scope.combinedRankings.push(["Texas Cavalry", 2, 5, 2]);
	$scope.combinedRankings.push(["Bowling Green State University", 3, 4, 5]);
	$scope.combinedRankings.push(["Rochester United", 4, 2, 4]);
	$scope.combinedRankings.push(["Maryland Quidditch", 5, 3, 13]);
	$scope.combinedRankings.push(["Los Angeles Gambits",6, 7, 3]);
	$scope.combinedRankings.push(["The Lost Boys",7, 8, 9]);
	$scope.combinedRankings.push(["Texas Quidditch",8, 6, 8]);
	$scope.combinedRankings.push(["The Warriors",9, 20, 17]);
	$scope.combinedRankings.push(["Oklahoma State University",10, 12, 19]);
	$scope.combinedRankings.push(["Mizzou Quidditch",11, 9, 6]);
	$scope.combinedRankings.push(["Ball State Cardinals",12, 16, 15]);
	$scope.combinedRankings.push(["DCQC",13, 22, "NR"]);
	$scope.combinedRankings.push(["Boise State Abraxans",14, 23, 24]);
	$scope.combinedRankings.push(["Bosnyan Bearsharks",15, 49, 12]);
	$scope.combinedRankings.push(["Texas State University - San Marcos",16, 14, 9]);
	$scope.combinedRankings.push(["Rutgers University Quidditch",17, 13, "NR"]);
	$scope.combinedRankings.push(["Texas A&M Quidditch",18, 11, 7]);
	$scope.combinedRankings.push(["Michigan Quidditch Team",19, 16, "NR"]);
	$scope.combinedRankings.push(["University of North Carolina",20, 24, "NR"]);
	$scope.combinedRankings.push(["Lone Star Quidditch Club",21, 10, 9]);
	$scope.combinedRankings.push(["Gulf Coast Gumbeaux",36, 32, 14]);
	$scope.combinedRankings.push(["RPI Quidditch",23, 19, 16]);
	$scope.combinedRankings.push(["Texas Tech Quidditch",58, 46, 18]);
	$scope.combinedRankings.push(["Florida's Finest",35, 27, 20]);
	$scope.combinedRankings.push(["Penn State University Nittany Lions",27, 15, "NR"]);
	$scope.combinedRankings.push(["Arizona State University",26, 18, 22]);
	
	function qsComparator(a, b) {
		if (a[1] < b[1]) return -1;
		if (a[1] > b[1]) return 1;
		return 0;
	}
	function eeloComparator(a, b) {
		if (a[2] < b[2]) return -1;
		if (a[2] > b[2]) return 1;
		return 0;
	}
	function emComparator(a, b) {
		var rA = a[3] == 'NR' ? 30 : a[3]
		var rB = b[3] == 'NR' ? 30 : b[3]
		if (rA < rB) return -1;
		if (rA > rB) return 1;
		return 0;
	}
	function combComparator(a, b) {
		var frA = 30;
		var frB = 30;
		if (a[3] != 'NR') {
			frA = a[3]
		}
		if (b[3] != 'NR') {
			frB = b[3]
		}
		var avgA = (a[1] + a[2] + frA) / 3 
		var avgB = (b[1] + b[2] + frB) / 3 
		if (avgA < avgB) return -1;
		if (avgA > avgB) return 1;
		return 0;
	}
	
	$scope.sortRankings = function(which) {
		if (which == 1) {
			$scope.combinedRankings.sort(qsComparator);
		} else if (which == 2) {
			$scope.combinedRankings.sort(eeloComparator);
		} else if (which == 3) {
			$scope.combinedRankings.sort(emComparator);
		} else if (which == 4) {
			$scope.combinedRankings.sort(combComparator);
		}
	};
	
	
}]);