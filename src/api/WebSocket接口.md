WebSocket接口：wss://www.zjshuzhi.cn:8090/api/chat/websocket
1、连接时查询参数传递token；
2、客户端需在60秒内主动发送心跳消息，消息格式
{
  "Type": "Ping"
}
服务器返回
{
  "Type": "Pong"
}
3、服务器返回消息格式：
{
    "Id": null,
    "Type": "Pong",
    "SenderId": "",
    "SenderName": "",
    "SenderRealName": "",
    "ReceiverId": null,
    "Message": "",
    "CreateTime": "0001-01-01T00:00:00",
    "BizType": "",
    "BizId": "",
    "IsRead": false,
    "ReadFromUserId": null,
    "ReadMsgIds": null
}
4、客户端标记私聊消息为已读，传入msgIds：仅标记指定ID消息为已读（单条/多条），不传msgIds：批量标记当前用户与指定发送人所有未读私聊；标记单条消息已读，若原消息中有"BizType""BizId"，也一起带上；
{
  "Type": "Read",
  "ReadFromUserId": "6d37d6ba-4b78-47f6-9844-f3bafe26f405",
  "ReadMsgIds": ["A242C641-DD5D-45E1-B4C7-F97BF50453D6"]
}
5、正常聊天消息，ReceiverId不为空：向指定人发消息，ReceiverId为空：向所有在线人发消息；
{
  "Type": "Message",
  "ReceiverId": "6d37d6ba-4b78-47f6-9844-f3bafe26f405",
  "Message": "我是abc,发给test,4"
}
6、所有消息均为文本消息；
7、服务器向客户端发送Type = "report_submit_reminder"的消息是日报未提交提醒消息；
{
    "Id": "79c89ce08ffd491db59785f622dfead7",
    "Type": "report_submit_reminder",
    "SenderId": "7d226aab906e4349a135c1b3c03d53d4",
    "SenderName": "dengxinlongceshi",
    "SenderRealName": "邓鑫龙",
    "ReceiverId": "7d226aab906e4349a135c1b3c03d53d4",
    "Message": "您2026-07-07的日报未提交，请尽快提交，谢谢！",
    "CreateTime": "2026-07-07T15:47:12.1986359+08:00",
    "BizType": "notification",
    "BizId": "7f6735a8ff9a43afae70b461a164d941",
    "IsRead": false,
    "ReadFromUserId": null,
    "ReadMsgIds": null
}
