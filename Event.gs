(function(global){
  var Event = (function() {
    function Event(event_name) {
      var page = UrlFetchApp.fetch('https://www.showroom-live.com/event/' + event_name).getContentText();
      var event_id = page.match(/event_id:\s+(\d+),/)[1];
      var JSONdata, bodyHtml, page = 1, pagestring, rooms = [];
      do{
        pagestring = '&p=' + page; page ++;
        JSONdata = JSON.parse(UrlFetchApp.fetch('https://www.showroom-live.com/event/room_list?event_id=' + event_id + pagestring).getContentText());
        bodyHtml += JSONdata['html'];
      } while(JSONdata['next_page'] !== null);
      bodyHtml = "<!DOCTYPE html><html><body>" + bodyHtml + "</body></html>";
      var bodyXml = Xml.parse(bodyHtml, true).html.body.toXmlString();
      var docRoot = XmlService.parse(bodyXml).getRootElement();
      var room_ids  = parser.getElementsByClassName(docRoot, 'room-ranking-link').map(function(value){return value.getAttribute('href').getValue().match(/room_id=(\d+)/)[1]; });
      var room_urls = parser.getElementsByClassName(docRoot, 'room-url').filter(function(value){return value.getAttribute('title') != null;}).map(function(value){return value.getAttribute('href').getValue().match(/([\w-]+)/)[1]; });
      var ranks     = parser.getElementsByClassName(docRoot, 'label-ranking').map(function(value){return value.getValue().match(/\s(\d+)\s/)[1]; });
      room_ids.forEach(function(item, index){
        rooms.push({"room_url": room_urls[index], "room_id": item, "rank": ranks[index] });
      });
      Logger.log(rooms);
      this.Rooms = rooms;
    }
    return Event;
  })();

  global.Event = Event;
})(this);

/**
 * Eventクラスインスタンスの作成
 * @param {string} event イベントURLまたはそのURL末尾にあるイベント名
 * @return {Event}
 */
function createEvent(event) {
  return new Event(event.split('/')[event.split('/').length-1]);
}
