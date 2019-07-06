(function(global) {
  var Event = (function() {
    Event.name = 'Event';
    function Event(event_name) {
      if (event_name == null) { throw new Error("event_name is required."); }
      
      var JSONdata, tmpHtml, roomlist_page = 1, pagestring = '&p=' + roomlist_page;
      var eventsetting_this = (settings["Event"] && settings["Event"][event_name]) ? settings["Event"].filter(function(item){
        return item["event_name"] === event_name;
      })[0] : {};
      var eventsetting_new = settings["Event"] ? settings["Event"].filter(function(item){
        return item["event_name"] !== event_name;
      }) : [];
      this.event_name = eventsetting_this["event_name"] = event_name;
      var roomssetting = settings["Rooms"];
      if (eventsetting_this["event_id"]) {
        this.event_id = eventsetting_this["event_id"];
        this.start_date = eventsetting_this["start_date"];
        this.end_date = eventsetting_this["end_date"];
        this.image_url = eventsetting_this["image_url"];
        roomlist_page = eventsetting_this["roomlist_page"];
      } else {
        var eventPage = UrlFetchApp.fetch('https://www.showroom-live.com/event/' + this.event_name).getContentText();
        this.event_id = eventsetting_this["event_id"] = eventPage.match(/event_id:\s+(\d+),/)[1];
        
        // イベントページからイベント開始・終了日時、イベントID情報を取得
        var dates = eventPage.match(/<li class="info">([^<]+)<\/li>/)[1];
        this.start_date = eventsetting_this["start_date"] = new Date(dates.split(' - ')[0]);
        this.end_date   = eventsetting_this["end_date"] = new Date(dates.split(' - ')[1]);

        var eventBodyHtml = '<!DOCTYPE html><html><body>' + eventPage
        .replace(/[\s\S]*?(<section class="l-inner clearfix)/, '$1')
        .replace(/(<\/section>)[\s\S]*?/, '$1')
        + '</body></html>';
        var eventDocRoot = XmlService.parse(Xml.parse(eventBodyHtml, true).html.body.toXmlString()).getRootElement();
        this.image_url = eventsetting_this["image_url"] = getElementsByClassName_(eventDocRoot, 'img-main')[0].getAttribute('data-src').getValue();
      }
      var collected_date = new Date();
      this.collected_date = collected_date;

      // ルーム一覧を取得
      do {
        JSONdata = JSON.parse(UrlFetchApp.fetch('https://www.showroom-live.com/event/room_list?event_id=' + this.event_id + pagestring).getContentText());
        pagestring = '&p=' + ++roomlist_page;
        tmpHtml += JSONdata['html'];
      }while(JSONdata['next_page'] !== null);
      this.roomlist_page = eventsetting_this["roomlist_page"] = --roomlist_page;

      var roomListHtml = "<!DOCTYPE html><html><body>" + tmpHtml + "</body></html>";
      var roomListRoot = XmlService.parse(Xml.parse(roomListHtml, true).html.body.toXmlString()).getRootElement();

      var room_ids = eventsetting_this["room_ids"] = getElementsByClassName_(roomListRoot, 'room-ranking-link').map(function(value){
        return value.getAttribute('href').getValue().match(/room_id=(\d+)/)[1]; 
      });
      var profile_contents = getRoomProfilesByRoomIds(room_ids);
      var supporters_contents = getRoomSupportersByRoomIds(room_ids);
      
      var rooms = room_ids.map(function(this_room_id){
        var profile = profile_contents.filter(function(item){
          return item["room_id"] == this_room_id;
        })[0];
        var supporters = supporters_contents.filter(function(item){
          return item["room_id"] == this_room_id;
        })[0];
        var room_param = {
          "room_id": this_room_id,
          "room_name": profile["room_name"],
          "room_url_key": profile["room_url_key"],
          "follower_num": profile["follower_num"],
          "room_level": profile["room_level"],
          "view_num": profile["view_num"],
          "live_started": profile["live_started"],
          "event_name": profile["event_name"],
          "event_points": supporters["event_points"],
          "supporters": supporters["supporters"],
          "collected_date": collected_date,
        };
        var room = new Room(this_room_id, room_param);
        return room;
      });
      this.rooms = rooms;
      
      eventsetting_new.push(eventsetting_this);
      settings["Event"] = eventsetting_new;
      writeJson();
    }
    Event.prototype.getRooms     = (function() { return this.rooms; });
    Event.prototype.getId        = (function() { return this.event_id; });
    Event.prototype.getName      = (function() { return this.event_name; });
    Event.prototype.getStartDate = (function() { return this.start_date; });
    Event.prototype.getEndDate   = (function() { return this.end_date; });
    Event.prototype.getCollectedDate = (function() { return this.collected_date; });
    Event.prototype.getImageUrl = (function() { return this.image_url; });
    
    return Event;
  })();
  global.Event = Event;
})(this);
