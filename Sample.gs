function Main(){
    var folderID = ''; // スプレッドシートの保存先フォルダIDを入力
    var eventName = ''; // https://www.showroom-live.com/event/<ここの文字列を入力>
    var event = createEvent(eventName);
    var ssId = setupSRSpreadsheet(eventName, folderID);
    var dt = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    var sheetvalues = [];
    event.Rooms.forEach(function(er){
      var sr = createRoom(er['room_id']);
      var es = sr.getEventSupporters();
      var EventTotalPoints = es.EventTotalPoints;
      var EventSupporterNum = Object.keys(es.Ranking).length;
      var EventPointsOf1stSupporter = es.getPointOfSupporters([1]);
      var EventPointsOf100thSupporter = es.getPointOfSupporters([EventSupporterNum]);
      var EventPointsOfRankedSupporters = es.getPointOfSupporters();
      sheetvalues.push({
        'Date': dt,
        'RoomId': sr.RoomId,
        'RoomUrlKey': sr.RoomUrlKey,
        'FollowerNum': sr.FollowerNum,
        'RoomLevel': sr.RoomLevel,
        'ViewNum': sr.ViewNum,
        'LiveStarted': sr.LiveStarted,
        'TotalPoints': es.EventTotalPoints,
        'RankedSupportersNum': EventSupporterNum,
        'PointsOf1stRankedSupporter': EventPointsOf1stSupporter,
        'PointsOfLowestRankedSupporter': EventPointsOf100thSupporter,
        'TotalPointsOfRankedSupporters': EventPointsOfRankedSupporters,
      });
    });
    SpreadSheetsSQL.open(ssId, 'rawdata').insertRows(sheetvalues);
  }