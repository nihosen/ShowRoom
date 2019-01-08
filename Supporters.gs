(function(global){
  var Supporters = (function() {
    Supporters.name = 'Supporters';
    function Supporters(supporters) {
      this.room_id = supporters['room_id'];
      this.event_name = supporters['event_name'];
      this.supporters = supporters['supporters'];
    }

    Supporters.prototype.getPointOfRanks = (function(ranks) {
      var points = 0;
      var supporters = this.supporters;
      supporters.forEach(function(supporter){
        ranks.forEach(function(rank){
          if(supporter.getRank() == rank){ points += supporter.getPoint() };
        });
      });
      return points;
    });
    Supporters.prototype.getPointOfRank = (function(rank) {
      var ranks = [rank];
      return this.getPointOfRanks([ranks]);
    });
    Supporters.prototype.getPointOfAllRanks = (function() {
      var points = 0, ranks = [];
      for(i=1; i<=Object.keys(this.supporters).length; i++){
        ranks.push(i);
      }
      return this.getPointOfRanks(ranks);
    });
    Supporters.prototype.getNum = (function() {
      return Object.keys(this.supporters).length;
    });
    
    return Supporters;
  })();
  global.Supporters = Supporters;
})(this);
