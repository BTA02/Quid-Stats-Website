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