(function(global){
  var Room = (function() {
    function Room(room_id) {
      var baseUrl = 'https://www.showroom-live.com/api/room/profile?room_id=';
      var jsonData = JSON.parse(UrlFetchApp.fetch(baseUrl + room_id).getContentText());
      if (jsonData['room_id'] == room_id) {
        this.RoomId = room_id;
        this.RoomUrlKey = jsonData['room_url_key'];
        this.FollowerNum = jsonData['follower_num'];
        this.RoomLevel = jsonData['room_level'];
        this.ViewNum = jsonData['view_num'];
        this.LiveStarted = jsonData['live_id'] > 0 ? jsonData['current_live_started_at'] : null ;
        this.EventUrl = jsonData['event'] !== null ? jsonData['event']['url'] : null;
      } else {
        throw Error('Room is not Found:' + room_id);
      }
    }
    
    Room.prototype.getEventPoint = function() {
      var baseUrl = 'https://www.showroom-live.com/api/room/event_and_support?room_id=';
      var jsonData = JSON.parse(UrlFetchApp.fetch(baseUrl + this.RoomId).getContentText());
      return jsonData['event'] == null ? null : jsonData['event']['ranking']['point'];
    };
    
    Room.prototype.getEventSupporters = function() {
      var baseUrl = 'https://www.showroom-live.com/room/event?room_id=';
      var page = UrlFetchApp.fetch(baseUrl + this.RoomId).getContentText();

      // 貢献度 Ranking のため、貢献者名 .pl-b2 クラス、得点 .ta-r クラスをそれぞれ配列に取得
      var bodyHtml = "<!DOCTYPE html><html><body>" 
                   + page.replace(/[\s\S]*?<section id="js-genre-section-7/, '<section id="js-genre-section-7')
                   .replace(/<\/section>[\s\S]*?<\/script>/, '<\/section>') 
                   + "</body></html>";
      var bodyXml = Xml.parse(bodyHtml, true).html.body.toXmlString();
      var docRoot = XmlService.parse(bodyXml).getRootElement();
      var supporter_names = parser.getElementsByClassName(docRoot, "pl-b2").map(function(value){ 
        return value.getValue(); 
      });
      var supporter_points = parser.getElementsByClassName(docRoot, "ta-r").map(function(value){ 
        return parseInt(value.getValue().replace(/[\D]+/g,'')); 
      });

      // EventTotalPoints 取得のため、gs-genre-section-1 内の .f1-1 クラスを取得 
      bodyHtml = "<!DOCTYPE html><html><body>" 
               + page.replace(/[\s\S]*?<section id="js-genre-section-1/, '<section id="js-genre-section-1')
               .replace(/<\/section>[\s\S]*?<\/script>/, '<\/section>') 
               + "</body></html>";
      bodyXml = Xml.parse(bodyHtml, true).html.body.toXmlString();
      docRoot = XmlService.parse(bodyXml).getRootElement();
      var EventTotalPoints = parser.getElementsByClassName(docRoot, 'fl-l')[0].getValue().replace(/[\D]+/g,'');

      var Ranking = [];
      supporter_points.shift();
      supporter_names.forEach(function(item, index){
        Ranking.push({"name": item, "point": parseInt(supporter_points[index]), "rank": index+1});
      });
      
      // ある範囲の順位の得点を総計して返すメソッド
      var getPointOfSupporters=(function(rank) {
        var points = 0;
        var ranks = [];
        if (rank === undefined) {
          for(i=1; i<=Object.keys(Ranking).length; i++){
            ranks.push(i);
          }
        } else {
          var toString = Object.prototype.toString;
          function typeOf(obj){ return toString.call(obj).slice(8, -1).toLowerCase(); }
          // rank が Number で与えらた場合は配列化する
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

      return {
        "getPointOfSupporters": getPointOfSupporters, 
        "Ranking": Ranking, 
        "EventTotalPoints": EventTotalPoints,
      };
    };

    return Room;
  })();

  global.Room = Room;
})(this);

/**
 * Roomクラスインスタンスの作成
 * @param {number} room_id ShowRoom のルームID
 * @return {Object} Roomクラスインスタンス
 */
function createRoom(room_id) {
  return new Room(room_id);
}

/**
 * Roomクラスインスタンスのイベント獲得ポイントを返す
 * @return {Number} Point イベント獲得ポイント値
 */
function getEventPoint() {
  throw new Error("it's a mock method for content assist");
}

/**
 * room のイベント貢献ランキングを取得する
 * @return {Object[]} {name: String, point: Number, rank: Number}
 */
function getEventSupporters() {
  throw new Error("it's a mock method for content assist");
}

/**
 * getEventSupporters で取得されたオブジェクト内の Ranking 配列から、
 * @param {Array} 得点集計対象の順位の配列
 * @return {Number} points
 */
function getPointOfSupporters(rank) {
  throw new Error("it's a mock method for content assist");
}
