(function(global){
  var Room = (function() {
    function Room(room_id) {
      var jsonData = JSON.parse(UrlFetchApp.fetch('https://www.showroom-live.com/api/room/profile?room_id=' + room_id).getContentText());
      if (jsonData['room_id'] == room_id) {
        this.RoomId = room_id;
        this.RoomUrlKey = jsonData['room_url_key'];
        this.FollowerNum = jsonData['follower_num'];
        this.RoomLevel = jsonData['room_level'];
        this.ViewNum = jsonData['view_num'];
        this.LiveStarted = jsonData['live_id'] > 0 ? jsonData['live_started'] : undefined ;
        this.EventUrl = jsonData['event']['url'];
      } else {
        throw Error('Room is not Found:' + room_id);
      }
    }
    
    Room.prototype.getEventPoint = function() {
      var jsonData = JSON.parse(UrlFetchApp.fetch('https://www.showroom-live.com/api/room/event_and_support?room_id=' + this.RoomId).getContentText());
      return jsonData['event'] == null ? null : jsonData['event']['ranking']['point'];
    };
    Room.prototype.getEventSupporters = function() {
      var page = UrlFetchApp.fetch('https://www.showroom-live.com/room/event?room_id=' + this.RoomId).getContentText();
      var bodyHtml = "<!DOCTYPE html><html><body>" + page.replace(/[\s\S]*?<section id="js-genre-section-7/, '<section id="js-genre-section-7').replace(/<\/section>[\s\S]*?<\/script>/, '<\/section>') + "</body></html>";
      var bodyXml = Xml.parse(bodyHtml, true).html.body.toXmlString();
      var docRoot = XmlService.parse(bodyXml).getRootElement();
      var supporter_names = parser.getElementsByClassName(docRoot, "pl-b2").map(function(value){ return value.getValue(); });
      var supporter_points = parser.getElementsByClassName(docRoot, "ta-r").map(function(value){ return parseInt(value.getValue().replace(/[\D]+/g,'')); });
      var Ranking = [];
      supporter_points.shift();
      supporter_names.forEach(function(item, index){
        Ranking.push({"name": item, "point": parseInt(supporter_points[index]), "rank": index+1});
      });
      var getPoints=(function(rank) {
        var points = 0;
        var ranks = [];
        if (rank === undefined) {
          for(i=1; i<=Object.keys(Ranking).length; i++){
            ranks.push(i);
          }
        } else {
          var toString = Object.prototype.toString;
          function typeOf(obj){ return toString.call(obj).slice(8, -1).toLowerCase(); }
          switch(typeOf(rank)) {
            case 'number':
              ranks.push(rank);
              break;
            case 'array':
              ranks = rank;
              break;
            default:
              throw new Error("Type error: " + toString(rank));
          }
        }
        Ranking.forEach(function(supporter){
          ranks.forEach(function(r){
            if(supporter['rank'] == r){ points += supporter['point']; }
          });
        });
        return points;
      });
      return {"getPoints": getPoints, "Ranking": Ranking};
    };
    
    return Room;
  })();

  global.Room = Room;
})(this);

/**
 * Roomクラスインスタンスの作成
 * @param {Number} room_id ShowRoom のルームID
 * @return {Room} Instance
 */
function createRoom(room_id) {
  return new Room(room_id);
}

/**
 * Roomクラスインスタンスのイベント獲得ポイントを返す
 * @return {Number}
 */
function getEventPoint(Room) {
  throw new Error("it's a mock method for content assist");
}

/**
 * room のイベントの支援者ランキングを取得する
 * @return {Array{name, point, rank }}
 */
function getEventSupporters(Room) {
  throw new Error("it's a mock method for content assist");
}

/**
 * getEventSupporters で取得されたオブジェクト内の Ranking 配列から、
 * @param {Array} rank 配列に含まれる順位の point の合計を返す。省略時は全て。単一数値も指定可。(その順位の点数のみ返す)
 * @return {Number} points
 */
function getPoints(rank) {
  throw new Error("it's a mock method for content assist");
}
