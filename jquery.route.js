/*!
 * jQuery.hashrrouteoute
 *
 * Plugin for doing hash & url routing. Now with middleware!
 *
 * 
 * @version 2.1
 * @author Mikko Tikkanen <mikko.tikkanen@gmail.com>
 */
/* jshint browser: true, devel: true */
/* global jQuery */
;(function(window, document, $, undefined) {
	'use strict';

	var methods = {},				// Methods namespace
		O = {						// Options
			baseUrl: '',
			verbose: false			// Display logs
		},
		middleware = [],			// Middleware stack
		routeEls = [],				// Route elements
		$document = $(document);	// Document element


	/* Route
	 * ------------------------------------------------------------------------------------------ */
	methods.route = function(route, callback) {
		if(route === null || route === undefined) { return; }

		// Set options. Also, callback needs to be set.
		if(typeof route === 'object') { O = $.extend({}, O, route); return; }
		if(!callback) { return; }

		// Switch wildcards to wilcard params
		route = route.replace(/(\*)/g, ':*');

		// Add baseurl to the route
		route = O.baseUrl + route;

		// Create route object
		route = {
			route: route,					// Original route
			test: route,					// Test regexp
			isHash: (/^#/.test(route)),		// Hash or url route
			paramsNameList: [],				// Param name list
			callback: callback				// Route callback function
		};

		// Remove the hash from regexp
		route.test = route.test.replace('#', '');

		// Collect param names & convert test to more regexp like structure
		if(route.route.indexOf(':') !== -1) {
			var i = 1;
			route.test = route.test.replace(/:([^\/]+)/g, function(match, submatch) {
				var pattern = '([^\/]+)'; // Default param pattern

				// Wildcards, change pattern to accept anything
				if(submatch === '*') {
					pattern = '?(.*)';
					submatch = '$'+i;
				}

				// If it's optional, change pattern to match "zero or more ("+" to "*")
				if(/\?$/.test(submatch)) { pattern = pattern.replace('+', '*'); }

				// Add parameter to namelist
				submatch = submatch.replace(/^([^a-zA-Z0-9$]*)|([^a-zA-Z0-9$]*)$/g, ''); // TODO: Better way to do this?
				route.paramsNameList.push(submatch);

				i++;
				return pattern;
			});
		}

		// Set test regexp (strip start/end slashes from the original match)
		route.test = new RegExp('^\/?'+route.test.replace(/^[\/]*|[\/]*$/g, '')+'\/?$', 'i');

		// Add route to target element (default to document)
		var el = this || $document;
		var arr = el.data('routes.route') || [];
		arr.push(route);
		el.data('routes.route', arr);

		// Store route element (if not already in the array)
		var found = false;
		$.each(routeEls, function(i, elem) {
			if(el[0] === elem[0]) { found = true; return false; }
		});
		if(!found) { routeEls.push(el); }
	};


	/* Add middleware
	 * ------------------------------------------------------------------------------------------ */
	methods.middleware = function(fnc) {
		middleware.push(fnc);
		_log('Middleware added. '+fnc.toString().substring(0, 100).replace(/[\W]*$/g, '')+'...');
	};


	/* Trigger route
	 * ------------------------------------------------------------------------------------------ */
	methods.trigger = function(data) {
		var e = e || jQuery.Event('popstate'); // from history API
		e.url = location.pathname;
		if(data) { e.data = data; }
		e.params = {};

		_runRoutes.call(this, e);
	};


	/* Add 404 route
	 * ------------------------------------------------------------------------------------------ */
	methods[404] = function(fnc) {
		methods.route.call(this, '(.*)', fnc);
	};

	/* Set options
	 * ------------------------------------------------------------------------------------------ */
	methods.set = methods.options = function(key, value) {
		if(typeof key === 'object') {
			$.extend(O, key);
		} else {
			O[key] = value;
		}
		O.baseUrl += (!/\/$/.test(O.baseUrl) ? '/' : ''); // Make sure baseUrl ends with slash
	};



	/* Plugin base logic
	 * ========================================================================================== */
	$.route = $.fn.route = function(method) {
		if(methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else {
			return methods.route.apply(this, arguments);
		}
	};







	/* Hashchange, setup event and run middleware which in turn runs routes
	 * ------------------------------------------------------------------------------------------ */
	function _hashchange(e) {
		console.log('!! hashchange', e);
		e = e || jQuery.Event('hashchange');
		e.hash = location.hash.substring(1);
		e.params = {};

		_runMiddleware(e);
	}
	$(window).on('hashchange.route', _hashchange);


	/* Urlchange, setup event and run middleware which in turn runs routes
	 * ------------------------------------------------------------------------------------------ */
	function _urlchange(e) {
		console.log('!! popstate!', e);
		e = e || jQuery.Event('popstate'); // from history API
		e.url = location.pathname;
		e.params = {};

		_runMiddleware(e);
	}
	$(window).on('popstate.route', _urlchange);
	

	/* Popstate, setup event and run middleware which in turn runs routes
	 * ------------------------------------------------------------------------------------------ */
	function _popstate(e) {
		e = e || jQuery.Event('popstate'); // from history API
		e.url = location.pathname;
		e.params = {};

		_runMiddleware(e);
	}
	$(window).on('popstate.route', _urlchange);




	/* Run middleware
	 * ------------------------------------------------------------------------------------------ */
	function _runMiddleware(e) {
		/* jshint validthis: true */
		var self = this;

		// If no middleware is defined, run routes
		if(!middleware.length) {
			_runRoutes(e);
			return;
		}

		// Create next function for advancing in middleware stack & call it to start the run
		_log('Running middleware stack...');
		var i = -1;
		var next = function() {
			i++;
			if(i >= middleware.length) {
				_runRoutes.call(self, e);
				return;
			}
			middleware[i].next = next;
			middleware[i].call(middleware[i], e);
		};

		next();
	}


	/* Run routes
	 * ------------------------------------------------------------------------------------------ */
	function _runRoutes(e) {
		/* jshint validthis: true */
		var subject = (e.type === 'hashchange' ? e.hash : window.location.pathname); // Figure out the subject to run the routes to

		// If "this" is specified, run routes to that element. Otherwise, run everything
		var els = routeEls;
		if(this && this instanceof jQuery) { els = [this]; }

		// Loop through route elements
		var route;
		$.each(els, function(i, el) {
			var arr = el.data('routes.route') || [];

			// Go through routes
			$.each(arr, function(i, obj) {
				route = obj;
				if(!route.test.test(subject)) { return; } // Evaluate the route
				_log('Found route.', route.route);

				// It's a hit! Process the route
				var params = {};
				if(route.paramsNameList.length) {
					var matches = subject.match(route.test);
					matches.shift(); // Remove the full match from the beginning
					$.each(matches, function(i, match) {
						//if(/\//.test(match)) { match = match.split('/'); }
						if(/\$/.test(route.paramsNameList[i])) { match = match.split('/'); }
						//console.log(route.paramsNameList[i]);
						e.params[route.paramsNameList[i]] = match;
					});
				}

				// Set variable according if elements current route changed
				e.routeChanged = el.data('route.current') !== route.route;
				el.data('route.current', route.route);

				// Fire callback and exit route looping
				route.callback.call(el, e);
				return false;
			});

		});

		// If there's active no route, create one with test regexp for current hash (for activating the nav links)
		if(!route) { _log('Route not found.'); }
		route = route || { test: new RegExp('^\/?'+window.location.hash.substring(1).replace(/^[\/]*|[\/]*$/g, '')+'\/?$', "i") };

		// Activate nav links
		_log('Activating nav links.');
		$('nav, .nav').find('a[href^=#]').each(function(i, el) {
			el = $(el);
			el.removeClass('active');
			var href = el.attr('href').substring(1);
			if(route.test.test(href)) {
				el.addClass('active');
			}
		});
	}


	/* Log helper
	 * ------------------------------------------------------------------------------------------ */
	function _log() {
		if(!O.verbose) { return; }
		var args = [].slice.call(arguments, 0);
		args[0] = 'jQuery.route - '+args[0];
		console.log.apply(window.console, args);
	}



	// When everything's ready, fire hashchange
	$(document).ready(function() {
		_hashchange();
		_urlchange();
	});


})(window, document, jQuery);
