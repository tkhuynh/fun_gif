function randomNum(array) {
	return Math.floor(Math.random() * array.length);
}
var app = angular.module('funGifApp', ['ngRoute', 'ngResource', 'satellizer', 'angularUtils.directives.dirPagination']);

app.config(['$routeProvider', '$locationProvider', '$authProvider', function($routeProvider, $locationProvider, $authProvider) {
	$routeProvider
		.when('/', {
			templateUrl: 'templates/home.html',
			controller: 'SearchCtrl'
		})
		.when('/favorites', {
			templateUrl: 'templates/favorites.html',
			controller: 'FavoritesCtrl'
		})
		.when('/signup', {
			templateUrl: 'templates/signup.html',
			controller: 'AuthCtrl'
		})
		.when('/login', {
			templateUrl: 'templates/login.html',
			controller: 'AuthCtrl'
		})
		.when('/profile', {
			templateUrl: 'templates/profile.html',
			controller: 'ProfileCtrl'
		})
		.otherwise({
			redirectTo: '/'
		});

	$locationProvider.html5Mode({
		enabled: true,
		requireBase: false
	});

	// Facebook
	$authProvider.facebook({
		clientId: '1698583787047335',
		name: 'facebook',
		url: '/auth/facebook',
		authorizationEndpoint: 'https://www.facebook.com/v2.5/dialog/oauth',
		redirectUri: window.location.origin + '/',
		requiredUrlParams: ['display', 'scope'],
		scope: ['email'],
		scopeDelimiter: ',',
		display: 'popup',
		type: '2.0',
		popupOptions: {
			width: 580,
			height: 400
		}
	});

	// Google
	$authProvider.google({
		clientId: '855838489218-q0dbbnl2uu2c4pqnrevpt1g2oe2fhif2.apps.googleusercontent.com',
		url: '/auth/google',
		authorizationEndpoint: 'https://accounts.google.com/o/oauth2/auth',
		redirectUri: window.location.origin,
		requiredUrlParams: ['scope'],
		optionalUrlParams: ['display'],
		scope: ['profile', 'email'],
		scopePrefix: 'openid',
		scopeDelimiter: ' ',
		display: 'popup',
		type: '2.0',
		popupOptions: {
			width: 452,
			height: 633
		}
	});
}]);

app.factory('Gif', ['$resource', function($resource) {
	return $resource('/api/gifs/:id', {
		id: "@_id"
	}, {
		query: {
			isArray: true,
			transformResponse: function(data) {
				return angular.fromJson(data).results;
			}
		}
	});
}]);

app.factory('Like', ['$resource', function($resource) {
	return $resource('/api/likes/:id', {
		id: "@_id"
	}, {
		query: {
			isArray: true,
			transformResponse: function(data) {
				return angular.fromJson(data).results;
			}
		}
	});
}]);

app.controller('MainCtrl', ['$scope', '$auth', '$http', '$location',
	function($scope, $auth, $http, $location) {
		$scope.isAuthenticated = function() {
			// send GET request to '/api/me'
			$http.get('/api/me')
				.then(function(response) {
					// if response.data comes back, set $scope.currentUser = response.data
					if (response.data) {
						$scope.currentUser = response.data.user;
					} else {
						// otherwise remove token (https://github.com/sahat/satellizer#authremovetoken)
						$auth.removeToken();
					}
				}, function(error) {
					$auth.removeToken();
				});
		};

		$scope.isAuthenticated();

		$scope.logout = function() {
			// logout (https://github.com/sahat/satellizer#authlogout)
			$auth.logout()
				.then(function() {
					// set $scope.currentUser = null
					$scope.currentUser = null;
					// redirect to root
					$location.path('/');
				});
		};
	}
]);

app.controller('SearchCtrl', ['$scope', '$http', 'Gif', '$location', '$anchorScroll',
	function($scope, $http, Gif, $location, $anchorScroll) {
		var greetings = ['hello', 'nice day', 'good', 'nice', 'cute', 'thumb up', 'love', 'happy'];
		$scope.gifs = [];
		$scope.searched = false;
		$scope.loaded = false;
		var keyword = greetings[randomNum(greetings)];
		var url = 'https://api.giphy.com/v1/gifs/search?q=' + keyword + '&api_key=dc6zaTOxFJmzC';
		$scope.gifInit = function() {
			$http({
					method: 'GET',
					url: url,
					skipAuthorization: true // `Authorization: Bearer <token>` will not be sent on this request.
				})
				.then(function(response) {
					var data = response.data.data;
					// only need to return the number of gifs which can be divided by 4
					if (data.length / 4 >= 1 && data.length % 4 !== 0) {
						for (var counter = 0; counter < (data.length % 4); counter++) {
							data.pop();
						}
					}
					$scope.loaded = true;
					$scope.gifs = data;
				}, function(error) {
					console.log(error);
				});
		};

		$scope.searchKeyword = function() {
			$scope.gifs = [];
			$scope.loaded = false;
			keyword = $scope.keyword;
			$scope.savedKeyword = keyword;
			url = 'https://api.giphy.com/v1/gifs/search?q=' + keyword + '&api_key=dc6zaTOxFJmzC';
			$http({
					method: 'GET',
					url: url,
					skipAuthorization: true // `Authorization: Bearer <token>` will not be sent on this request.
				})
				.then(function(response) {
					$scope.keyword = '';
					$scope.searched = true;
					var data = response.data.data;
					// only need to return the number of gifs which can be divided by 4
					if (data.length / 4 >= 1 && data.length % 4 !== 0) {
						for (var counter = 0; counter < (data.length % 4); counter++) {
							data.pop();
						}
					}
					$scope.loaded = true;
					$scope.gifs = data;
				}, function(error) {
					console.log(error);
				});
		};
		$scope.saved = false;
		$scope.saveGif = function(gif) {
			if ($scope.currentUser) {
				$scope.saved = true;
				gif.favorited = true;
				timeStamp = new Date();
				timeStamp = timeStamp.toLocaleDateString();
				var gifData = {
					keyword: keyword,
					url: gif.images.downsized.url,
					imported: timeStamp,
					height: Number(gif.images.downsized.height),
					currentUserLike: false
				};
				Gif.save(gifData, function(data) {
					console.log("success");
				}, function(error) {
					console.log(error);
				});
			} else {
				/* Scrolling and then resetting the $location.hash() so angular does not 
				perceive a change in url seems to work.
				http://stackoverflow.com/questions/17711232/scroll-to-in-angularjs#answer-18490385
				*/
				var old = $location.hash();
				$location.hash('forSignupMsgAnchor');
				$anchorScroll();
				$location.hash(old);
				$scope.signupMsg = true;
			}
		};
	}
]);

app.controller('FavoritesCtrl', ['$scope', 'Gif', '$http', '$location', '$anchorScroll', 'Like', '$window',
	function($scope, Gif, $http, $location, $anchorScroll, Like, $window) {
		$scope.isAuthenticated();
		$scope.loaded = false;
		$scope.totalFavorites = 0;
		$scope.favoritesPerPage = 12; // this should match however many results your API puts on one page
		getResultsPage(1);
		$scope.pagination = {
			current: 1
		};
		$scope.pageChanged = function(newPageNumber) {
			getResultsPage(newPageNumber);
		};
		function getResultsPage(pageNumber) {
			userId = $scope.currentUser._id;
			$http.get('/api/gifs?page=' + pageNumber + '&user=' + userId)
				.then(function(response) {
					$location.hash('top');
					$anchorScroll();
					$scope.favorites = response.data.resultsInPageNumber;
					$scope.totalFavorites = response.data.allGifsCount;
					console.log(response.data.resultsInPageNumber);
					$scope.loaded = true;
				});
		}

		$scope.deleteGif = function(favorite) {
			$scope.favorites = $scope.favorites.filter(function(gif) {
				return gif._id !== favorite._id;
			});
			Gif.delete({
				id: favorite._id
			});
		};

		$scope.likeGif = function(gif) {
			// note: "hack" way to update number of likes
			// if user already liked the gif, pop a like to decrease 1 like disregarding 
			// which like belong to
			// if user haven't like the gif, push "1 more" to increase 1 like
			// this won't hurt the database
			if (gif.currentUserLike) {
				gif.voters.pop();
			} else {
				gif.voters.push("1 more");
			}
			gif.currentUserLike = !gif.currentUserLike;
			var savedLike = {
				gif_id: gif._id,
				voter_id: $scope.currentUser._id
			};
			// note: even thought this a post request, but it does not always create a new like
			// if user already liked the gif, the server will delete that like (unlike option)
			// if user haven't like the gif, the server will create a like with gif_id and voter_id
			Like.save(savedLike, function(data) {
			}, function(err) {	
				console.log(err);
			});
		};
	}
]);

app.controller('AuthCtrl', ['$scope', '$auth', '$location',
	function($scope, $auth, $location) {
		// if $scope.currentUser, redirect to '/profile'
		if ($scope.currentUser) {
			$location.path('/profile');
		}

		// oauth
		$scope.authenticate = function(provider) {
			$auth.authenticate(provider)
				.then(function(response) {
					// set totken
					$auth.setToken(response.data.token);
					// call $scope.isAuthenticated to set $scope.currentUser
					$scope.isAuthenticated();
					$location.path('/');
				});
		};
		// clear sign up / login forms
		$scope.user = {};

		$scope.signup = function() {
			// signup (https://github.com/sahat/satellizer#authsignupuser-options)
			$scope.user.picture = "/images/smile.png";
			$auth.signup($scope.user)
				.then(function(response) {
					// set token (https://github.com/sahat/satellizer#authsettokentoken)
					$auth.setToken(response.data.token);
					// call $scope.isAuthenticated to set $scope.currentUser
					$scope.isAuthenticated();
					// clear sign up form
					$scope.user = {};
					// redirect to '/profile'
					$location.path('/profile');
				}, function(error) {
					console.error(error);
				});
		};

		$scope.login = function() {
			// login (https://github.com/sahat/satellizer#authloginuser-options)
			$auth.login($scope.user)
				.then(function(response) {
					// set token (https://github.com/sahat/satellizer#authsettokentoken)
					$auth.setToken(response.data.token);
					// call $scope.isAuthenticated to set $scope.currentUser
					$scope.isAuthenticated();
					// clear sign up form
					$scope.user = {};
					// redirect to '/profile'
					$location.path('/');
				}, function(error) {
					console.error(error);
				});
		};
	}
]);

app.controller('ProfileCtrl', ['$scope', '$auth', '$http', '$location', 'Gif',
	function($scope, $auth, $http, $location, Gif) {
		// if user is not logged in, redirect to '/login'
		if ($scope.currentUser === undefined) {
			$location.path('/login');
		}
		// make get request to get update info about user
		$http.get('/api/me')
			.then(function(response) {
				$scope.currentUser = response.data.user;
				$scope.currentUserGifs = response.data.userGifs;
				$scope.currentUserLikes = response.data.userLikes;
			});
		$scope.editProfile = function() {
			$http.put('/api/me', $scope.currentUser)
				.then(function(response) {
					$scope.showEditForm = false;
				}, function(error) {
					console.error(error);
					$auth.removeToken();
				});
		};
		$scope.deleteGif = function(favorite) {
			$scope.currentUserGifs = $scope.currentUserGifs.filter(function(gif) {
				return gif._id !== favorite._id;
			});
			Gif.delete({
				id: favorite._id
			});
		};
	}
]);