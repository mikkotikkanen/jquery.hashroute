jQuery plugin for hash simple routing
===================================

Routing
---------------------------
```javascript
$(document).hashroute('/', function(e) {
	// Home route activated
});
$(document).hashroute('/page1', function(e) {
	// Page1 route activated
});
```

These routes can be activated with simply setting hashurl to a link

```html
<a href="#/">Go home</a>
<a href="#/page1">Page 1</a>
```

Also: When links are encased within `nav` element or `nav` -class, the corresponding elements also automatically get `active`-class on route change for styling needs.

```html
<nav>
    <a href="#/">Go home</a>
    <a href="#/page1" class="active">Page 1</a>
</nav>
```

### Route parameters

Params can be set like so, `:id` and can be found from `e.params` object

```javascript
$(document).hashroute('/page1/:item', function(e) {
	// Page 1, item e.params.item route activated
});
$(document).hashroute('/:page/:item', function(e) {
	// Page e.params.page, item e.params.item route activated
});
```

### Special routes

__404 - Route/Page not found__

```javascript
$.hashroute('404', function(e) {
	// Error 404 activated
});
```

Middleware
-----------------

jquery.hashroute also supports middleware. In short, middleware is a function that is executed before
any routing happens. This can be used for example checking authentication before loading the page.

```javascript
$.hashroute('middleware', function(e) {
	console.log('First middleware - Setting e.params.first');
	e.first = true;
	this.next(); // Advance in the middleware stack
});
$(document).hashroute('/', function(e) {
	// e.first equals to true
});
```

__Note__: Middleware stack doesn't advance until `this.next()` is called.


Options
--------------------

* __verbose__: (default: false) Show debug logs in console

Options can be set either by constructor or calling the `set` method.

```javascript
$.hashroute({
	verbose: true
});
// OR
$.hashroute('set', 'verbose', true);
```
