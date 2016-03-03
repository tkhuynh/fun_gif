function randomNum(array) {
	return Math.floor(Math.random() * array.length);
}
var app = angular.module('funGifApp', ['ngRoute', 'ngResource', 'satellizer']);

app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
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
}]);

app.factory('Gif', ['$resource', function($resource) {
	return $resource('/api/gifs/:id', { id: "@_id" }, {
    query: {
      isArray: true,
      transformResponse: function(data) { return angular.fromJson(data).results; }
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
						$scope.currentUser = response.data;
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

app.controller('AuthCtrl', ['$scope', '$auth', '$location',
	function($scope, $auth, $location) {
		// if $scope.currentUser, redirect to '/profile'
		if ($scope.currentUser) {
			$location.path('/profile');
		}

		// clear sign up / login forms
		$scope.user = {};

		$scope.signup = function() {
			// signup (https://github.com/sahat/satellizer#authsignupuser-options)
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
					$location.path('/profile');
				}, function(error) {
					console.error(error);
				});
		};
	}
]);

app.controller('ProfileCtrl', ['$scope', '$auth', '$http', '$location',
	function($scope, $auth, $http, $location) {
		// if user is not logged in, redirect to '/login'
		if ($scope.currentUser === undefined) {
			$location.path('/login');
		}

		$scope.editProfile = function() {
			$http.put('/api/me', $scope.currentUser)
				.then(function(response) {
					$scope.showEditForm = false;
				}, function(error) {
					console.error(error);
					$auth.removeToken();
				});
		};
	}
]);

app.controller('SearchCtrl', ['$scope', '$http', 'Gif', function($scope, $http, Gif) {
	var greetings = ['hello', 'nice day', 'good', 'nice', 'cute', 'thumb up', 'love', 'happy'];
	$scope.gifs = [];
	$scope.searched = false;
	$scope.loaded = false;
	var keyword = greetings[randomNum(greetings)];
	var url = 'https://api.giphy.com/v1/gifs/search?q=' + keyword + '&api_key=dc6zaTOxFJmzC';
	$http({
		  method: 'GET',
		  url: url,
		  skipAuthorization: true  // `Authorization: Bearer <token>` will not be sent on this request.
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
			}
		);
	};
	$scope.saved = false;
	$scope.saveGif = function(gif) {
		$scope.saved = true;
		gif.favorited = true;
		timeStamp = new Date();
		timeStamp = timeStamp.toLocaleDateString();
		var gifData = {
			keyword: keyword,
			url: gif.images.downsized.url,
			imported: timeStamp,
			height: Number(gif.images.downsized.height)
		};
		Gif.save(gifData, function(data) {
			console.log("success");
		}, function(error) {
			console.log(error);
		});
	};
}]);

app.controller('FavoritesCtrl', ['$scope', 'Gif',
	function($scope, Gif) {
		$scope.loadFavorites = function () {
			$scope.loaded = false;
			Gif.query(function (data) {
		    $scope.loaded = true;
		    $scope.favorites = data;
		  });
		};
		$scope.loadFavorites();

		$scope.deleteGif = function (favorite) {
			$scope.favorites = $scope.favorites.filter(function(book) {
				return book._id !== favorite._id;
			});
			Gif.delete({id: favorite._id});
		};
}]);