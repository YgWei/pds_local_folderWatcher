# 部署文件

## 配置

- .env

      	```
      	APP_NAME=

      	LOG_FILENAME=
      	LOG_DIRECTORY=
      	LOG_LEVEL=

      	# PDS
      	PDS_PORTOCOL=
      	PDS_URL=
      	PDS_PORT=
      	PDS_IMPOSITION_API=
      	PDS_TRANSFORM_API
      	PDS_PRINT_API=
      	PDS_USER=
      	PDS_PASSWD=
      	PDS_LOGIN_API=

      	# Request count(parallel request))
      	PDS_IMPOSITION_COUNT=
      	PDS_TRANSFORM_COUNT=
      	PDS_PRINT_COUNT=

      	# Break List
      	BREAK_LIST_PRODUCT_NAME=add a list of products name that won't continue to the next process.
        example:
        if we have zmbd as our BREAK_LIST_PRODUCT_NAME and an .xml input file comes in with a zmbd as its product name, that mean we won't continue to the next process which is imposition.
      	```

- config/watch.json  
   目錄監控的參數。檔案被識別為可使用必須達成以下條件：1. 檔案被新增至目錄。2. 檔案一定時間內容量未更動(避免寫入中被使用)。
  ```
  {
    # 是否使用polling的方法監控目錄，預設為true。false只有在mac時有用，會調用mac專有的庫
    "usePolling": {true|false},
    # 監控間隔，預設為100ms
    "interval": 1000,
    # binary類型檔案的監控間隔，預設為300ms
    "binaryInterval": 1000,
    # 多久size未變動才被視為可使用，單位為ms。預設5000
    "stabilityThreshold": 3000,
    # 對檔案size檢查的間隔，單位為ms。預設1000
    "pollInterval": 1000,
    # 檢查目錄深度，一般而言不動
    "depth": 0
  }
  ```

## 映射目錄

- /home/node/app/logs : 日誌存放目錄
- /home/node/app/pdfSource : 原始 PDF 存放目錄
- /home/node/app/input : 落版請求的監控目錄
- /home/node/app/inputError : 落版請求錯誤目錄
- /home/node/app/inputProcessed : 落版請求處理歸檔目錄。同時為 PDS 的輸入目錄
- /home/node/app/imposition : 落版完成的 PDF 的存放目錄。會觸發 PDF2PS
- /home/node/app/transform : PDF2PS 完成後的 PS 放置目錄
- /home/node/app/print : 打印請求的監控目錄
- /home/node/app/printError : 打印請求錯誤目錄
- /home/node/app/printProcessed : 打印請求處理歸檔目錄
- /home/node/app/backgroundPdf : background PDF 的 放置目錄.
- /home/node/app/impositionPs : PS 放置目錄， PS完成後，XML在input目錄就會被刪除

# 輸入的 XML 格式

1. 落版範例  
   輸入為一份 acc(伴隨文件) + pdf。底下是 acc 的格式

   ```
   <?xml version="1.0" encoding="UTF-8"?>

   <printinfo>
     <company>zm</company>
     <type>1</type>
     <printMode>booklet_SRA3</printMode>
     <businesscode>ZA00000029</businesscode>
     <machineType>ICanon</machineType>
     <pdfName>ZA00000029WL001C2019090937.pdf</pdfName>
     <renderType>IM</renderType>
     <insurance>zmbd</insurance>
     <barcode>fe4b645114bab696968d0166ec143b10</barcode>
     <paperTray>
       <row>
         <name>A3C</name>
         <startPage>1</startPage>
         <endPage>45</endPage>
       </row>
     </paperTray>
   </printinfo>
   ```

2. 打印範例  
   輸入為一份 acc，會對 PDS 發送紙槽調度的請求。與落版的伴隨文件差異在 printinfo.paperTray.row.paperType 的有無

   ```
   <?xml version="1.0" encoding="UTF-8"?>

   <printinfo>
     <company>zm</company>
     <type>1</type>
     <printMode>booklet_SRA3</printMode>
     <businesscode>ZA00000029</businesscode>
     <machineType>ICanon</machineType>
     <pdfName>ZA00000029WL001C2019090937.pdf</pdfName>
     <renderType>IM</renderType>
     <insurance>zmbd</insurance>
     <barcode>fe4b645114bab696968d0166ec143b10</barcode>
     <paperTray>
       <row>
         <name>A3C</name>
         <startPage>1</startPage>
         <endPage>45</endPage>
         <paperType>tray1</paperType>
       </row>
     </paperTray>
   </printinfo>
   ```

# 產生的伴隨文件格式

- 備註：當 mode = normal 時，materialName 需做 A3C -> A4BW 的轉換

```
{
	"insurance": ${printinfo.insurance},
	"company": ${printinfo.company},
	"renderType": ${printinfo.renderType},
	"cover": ${printinfo.type == "1" ? true : false},
	"printMode": ${printMode},
	"barcode": ${printinfo.barcode},
	"materials": [
		{
			"materialName": ${printinfo.paperTray.name},
			"startPage": ${printinfo.paperTray.startPage},
			"endPage": ${printinfo.paperTray.endPage}
		}
	],
	"mappings": [ // 該欄位僅在打印請求時存在，落版是沒有的。
		{
			"materialName": ${printinfo.paperTray.name},
			"printerName": ${printinfo.machineType},
			"tray": ${printinfo.paperTray.paperType}
		}
	]
}
```
