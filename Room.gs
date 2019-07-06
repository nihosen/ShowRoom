(function(global) {
  var Room = (function() {
    Room.name = 'Room';

    function Room(room_id, param) {
      if (room_id == null) { throw new Error("room_id is required."); }
      if (param['room_url_key'] || param['follower_num'] || param['room_level'] || param['view_num'] || param['live_started'] || param['event_name']) {
        this.room_id = room_id;
        this.room_name = param['room_name'];
        this.room_url_key = param['room_url_key'];
        this.follower_num = param['follower_num'];
        this.room_level = param['room_level'];
        this.view_num = param['view_num'];
        this.live_started = param['live_started'];
        this.event_name = param['event_name'];
      } else {
        var profile_url = 'https://www.showroom-live.com/api/room/profile?room_id=';
        var profile_json = JSON.parse(UrlFetchApp.fetch(profile_url + room_id).getContentText());
        if (profile_json['room_id'] == room_id) {
          this.room_id = room_id;
          this.room_name = profile_json['room_name'];
          this.room_url_key = profile_json['room_url_key'];
          this.follower_num = profile_json['follower_num'];
          this.room_level = profile_json['room_level'];
          this.view_num = profile_json['view_num'];
          this.live_started = profile_json['live_id'] > 0 ? profile_json['current_live_started_at'] : null ;
          this.event_name = profile_json['event'] !== null ? profile_json['event']['url'].split('/').slice(-1)[0] : null;
        } else { throw Error('The Room is not Found (room_id:' + room_id + ')'); }
      }
      this.collected_date = param['collected_date'] || new Date();
      this.supporters = param['supporters'] || null;
      
      if (param['event_points']) {
        this.event_points = param['event_points'];
      } else {
        var event_url = 'https://www.showroom-live.com/api/room/event_and_support?room_id=';
        var event_json = JSON.parse(UrlFetchApp.fetch(event_url + this.room_id).getContentText());
        this.event_points = event_json['event'] !== null ? event_json['event']['ranking']['point'] : null;
      }
      
      this.live_gift_points = null;
      var live_gift_points = 0;
      if (this.live_started) {
        var points_urls = [
          {'url': 'https://www.showroom-live.com/api/live/gift_log?room_id=' + room_id }, 
          {'url': 'https://www.showroom-live.com/api/live/gift_list?room_id=' + room_id }
        ];
         
        var points_contents = {};
        UrlFetchApp.fetchAll(points_urls).forEach(function(item){
          var json = JSON.parse(item.getContentText());
          if(json['normal']) {
            points_contents['gift_list'] = json['normal'];
          } else if (json['gift_log']) {
            points_contents['gift_log'] = json['gift_log'];
          }
        });
        var getPointFromGiftId = (function(item){
          return points_contents['gift_list'].filter(function(gift){
            return gift['gift_id'] == item;
          })[0]['point'];
        });
        points_contents['gift_log'].forEach(function(item){
          var this_point = parseInt(getPointFromGiftId(item['gift_id'])) * parseInt(item['num']);
          live_gift_points += this_point;
        });
        this.live_gift_points = live_gift_points;
      }
    }

    Room.prototype.getSupporters = (function() {
      if(this.supporters) { return this.supporters; } else {
        var base_url = 'https://www.showroom-live.com/room/event?room_id=';
        var page = UrlFetchApp.fetch(base_url + this.room_id).getContentText();
        
        // 貢献度 Ranking のため、貢献者名 .pl-b2 クラス、得点 .ta-r クラスをそれぞれ配列に取得
        var bodyHtml = "<!DOCTYPE html><html><body>" 
        + page.replace(/[\s\S]*?<section id="js-genre-section-7/, '<section id="js-genre-section-7')
        .replace(/<\/section>[\s\S]*?<\/script>/, '<\/section>') 
        + "</body></html>";
        var docRoot = XmlService.parse(Xml.parse(bodyHtml, true).html.body.toXmlString()).getRootElement();
        var supporter_names = getElementsByClassName_(docRoot, "pl-b2").map(function(value){ 
          return value.getValue(); 
        });
        var supporter_points = getElementsByClassName_(docRoot, "ta-r").map(function(value){ 
          return parseInt(value.getValue().replace(/[\D]+/g,'')); 
        });
        
        supporter_points.shift();
        var supporters = supporter_names.map(function(name, index) {
          return new Supporter({
            'name': name, 
            'room_id': this.room_id, 
            'event_name': this.event_name, 
            'point': parseInt(supporter_points[index]),
            'rank': index+1,
            'collected_date': this.collected_date,
          });
        });
        this.supporters = new Supporters({
          'supporters': supporters,
          'room_id': this.room_id,
          'event_name': this.event_name,
        });
        return this.supporters;
      }
    });
    
    Room.prototype.getId = (function() { return this.room_id; });
    Room.prototype.getName = (function() { return this.room_name; });
    Room.prototype.getUrlKey = (function() { return this.room_url_key; });
    Room.prototype.getFollowerNum = (function() { return this.follower_num; });
    Room.prototype.getLevel = (function() { return this.room_level; });
    Room.prototype.getViewNum = (function() { return this.view_num; });
    Room.prototype.getLiveStartedDate = (function() { return this.live_started; });
    Room.prototype.getLiveGiftPoints = (function() { return this.live_gift_points; });
    Room.prototype.getEventName = (function() { return this.event_name; });
    Room.prototype.getEventPoints = (function() { return this.event_points; });
    Room.prototype.getCollectedDate = (function() { return this.collected_date; });

    return Room;
  })();
  global.Room = Room;
})(this);
