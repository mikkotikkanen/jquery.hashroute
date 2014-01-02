/*!
 * jQuery.hashroute
 *
 * Enables simple hash routing in your web app.
 *
 * @version 1.1
 * @author Mikko Tikkanen <mikko.tikkanen@gmail.com>
 */
/* jshint browser: true, devel: true */
/* global jQuery */
;(function(window, document, $, undefined) {
	var methods = {},			// Methods namespace
		O = {					// Options
			verbose: false		//   Display logs
		},				
		middleware = [],		// Middleware stack
		routes = [];			// Routes
	
	
	
	/* Route
	 * ------------------------------------------------------------------------------------------ */
	methods.route = function(route, callback) {
		if(route === null || route === undefined) { return; }
		
		// Constructor - Set options. Also, callback needs to be set.
		if(typeof route == 'object') { O = route; return; }
		if(!callback) { return; }
		
		// Create route object
		var obj = {
			el: this,				// Target element
			route: route,			// Original route	
			test: route,			// Test regexp
			paramsNameList: [],		// Param name list
			callback: callback		// Route callback function
		};
		
		// Collect param names & convert test to more regexp like structure
		if(route.indexOf(':') != -1) {
			obj.test = obj.test.replace(/:([^\/]+)/g, function(match, submatch) {
				obj.paramsNameList.push(submatch);
				return '([^\/]+)';
			});
		}
		
		// Set regexp (start/end slashes are handled by regexp)
		obj.test = new RegExp('^\/?'+obj.test.replace(/^[\/]*|[\/]*$/g, '')+'\/?$', "i");
		
		routes.push(obj);
	};

	
	/* Add middleware
	 * ------------------------------------------------------------------------------------------ */
	methods.middleware = function(fnc) {
		middleware.push(fnc);
		_log('Middleware added. '+fnc.toString().substring(0, 100).replace(/[\W]*$/g, '')+'...');
	};
	
	
	/* Add 404 route
	 * ------------------------------------------------------------------------------------------ */
	methods[404] = function(fnc) {
		methods.route.call(this, '(.*)', fnc);
	};


	/* Set option method
	 * ------------------------------------------------------------------------------------------ */
	methods.set = function(key, value) {
		O[key] = value;
	};
	
	
	
	/* Plugin base logic
	 * ========================================================================================== */
	$.hashroute = $.fn.hashroute = function(method) {
		if(methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else {
			return methods.route.apply(this, arguments);
		}
	};
	
	
	
	
	
	
	
	/* Hashchange, setup event and run middleware which in turn runs routes
	 * ------------------------------------------------------------------------------------------ */
	function _hashchange(e) {
		e = e || jQuery.Event('hashchange');
		e.hash = location.hash.substring(1);
		e.params = {};
		
		_runMiddleware(e);
	}
	$(window).on('hashchange.hashroute', _hashchange);
	
	
	/* Run middleware
	 * ------------------------------------------------------------------------------------------ */
	function _runMiddleware(e) {
		
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
				_runRoutes(e);
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
		var route;
		$.each(routes, function(i, obj) {
			if(!obj.test.test(e.hash)) { return; }
			route = obj;
			_log('Found route.', route.route);
			
			// It's a hit! Process the route
			var params = {};
			if(route.paramsNameList.length) {
				var matches = e.hash.match(route.test);
				matches.shift(); // Remove the full match from the beginning
				$.each(matches, function(i, match) {
					e.params[route.paramsNameList[i]] = match;
				});
			}
			
			// Fire callback and exit route looping
			route.callback.call(route.el, e);
			return false;
		});
				
		// If there's active no route, create one with test regexp for current hash
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
		args[0] = 'jQuery.hashroute - '+args[0];
		console.log.apply(window.console, args);
	}
	
	
	
	// When everything's ready, fire hashchange
	$(document).ready(function() {
		_hashchange();
	});
	
	
})(window, document, jQuery);