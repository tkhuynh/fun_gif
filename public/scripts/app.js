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
	$scope.gifs = [];
	var keyword;
	$scope.searchKeyword = function () {
		keyword = $scope.keyword;
		$scope.savedKeyword = keyword;
		var url = 'http://api.giphy.com/v1/gifs/search?q=' + keyword + '&api_key=dc6zaTOxFJmzC';
		console.log(url);

		$http.get(url)
			.then(function (response) {
				$scope.keyword = '';
				// api return 25 gifs, but only need 24
				response.data.data.pop();
				$scope.gifs = response.data.data;
				// find the minimum height of a gif to set height for the rest
				$scope.minHeight = response.data.data.sort(function (a,b) {
					return Number(a.images.downsized.height) - Number(b.images.downsized.height);
				})[0].images.downsized.height + 'px';
			}, function (error) {
				console.log(error);
			}
		);
	};

	$scope.saveGif = function (gif) {
		gif.favorited = true;

		var gifData = {
			keyword: keyword,
			url: gif.images.downsized.url,
			imported: Date()
		};
		Gif.save(gifData, function (data) {
			console.log("success");
		}, function (error) {
			console.log(error);
		});
	};
}]);