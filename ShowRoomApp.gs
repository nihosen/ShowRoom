var cache = CacheService.getScriptCache();
var json_name = "ShowRoomApp.json";
var settings = readJson(json_name);

function openJsonFile(){
  var json_file_id = cache.get('json_file_id');
  if(json_file_id) { 
    return DriveApp.getFileById(json_file_id); 
  }
  else {
    var json_file_iterator=DriveApp.getRootFolder().getFilesByName(json_name);
    var json_file;
    if(json_file_iterator.hasNext()) {
      json_file = json_file_iterator.next();
    } else {
      json_file = DriveApp.createFile(json_name, '', 'application/json');
    }
    cache.put('json_file_id', json_file.getId());
    return json_file;
  }
};

function readJson() {
  var json_file = openJsonFile(); // File Object
  var json_string = json_file.getBlob().getDataAsString(); // String
  if (!json_string) return {};
  var json = JSON.parse(json_string);
  return json;
}

function writeJson() {
  var json_string = JSON.stringify(settings); // String
  var json_file = openJsonFile(json_name); // File Object
  json_file.setContent(json_string);
}

/**
 * @param {Spreadsheet}
 * @param {String} sheetname
 * @return {Sheet}
 */
function openSheet(spreadsheet, sheet_name) {
  var sheet = spreadsheet.getSheetByName(sheet_name);
  if (sheet == null) {
    sheet = spreadsheet.insertSheet(sheet_name);
  }
  return sheet;
}

function getCellDataRange(cell) {
  var sheet = cell.getSheet();
  var data_range = sheet.getDataRange();
  return sheet.getRange(cell.getRow(), cell.getColumn(), data_range.getLastRow(), data_range.getLastColumn());
}

function openSpreadsheet(folder, ss_name, cache_prefix) {
  var ss_object, sheet_raw_data;
  var ss_file_id = cache.get(cache_prefix + ss_name);
  if (ss_file_id) {
    ss_object = SpreadsheetApp.openById(ss_file_id);
  } else {
    if(folder.getFilesByName(ss_name).hasNext()) {
      ss_object = SpreadsheetApp.open(folder.getFilesByName(ss_name).next());
      ss_file_id = ss_object.getId();
    } else {
      // 新規作成と指定フォルダへの移動(移動先にaddfileし、ルートフォルダから削除)
      ss_object = SpreadsheetApp.create(ss_name); // {Spreadsheet}
      ss_object.getActiveSheet().setName('rawdata');
      ss_file_id = ss_object.getId(); // {String} - unique id for the spreadsheet
      var ss_file_object = DriveApp.getFileById(ss_file_id); // {File} - the file object
      folder.addFile(ss_file_object);
      DriveApp.getRootFolder().removeFile(ss_file_object);
    }
    cache.put(cache_prefix + ss_name, ss_file_id);
  }
  return ss_object;
}

function getRoomProfilesByRoomIds(room_ids) {
  var profile_urls = room_ids.map(function(room_id){
    return { "url": "https://www.showroom-live.com/api/room/profile?room_id=" + room_id };
  });
  var profile_contents = UrlFetchApp.fetchAll(profile_urls).map(function(item){
    var profile_json = JSON.parse(item.getContentText());
    return {
      "room_id": profile_json["room_id"],
      "room_name": profile_json["room_name"],
      "room_url_key": profile_json["room_url_key"],
      "follower_num": profile_json["follower_num"],
      "room_level": profile_json["room_level"],
      "view_num": profile_json["view_num"],
      "live_started": profile_json["live_id"] > 0 ? profile_json["current_live_started_at"] : null,
      "event_name": profile_json["event"] !== null ? profile_json["event"]["url"].split('/').slice(-1)[0] : null,
    };
  });
  return profile_contents;
}

function getRoomSupportersByRoomIds(room_ids) {
  var supporters_urls = room_ids.map(function(room_id){
    return { "url": "https://www.showroom-live.com/room/event?room_id=" + room_id };
  });
  var supporters_contents = UrlFetchApp.fetchAll(supporters_urls).map(function(item){
    var supporters_html = item.getContentText();
    if(!supporters_html.match(/<section id="js-genre-section-7/)) { 
      var room_id = supporters_html.match(/room_id: (\d+),/)[1];
      return { 
        "room_id": room_id, 
        "event_points": null,
        "supporters": new Supporters({
          "supporters": [],
          "room_id": room_id,
        }),
      }; 
    }
    var bodyHtml = "<!DOCTYPE html><html><body>" 
    + supporters_html.replace(/[\s\S]*?<section id="js-genre-section-7/, '<section id="js-genre-section-7')
    .replace(/<\/section>[\s\S]*?<\/script>/, '<\/section>') 
    + "</body></html>";
    var docRoot = XmlService.parse(Xml.parse(bodyHtml, true).html.body.toXmlString()).getRootElement();
    var supporter_names = getElementsByClassName_(docRoot, "pl-b2").map(function(value){ 
      return value.getValue(); 
    });
    var supporter_points = getElementsByClassName_(docRoot, "ta-r").map(function(value){ 
      return parseInt(value.getValue().replace(/[\D]+/g,'')); 
    });
    var room_id = supporters_html.match(/room_id: (\d+),/)[1]; 
    
    // レベルイベントだと合計ポイントは /room/event からは取れないので null で逃げて Room コンストラクタに任せる
    var event_points = supporters_html.match(/現在の合計ポイント：(\d+)pt/) ? supporters_html.match(/現在の合計ポイント：(\d+)pt/)[1] : null;
    
    supporter_points.shift();
    var supporters = supporter_names.map(function(name, index) {
      return new Supporter({
        "name": name, 
        "room_id": room_id,
        "point": parseInt(supporter_points[index]),
        "rank": index+1,
      });
    });
    return {
      "room_id": room_id,
      "event_points": event_points,
      "supporters": new Supporters({
        "supporters": supporters,
        "room_id": room_id,
      }),
    };
  });
  return supporters_contents;
}
/**
 * ShowRoomApp.openSpreadsheetByRoomId - スプレッドシートの初期化とデータ挿入
 * @param {Folder} folder
 * @param {String} eventName
 * @return {Spreadsheet}
 */
function openSpreadsheetByRoomIds(folder, room_ids, ss_name) {
  var ss_object = openSpreadsheet(folder, ss_name, 'sheet_rooms_');
  var columnOfValues = (function(name) { return rawDataHeader[0].indexOf(name)+1; });
  var charCodeOffset = (function(base, offset){ return String.fromCharCode(base.charCodeAt(0) + offset); });
  var collected_date = new Date();

  var header_rawdata = [[
    'Date',
    'RoomId', 
    'RoomName', 
    'RoomUrlKey', 
    'FollowerNum',
    'RoomLevel',
    'ViewNum',
    'LiveStarted',
    'LiveGiftPoints',
    'EventName',
    'TotalPoints',
    'RankedSupportersNum',
    'PointsOf1stRankedSupporter',
    'PointsOfLowestRankedSupporter',
    'TotalPointsOfRankedSupporters'
  ]];
  var sheet_rawdata = openSheet(ss_object, 'rawdata');
  var range_rawdata = sheet_rawdata.getRange('A:' + charCodeOffset('A', header_rawdata[0].length-1));
  if(!range_rawdata.getValue()) { sheet_rawdata.getRange(1, 1, 1, header_rawdata[0].length).setValues(header_rawdata); }

  var profile_contents = getRoomProfilesByRoomIds(room_ids);
  var supporters_contents = getRoomSupportersByRoomIds(room_ids);
  Logger.log(supporters_contents);

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

  // ルーム情報を取得
  var sheetvalues = rooms.map(function(room) {
    var supporters = room.getSupporters();
    return [
      room.getCollectedDate(), // Date
      room.getId(), // RoomId
      room.getName(), // RoomName
      room.getUrlKey(), // RoomUrlKey
      room.getFollowerNum(), // FollowerNum
      room.getLevel(), // RoomLevel
      room.getViewNum(), // ViewNum
      room.getLiveStartedDate(), // LiveStarted
      room.getLiveGiftPoints(), // LiveGiftPoints
      room.getEventName(), // EventName
      room.getEventPoints(), // TotalPoints
      supporters.getNum(), // RankedSupportersNum
      supporters.getPointOfRank(1), // PointsOf1stRankedSupporter
      supporters.getPointOfRank(supporters.getNum()), // PointsOfLowestRankedSupporter
      supporters.getPointOfAllRanks(), // TotalPointsOfRankedSupporters
    ];
  });
  
  // データ入力
  if (sheetvalues.length > 0) {
    sheet_rawdata.getRange(sheet_rawdata.getDataRange().getLastRow()+1, 1, sheetvalues.length, sheetvalues[0].length).setValues(sheetvalues);
  }  
  return ss_object;
}

/**
 * ShowRoomApp.openSpreadsheetByEventName - スプレッドシートの初期化とデータ挿入
 * @param {Folder} folder
 * @param {String} eventName
 * @return {Spreadsheet}
 */
function openSpreadsheetByEventName(folder, eventName) {
  var event = new Event(eventName);
  try{
    if(event.getStartDate().getTime() > event.getCollectedDate().getTime() || event.getEndDate().getTime() < event.getCollectedDate().getTime()) {
      throw new Error('イベント期間外です');
    }
  }catch(e){
  }
  var ssObject = openSpreadsheet(folder, eventName, 'sheet_event_');

  // rawdataシートのヘッダ行入力
  var columnOfValues = (function(name) { return rawDataHeader[0].indexOf(name)+1; });
  var charCodeOffset = (function(base, offset){ return String.fromCharCode(base.charCodeAt(0) + offset); });
  var rawDataHeader = [[
    'Date',
    'RoomId', 
    'RoomName', 
    'RoomUrlKey', 
    'FollowerNum',
    'RoomLevel',
    'ViewNum',
    'LiveStarted',
    'LiveGiftPoints',
    'EventName',
    'TotalPoints',
    'RankedSupportersNum',
    'PointsOf1stRankedSupporter',
    'PointsOfLowestRankedSupporter',
    'TotalPointsOfRankedSupporters'
  ]];
  var sheetRawData = openSheet(ssObject, 'rawdata');
  var sheetTotalPoints = openSheet(ssObject, 'TotalPoints');
  var pivotTotalPoints;
  
  // TotalPoints ピボットテーブルの作成
  var rawDataRange = sheetRawData.getRange('A:' + charCodeOffset('A', rawDataHeader[0].length-1));
  if(!rawDataRange.getValue()) { sheetRawData.getRange(1, 1, 1, rawDataHeader[0].length).setValues(rawDataHeader); }
  if(sheetTotalPoints.getPivotTables().length > 0){ pivotTotalPoints = sheetTotalPoints.getPivotTables()[0]; }
  else {
    pivotTotalPoints = sheetTotalPoints.getRange('A21').createPivotTable(rawDataRange);
    pivotTotalPoints.addRowGroup(columnOfValues('Date')).showTotals(false);
    pivotTotalPoints.addColumnGroup(columnOfValues('RoomUrlKey')).showTotals(false);
    
    // 現状 bool型のフィルタは未対応らしい
    // var filterNotEmpty = SpreadsheetApp.newFilterCriteria().whenCellNotEmpty().build(); 
    // pivotTotalPoints.addFilter(columnOf('RoomUrlKey'), filterNotEmpty);
    pivotTotalPoints.addPivotValue(columnOfValues('TotalPoints'), SpreadsheetApp.PivotTableSummarizeFunction.MAX);
  }
  // ルーム情報を取得
  var sheetvalues = event.getRooms().map(function(room) {
    var supporters = room.getSupporters();
    return [
      room.getCollectedDate(), // Date
      room.getId(), // RoomId
      room.getName(), // RoomName
      room.getUrlKey(), // RoomUrlKey
      room.getFollowerNum(), // FollowerNum
      room.getLevel(), // RoomLevel
      room.getViewNum(), // ViewNum
      room.getLiveStartedDate(), // LiveStarted
      room.getLiveGiftPoints(), // LiveGiftPoints
      room.getEventName(), // EventName
      room.getEventPoints(), // TotalPoints
      supporters.getNum(), // RankedSupportersNum
      supporters.getPointOfRank(1), // PointsOf1stRankedSupporter
      supporters.getPointOfRank(supporters.getNum()), // PointsOfLowestRankedSupporter
      supporters.getPointOfAllRanks(), // TotalPointsOfRankedSupporters
    ];
  });

  // データ入力
  if (sheetvalues.length > 0) {
    sheetRawData.getRange(sheetRawData.getDataRange().getLastRow()+1, 1, sheetvalues.length, sheetvalues[0].length).setValues(sheetvalues);
  }

  var pivotTableRange = getCellDataRange(sheetTotalPoints.getRange('A22'));
  
  // イベント獲得ポイントグラフを作成・更新する
  if (sheetTotalPoints.getCharts().length > 0) {
    var chartTotalPoints = sheetTotalPoints.getCharts()[0];
    var oldRange = chartTotalPoints.getRanges()[0];
    chartTotalPoints = chartTotalPoints.modify().removeRange(oldRange).addRange(pivotTableRange)
    .setOption('title', event.getName() + ' 獲得ポイント推移 (' + Utilities.formatDate(event.collected_date, 'Asia/Tokyo', 'MM/dd HH:mm' ) +'現在)')
    .build();
    sheetTotalPoints.updateChart(chartTotalPoints);
  }
  else {
    var chartTotalPoints = sheetTotalPoints.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(pivotTableRange)
    .setNumHeaders(1)
    .setOption('title', event.getName() + ' 獲得ポイント推移 (' + Utilities.formatDate(event.collected_date, 'Asia/Tokyo', 'MM/dd HH:mm' ) +'現在)')
    .setOption('legend', {position: 'bottom'})
    .setPosition(1, 1, 0, 0)
    .build();
    sheetTotalPoints.insertChart(chartTotalPoints);
  }
  
  return ssObject;
}

function htmlDocToBodyElement_(contentText, element, attribute) {
  return XmlService.parse(Xml.parse(htmlContent, true).html.body.toXmlString()).getRootElement();
}

function getElementById_(element, idToFind) {  
  var descendants = element.getDescendants();  
  for(i in descendants) {
    var elt = descendants[i].asElement();
    if( elt !=null) {
      var id = elt.getAttribute('id');
      if( id !=null && id.getValue()== idToFind) return elt;    
    }
  }
}

function getElementsByClassName_(element, classToFind) {  
  var data = [];
  var descendants = element.getDescendants();
  descendants.push(element);  
  for(i in descendants) {
    var elt = descendants[i].asElement();
    if(elt != null) {
      var classes = elt.getAttribute('class');
      if(classes != null) {
        classes = classes.getValue();
        if(classes == classToFind) data.push(elt);
        else {
          classes = classes.split(' ');
          for(j in classes) {
            if(classes[j] == classToFind) {
              data.push(elt);
              break;
            }
          }
        }
      }
    }
  }
  return data;
}

function getElementsByTagName_(element, tagName) {  
  var data = [];
  var descendants = element.getDescendants();  
  for(i in descendants) {
    var elt = descendants[i].asElement();     
    if( elt !=null && elt.getName()== tagName) data.push(elt);      
  }
  return data;
}
