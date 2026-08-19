var app = angular.module('catsvsdogs', []);
// Derive the app's mount path (e.g. /result/) from <base> so requests work behind a path-prefixing gateway.
var basePath = new URL(document.baseURI).pathname;
var socket = io.connect(undefined, { path: basePath + 'socket.io' });

var bg1 = document.getElementById('background-stats-1');
var bg2 = document.getElementById('background-stats-2');

app.controller('statsCtrl', function($scope, $http){
  $scope.aPercent = 50;
  $scope.bPercent = 50;
  $scope.total = 0;
  $scope.breakdown = [];

  var render = function(data){
    var a = parseInt(data.a || 0);
    var b = parseInt(data.b || 0);

    var percentages = getPercentages(a, b);

    bg1.style.width = percentages.a + "%";
    bg2.style.width = percentages.b + "%";

    $scope.aPercent = percentages.a;
    $scope.bPercent = percentages.b;
    $scope.total = a + b;
    $scope.breakdown = Object.keys(data)
      .filter(function(key) { return data[key] > 0; })
      .map(function(key) { return { vote: key, total: parseInt(data[key]) }; });
  };

  var updateScores = function(){
    socket.on('scores', function (json) {
       var data = JSON.parse(json);
       $scope.$apply(function () {
         render(data);
       });
    });
  };

  var loadInitialResults = function(){
    $http.get(basePath + 'results').then(function(response){
      render(response.data);
    });
  };

  var init = function(){
    document.body.style.opacity=1;
    loadInitialResults();
    updateScores();
  };
  socket.on('message',function(data){
    init();
  });
});

function getPercentages(a, b) {
  var result = {};

  if (a + b > 0) {
    result.a = Math.round(a / (a + b) * 100);
    result.b = 100 - result.a;
  } else {
    result.a = result.b = 50;
  }

  return result;
}