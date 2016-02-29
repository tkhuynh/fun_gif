function randomNum(array) {
	return Math.floor(Math.random() * array.length);
}
var app = angular.module('funGifApp', ['ngRoute', 'ngResource']);

app.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
	$routeProvider
		.when('/', {
			templateUrl: 'templates/home.html',
			controller: 'SearchCtrl'
		})
		.when('/favorites', {
			templateUrl: 'templates/favorites.html',
			controller: 'FavoritesCtrl'
		});

	$locationProvider.html5Mode({
		enabled: true,
		requireBase: false
	});
}]);

app.factory('Gif', ['$resource', function($resource) {
	return $resource('/api/gifs/:id', {id: '@_id'});
}]);

app.controller('SearchCtrl', ['$scope', '$http', 'Gif', function ($scope, $http, Gif) {
	var greetings = ['hello', 'nice day', 'good', 'nice', 'cute', 'thumb up', 'love', 'happy'];
	$scope.gifs = [];
	$scope.searched = false;
	var keyword = greetings[randomNum(greetings)];
	var url = 'https://api.giphy.com/v1/gifs/search?q=' + keyword + '&api_key=dc6zaTOxFJmzC';
	$http.get(url)
			.then(function (response) {
				var data = response.data.data;
				// only need to return the number of gifs which can be divided by 4
				if (data.length / 4 >= 1 && data.length % 4 !== 0 ) {
					for (var counter = 0; counter < (data.length % 4); counter ++) {
						data.pop();
					}
				}
				$scope.gifs = data;
				function getMinHeight() {
					// find the minimum height of a gif to set height for the rest
					if (data.length > 0) {
						$scope.minHeight = $scope.gifs.sort(function (a,b) {
							return Number(a.images.downsized.height) - Number(b.images.downsized.height);
						})[0].images.downsized.height;
						if ($scope.minHeight == 0) {
							$scope.minHeight = "100 px";
						} else {
							$scope.minHeight = $scope.minHeight + "px";
						}
					}
				}
				getMinHeight();
			}, function (error) {
				console.log(error);
			}
		);

	$scope.searchKeyword = function () {
		keyword = $scope.keyword;
		$scope.savedKeyword = keyword;
		url = 'https://api.giphy.com/v1/gifs/search?q=' + keyword + '&api_key=dc6zaTOxFJmzC';
		console.log(url);

		$http.get(url)
			.then(function (response) {
				$scope.keyword = '';
				$scope.searched = true;
				var data = response.data.data;
				// only need to return the number of gifs which can be divided by 4
				if (data.length / 4 >= 1 && data.length % 4 !== 0 ) {
					for (var counter = 0; counter < (data.length % 4); counter ++) {
						data.pop();
					}
				}
				$scope.gifs = data;
				getMinHeight();
			}, function (error) {
				console.log(error);
			}
		);
	};

	$scope.saveGif = function (gif) {
		gif.favorited = true;
		timeStamp = new Date();
		timeStamp = timeStamp.toLocaleDateString();
		var gifData = {
			keyword: keyword,
			url: gif.images.downsized.url,
			imported: timeStamp,
			height: Number(gif.images.downsized.height)
		};
		Gif.save(gifData, function (data) {
			console.log("success");
		}, function (error) {
			console.log(error);
		});
	};
}]);

app.controller('FavoritesCtrl',['$scope', '$http', function ($scope, $http) {
	$scope.favorites = [];
	$http.get('/api/gifs')
	 .then(function (response) {
	 	$scope.favorites = response.data.results;
	 	if (response.data.results.length > 0) {
			$scope.minHeight = $scope.favorites.sort(function (a,b) {
				return a.height - b.height;
			})[0].height + 'px';
		}
	 }, function (error) {
	 	console.log(error);
	 });
}]);