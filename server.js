const app = require("express")();
const server = require("http").createServer(app);
var io = require("socket.io")(server);
let auxCode = {
  agentState: "4",
  reasonCode: "",
};

io.sockets.on("connection", function (socket) {
  console.log("Someone just connected!");
  socket.emit("message", "welcome to socket io server");

  socket.on("sim_makeCall", function (message) {
    console.log("Got message: " + JSON.stringify(message));
    socket.emit("ICALLRING", message);
    socket.broadcast.emit("ICALLRING", message);
    socket.broadcast.emit("AGTUPDATED", {
      state: 7,
      reasonCode: "0",
    });
  });

  socket.on("sim_dropCall", function (message) {
    console.log("sim_dropCall: " + message);
    socket.broadcast.emit("ICALLDISC", message);
    socket.broadcast.emit("AGTUPDATED", {
      state: 5,
      reasonCode: "0",
    });
  });

  socket.on("AGTLOGON", function (message, ack) {
    console.log("AGTLOGON: ", message);
    message.responseCode = "0";
    ack(message);
    socket.emit("AGTUPDATED", {
      state: 4,
      reasonCode: "0",
    });
  });

  socket.on("AGTLOGOFF", function (message, ack) {
    console.log("AGTLOGOFF: ", message);
    message.responseCode = "0";
    ack(message);
  });

  socket.on("GETSESSION", function (message, ack) {
    console.log("GETSESSION: ", message);
    message.responseCode = "0";
    message.sessionId = Date.now();
    ack(message);
  });

  // Echo back messages from the client
  socket.on("ANSCALL", function (message) {
    console.log("ANSCALL: ", message);

    setTimeout(function () {
      socket.emit("ICALLTALK", message);
    }, 500);
  });

  socket.on("CONNCLR", function (message) {
    console.log("CONNCLR: ", message);

    setTimeout(function () {
      socket.emit("ICALLDISC", message);
    }, 500);
    socket.emit("AGTUPDATED", {
      state: 5,
      reasonCode: "0",
    });
  });

  socket.on("HOLDCALL", function (message) {
    console.log("HOLDCALL: ", message);

    setTimeout(function () {
      socket.emit("ICALLHLD", message);
    }, 500);
  });

  socket.on("RETRCALL", function (message) {
    console.log("RETRCALL: ", message);

    setTimeout(function () {
      socket.emit("ICALLTALK", message);
    }, 500);
  });
  socket.on("QRYAGTSTATE", function (message) {
    // console.log("QRYAGTSTATE" + JSON.stringify(message));
  });

  socket.on("REQUEST_CHAT_SESSION", (message, ack) => {
    console.log("REQUEST_CHAT_SESSION" + JSON.stringify(message));
    ack({ chatId: socket.id });
  });

  socket.on("UPDATE_CHAT_ROOM_ID", (message, ack) => {
    console.log("UPDATE_CHAT_ROOM_ID(): joining the room:" + message.chatroom);

    socket.join(message.chatroom, () => {
      ack({ responseCode: "0", chatroom: message.chatroom });
    });
  });
  socket.on("REQUEST_AGENT_CHAT", (message, ack) => {
    console.log("REQUEST_AGENT_CHAT" + JSON.stringify(message));

    //generate a new chat ID from the socket object's ID field
    let tempChatId = socket.id;

    //Make the customer join the chatroom
    socket.join(tempChatId, () => {
      let rooms = Object.keys(socket.rooms);
      console.log("REQUEST_AGENT_CHAT room joined " + JSON.stringify(rooms));
    });

    //emit the event to Flair Client
    console.log("emitting NEW_CHAT_REQUEST");
    message.chatId = tempChatId;
    socket.broadcast.emit("NEW_CHAT_REQUEST", message);
    // {
    //   chatId: tempChatId,
    //   interactionHistory: message.interactionHistory,
    //   participant: {
    //     firstName: message.firstName,
    //     lastName: message.lastName,
    //   },
    // }

    ack({ responseCode: "0", chatId: tempChatId });
  });

  //agent sends this event when accept button is clicked
  socket.on("ACCEPT_CHAT_SESSION", (message) => {
    console.log("ACCEPT_CHAT_SESSION" + JSON.stringify(message));
    socket.join(message.chatId, () => {
      let rooms = Object.keys(socket.rooms);
      console.log("joining the room " + JSON.stringify(rooms));
      socket.broadcast.to(message.chatId).emit("CHAT_SESSION_STARTED", {
        chatroom: message.chatId,
      });
    });
  });

  socket.on("USER_TYPING_STARTED", (message) => {
    socket.broadcast.to(message.chatId).emit("USER_TYPING_STARTED", message);
  });

  socket.on("USER_TYPING_STOPPED", (message) => {
    socket.broadcast.to(message.chatId).emit("USER_TYPING_STOPPED", message);
  });

  socket.on("AGENT_TYPING_STARTED", (message) => {
    socket.broadcast.to(message.chatId).emit("AGENT_TYPING_STARTED", message);
  });

  socket.on("AGENT_TYPING_STOPPED", (message) => {
    socket.broadcast.to(message.chatId).emit("AGENT_TYPING_STOPPED", message);
  });

  socket.on("NEW_CHAT_MESSAGE", (payload) => {
    console.log("NEW_CHAT_MESSAGE received. message=" + JSON.stringify(payload));
    console.log("payload room=" + payload.chatroom);
    payload.message.chatId = payload.chatroom;
    socket.broadcast.to(payload.message.chatId).emit("NEW_CHAT_MESSAGE", { message: payload.message });
  });

  socket.on("END_CHAT_SESSION", (message, ack) => {
    console.log("END_CHAT_SESSION" + JSON.stringify(message));
    socket.broadcast.to(message.chatId).emit("CHAT_SESSION_ENDED", {
      chatroom: message.chatId,
    });
    socket.leave(message.chatId);
    ack({ responseCode: "0", responseMessage: "Success" });
  });

  socket.on("MAKECALL", function (message) {
    let call = {
      callId: "",
      ucid: "00001002811579679692",
      callingAddress: message.dialedDigits,
      calledAddress: "3009",
      callType: "3",
      callDirection: "2",
      callState: "98",
      status: "98",
      type: "1",
      multiCallState: "1",
      callStartTime: "1234",
      uui: "",
    };

    call.callId = "" + Math.round(Math.random() * 1000);
    call.ucid = "00001002811579679" + Math.round(Math.random() * 1000);

    console.log("MAKECALL: ", message);
    socket.emit("OUTCALLRING", call);
    setTimeout(function () {
      socket.emit("OUTCALLTALK", call);
    }, 3000);
  });
});

server.listen(process.env.PORT || 7071, () => {
  console.log("socket io server started on port 7071");
});
