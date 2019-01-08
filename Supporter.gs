(function(global) {
  var Supporter = (function() {
    Supporter.name = 'Supporter';
    function Supporter(supporter) {
      this.name = supporter['name'];
      this.room_id = supporter['room_id'];
      this.event_name = supporter['event_name'] || null;
      this.point = supporter['point'];
      this.rank = supporter['rank'];
    }
  
    Supporter.prototype.getName      = (function() { return this.name; });
    Supporter.prototype.getRoomId    = (function() { return this.room_id; });
    Supporter.prototype.getEventName = (function() { return this.event_name; });
    Supporter.prototype.getPoint     = (function() { return this.point; });
    Supporter.prototype.getRank      = (function() { return this.rank; });
    Supporter.prototype.getCollectedDate = (function() { return this.collected_date; });

    return Supporter;
  })();
  global.Supporter = Supporter;
})(this);
