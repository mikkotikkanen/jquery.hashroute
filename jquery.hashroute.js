/*!
 * jQuery.hashroute
 *
 * Enables simple hash routing in your web app.
 *
 * @version 1.0
 * @author Mikko Tikkanen <mikko.tikkanen@gmail.com>
 */
/* jshint browser: true, devel: true */
/* global jQuery */
;(function(window, document, $, undefined) {
	var methods = {},			// Methods namespace
		O = {					// Options
			middleware: [],		//   Middleware stack
			verbose: false		//   Display logs
		},				
		routes = [];			// Routes
	
	
	
	/* Route
	 * ------------------------------------------------------------------------------------------ */
	methods.route = function(route, callback) {
		if(route === null || route === undefined) { return; }
		
		// Constructor - Set options
		if(typeof route == 'object') {
			O = route;
			
			// Make sure things are as they should
			O.middleware = O.middleware || [];
			if(typeof O.middleware == 'function') { O.middleware = [O.middleware]; }
			return;
		}
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
		O.middleware.push(fnc);
		_log('Middleware added. '+fnc.toString().substring(0, 100).replace(/[\W]*$/g, '')+'...');
	};


	/* Set option method
	 * ------------------------------------------------------------------------------------------ */
	methods.set = function(key, value) {
		O[key] = value;
		if(typeof O.middleware == 'function') { O.middleware = [O.middleware]; }
	};
	
	
	
	/* Plugin base logic
	 * ------------------------------------------------------------------------------------------ */
	$.hashroute = $.fn.hashroute = function(method) {
		if(methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else {
			return methods.route.apply(this, arguments);
		}
	};
	
	
	
	
	
	/* Hashchange, run middleware which in turn runs routes
	 * ------------------------------------------------------------------------------------------ */
	$(window).on('hashchange', function(e) {
		var hash = location.hash.substring(1);
		
		// Setup
		e.hash = hash;
		e.params = {};
		
		_runMiddleware(e);
	});
	
	
	/* Run middleware
	 * ------------------------------------------------------------------------------------------ */
	function _runMiddleware(e) {
		
		// If no middleware is defined, run routes
		if(!O.middleware.length) {
			_runRoutes(e);
			return;
		}
		
		// Create next function for advancing in middleware stack & call it to start the run
		_log('Running middleware stack...');
		var i = -1;
		var next = function() {
			i++;
			if(i >= O.middleware.length) {
				_runRoutes(e);
				return;
			}
			O.middleware[i].next = next;
			O.middleware[i].call(O.middleware[i], e);
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
		$('a[href^=#].active').removeClass('active');
		$('nav, .nav').find('a[href^=#]').each(function(i, el) {
			el = $(el);
			var href = el.attr('href').substring(1);
			//if(href) { el.removeClass('active'); }
			if(route.test.test(href)) {
				el.addClass('active');
			}
		});
	}
	
	
	/* Log helper
	 * ------------------------------------------------------------------------------------------ */
	function _log(msg) {
		if(!O.verbose) { return; }
		console.log('jQuery.hashroute::'+msg, Array.prototype.slice.call(arguments, 1));
	}
	
	
	
	// When everything's ready, fire hashchange
	$(document).ready(function() {
		$(window).trigger('hashchange');
	});
	
	
})(window, document, jQuery);