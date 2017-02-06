angular.module('app').controller('RankingsController', ['$scope', function($scope) {
	
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