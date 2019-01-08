var jsonName = "ShowRoomApp.json";
var settings = readJson(jsonName);


function getFile(fileName){
  if(DriveApp.getRootFolder().getFilesByName(fileName).hasNext()) {
    return DriveApp.getRootFolder().getFilesByName(fileName).next();
  } else {
    return DriveApp.createFile(fileName, '', 'application/json');
  }
}

function readJson() {
  var file = getFile(jsonName);
  var content = file.getBlob().getDataAsString();
  if (!content) return {};
  var json = JSON.parse(content);
  return json;
}

function writeJson() {
  var content = JSON.stringify(settings);
  var file = getFile(jsonName);
  file.setContent(content);
}

/**
 * ShowRoomApp.openEventByName - イベント名からEventクラスインスタンスを作成
 * @param {string} event_name イベントURL末尾にあるイベント名
 * @return {Event} Event クラスインスタンス
 */
function openEventByName(event_name) { 
  return new Event(event_name);
}

/**
 * ShowRoomApp.openRoomById - 指定された room_id より Room クラスインスタンスを生成
 * @param {number} room_id ShowRoom のルームID
 * @return {Room} Room クラスインスタンス
 */
function openRoomById(room_id) { 
  return new Room(room_id);
}

/**
 * @param {Spreadsheet}
 * @param {String} sheetname
 * @return {Sheet}
 */
function openSheet(spreadsheet, sheetname) {
  var sheet = spreadsheet.getSheetByName(sheetname);
  if (sheet == null) {
    sheet = spreadsheet.insertSheet(sheetname);
  }
  return sheet;
}

function getDataRange(cell) {
  var sheet = cell.getSheet();
  var dataRange = sheet.getDataRange();
  return sheet.getRange(cell.getRow(), cell.getColumn(), dataRange.getLastRow(), dataRange.getLastColumn());
}

/**
 * ShowRoomApp.formatDataRange - 
 * @param {Array} sheetvalues
 * @param 
function formatDataRange(sheetvalues, rawDataHeader) {
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
  var ssObject, sheetTotalPoints;
  
  // Spreadsheetオブジェクトの取得(新規作成)
  if(folder.getFilesByName(eventName).hasNext()) {
    ssObject = SpreadsheetApp.open(folder.getFilesByName(eventName).next());
  } else {
    // 新規作成と指定フォルダへの移動(移動先にaddfileし、ルートフォルダから削除)
    ssObject = SpreadsheetApp.create(eventName); // {Spreadsheet}
    ssObject.getActiveSheet().setName('rawdata');
    var fileId = ssObject.getId(); // {String} - unique id for the spreadsheet
    var ssFileObject = DriveApp.getFileById(fileId); // {File} - the file object
    folder.addFile(ssFileObject);
    DriveApp.getRootFolder().removeFile(ssFileObject);
  }

  // rawdataシートのヘッダ行入力
  var rawDataHeader = [[
    'Date',
    'RoomId', 
    'RoomUrlKey', 
    'FollowerNum',
    'RoomLevel',
    'ViewNum',
    'LiveStarted',
    'TotalPoints',
    'RankedSupportersNum',
    'PointsOf1stRankedSupporter',
    'PointsOfLowestRankedSupporter',
    'TotalPointsOfRankedSupporters'
  ]];
  var columnOfValues = (function(name) { return rawDataHeader[0].indexOf(name)+1; });
  var charCodeOffset = (function(base, offset){ return String.fromCharCode(base.charCodeAt(0) + offset); });
  var sheetRawData = openSheet(ssObject, 'rawdata');
  var sheetTotalPoints = openSheet(ssObject, 'TotalPoints');
  var rawDataHeaderPlace = sheetRawData.getRange(1, 1, rawDataHeader.length, rawDataHeader[0].length);
  if(!rawDataHeaderPlace.getValue()) { rawDataHeaderPlace.setValues(rawDataHeader); }
  
  // TotalPoints ピボットテーブルの作成
  var rawDataRange = sheetRawData.getRange('A:'+charCodeOffset('A', rawDataHeader[0].length-1));
  var pivotTotalPoints;
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
      room.getUrlKey(), // RoomUrlKey
      room.getFollowerNum(), // FollowerNum
      room.getLevel(), // RoomLevel
      room.getViewNum(), // ViewNum
      room.getLiveStartedDate(), // LiveStarted
      room.getEventPoints(), // TotalPoints
      supporters.getNum(), // RankedSupportersNum
      supporters.getPointOfRank(1), // PointsOf1stRankedSupporter
      supporters.getPointOfRank(supporters.getNum()), // PointsOfLowestRankedSupporter
      supporters.getPointOfAllRanks(), // TotalPointsOfRankedSupporters
    ];
  });

  // データ入力
  sheetRawData.getRange(sheetRawData.getDataRange().getLastRow()+1, 1, sheetvalues.length, sheetvalues[0].length).setValues(sheetvalues);

  var pivotTableRange = getDataRange(sheetTotalPoints.getRange('A22'));
  
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
