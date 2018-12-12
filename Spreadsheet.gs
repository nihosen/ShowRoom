/**
 * ShowRoomイベントデータ集計スプレッドシートの新規作成及び取得
 * @param {String} fileName スプレッドシートファイル名。通常イベント名を指定。
 * @param {String} folderID 保存先フォルダ
 */
function setupSRSpreadsheet(fileName, folderID){
  var folder = DriveApp.getFolderById(folderID);
  var fileID, ssFile;
  if(!folder.getFilesByName(fileName).hasNext()){
    // 新規作成と指定フォルダへの移動
    fileID = SpreadsheetApp.create(fileName).getId();
    ssFile = DriveApp.getFileById(fileID);
    folder.addFile(ssFile);
    DriveApp.getRootFolder().removeFile(ssFile);
    ssFile = SpreadsheetApp.openById(fileID);

    // rawdataシートのヘッダ行入力
    var values = [[
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
    var sheet = ssFile.getActiveSheet();
    sheet.setName('rawdata');
    sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  }
  fileID = folder.getFilesByName(fileName).next().getId();
  return fileID;
}