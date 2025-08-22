const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// 메모리에 방 정보 저장
const rooms = {};

// 사용자별 고유 컬러 팔레트
const userColors = [
  { from: '#2563eb', to: '#4f46e5' },
  { from: '#0891b2', to: '#0d9488' },
  { from: '#059669', to: '#10b981' },
  { from: '#ca8a04', to: '#ea580c' },
  { from: '#dc2626', to: '#ec4899' },
  { from: '#9333ea', to: '#8b5cf6' },
  { from: '#4f46e5', to: '#9333ea' },
  { from: '#ec4899', to: '#f43f5e' },
  { from: '#0d9488', to: '#0891b2' },
  { from: '#ea580c', to: '#dc2626' },
  { from: '#10b981', to: '#059669' },
  { from: '#8b5cf6', to: '#9333ea' }
];

// 사용되지 않은 컬러 가져오기
const getAvailableColor = (usedColors) => {
  const availableColors = userColors.filter(color =>
    !usedColors.some(used => used.from === color.from && used.to === color.to)
  );
  if (availableColors.length === 0) {
    return userColors[Math.floor(Math.random() * userColors.length)];
  }
  return availableColors[Math.floor(Math.random() * availableColors.length)];
};

// 유틸리티 함수 - 현재 시간 반환
const getCurrentTime = () => {
  return new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// 유틸리티 함수 - 방 ID 생성
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// 방장 이양 함수
const transferOwnership = (room) => {
  if (room.participants.length === 0) return null;

  const currentOwner = room.participants.find(p => p.isOwner);

  if (!currentOwner) {
    const sortedParticipants = [...room.participants].sort((a, b) =>
      new Date(a.joinedAt) - new Date(b.joinedAt)
    );

    if (sortedParticipants.length > 0) {
      room.participants.forEach(p => p.isOwner = false);

      const newOwner = room.participants.find(p => p.socketId === sortedParticipants[0].socketId);
      if (newOwner) {
        newOwner.isOwner = true;

        const ownershipMessage = {
          id: Date.now(),
          user: 'System',
          message: `👑 ${newOwner.username}님이 새로운 방장이 되었습니다.`,
          time: getCurrentTime()
        };
        room.messages.push(ownershipMessage);

        console.log(`[${getCurrentTime()}] 방장 이양: ${room.id} - ${newOwner.username} (${newOwner.socketId})`);

        return ownershipMessage;
      }
    }
  }

  return null;
};

// 기본 라우트
app.get('/', (req, res) => {
  res.send('모각코 WebRTC 서버 실행중! 🚀');
});

io.on('connection', (socket) => {
  console.log(`[${getCurrentTime()}] 유저 연결: ${socket.id}`);

  // 방 존재 여부 확인
  socket.on('check-room', (roomCode) => {
    roomCode = roomCode.toUpperCase();

    if (rooms[roomCode]) {
      const room = rooms[roomCode];
      socket.emit('room-info', {
        name: room.name,
        description: room.description,
        hasPassword: !!room.password,
        participants: room.participants.length,
        createdAt: room.createdAt
      });
    } else {
      socket.emit('room-not-found');
    }
  });

  // 방 생성
  socket.on('create-room', ({ name, description, password, creator }) => {
    let roomId;

    do {
      roomId = generateRoomId();
    } while (rooms[roomId]);

    rooms[roomId] = {
      id: roomId,
      name: name,
      description: description || '',
      password: password || '',
      creator: creator,
      participants: [],
      messages: [],
      createdAt: new Date().toISOString()
    };

    console.log(`[${getCurrentTime()}] 방 생성: ${roomId} "${name}" by ${creator}`);

    socket.emit('room-created', {
      roomId,
      roomInfo: {
        name: rooms[roomId].name,
        description: rooms[roomId].description,
        hasPassword: !!rooms[roomId].password,
        participants: 0,
        createdAt: rooms[roomId].createdAt
      }
    });
  });

  // 방 참여
  socket.on('join-room', ({ username, roomCode, password }) => {
    roomCode = roomCode.toUpperCase();

    if (!rooms[roomCode]) {
      socket.emit('join-error', '존재하지 않는 방입니다.');
      return;
    }

    const room = rooms[roomCode];

    if (room.password && room.password !== password) {
      socket.emit('join-error', '비밀번호가 올바르지 않습니다.');
      return;
    }

    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.username = username;

    const usedColors = room.participants.map(p => p.userColor);
    const userColor = getAvailableColor(usedColors);

    const participant = {
      socketId: socket.id,
      username: username,
      isVideoOn: false,
      isAudioOn: false,
      isHeadsetOn: true,
      isOwner: room.participants.length === 0,
      userColor: userColor,
      joinedAt: new Date().toISOString(),
      audioLevel: 0,
      isSpeaking: false,
      lastAudioUpdate: Date.now(),
      // 사용자 상태 정보
      status: 'online',
      statusEmoji: '',
      statusText: '',
      // 강제 제어 상태
      isVideoForcedOff: false,
      isAudioForcedOff: false,
      isHeadsetForcedOff: false,
      // 이전 상태 저장용 필드
      previousVideoState: false,
      previousAudioState: false,
      previousHeadsetState: true
    };

    room.participants.push(participant);

    const joinMessage = {
      id: Date.now(),
      user: 'System',
      message: `${username}님이 입장했습니다.`,
      time: getCurrentTime()
    };
    room.messages.push(joinMessage);

    console.log(`[${getCurrentTime()}] ${username} (${socket.id}) 입장: ${roomCode} (${room.participants.length}명) - 방장: ${participant.isOwner}`);

    socket.emit('room-joined', {
      roomCode,
      participants: room.participants,
      messages: room.messages,
      roomInfo: {
        name: room.name,
        description: room.description,
        hasPassword: !!room.password
      }
    });

    socket.to(roomCode).emit('user-joined', {
      participants: room.participants,
      message: joinMessage
    });
  });

  // 사용자 상태 업데이트 처리
  socket.on('update-user-status', ({ status, emoji, customText }) => {
    if (!socket.roomCode || !socket.username) return;

    const room = rooms[socket.roomCode];
    if (room) {
      const participant = room.participants.find(p => p.socketId === socket.id);
      if (participant) {
        participant.status = status;
        participant.statusEmoji = emoji || '';
        participant.statusText = customText || '';

        console.log(`[${getCurrentTime()}] 상태 변경: ${socket.username} - ${status} ${emoji} ${customText}`);

        io.to(socket.roomCode).emit('user-status-changed', {
          participants: room.participants
        });
      }
    }
  });

  // 강제 제어 이벤트 - 개선된 로직
  socket.on('force-control', ({ targetSocketId, action, value }) => {
    if (!socket.roomCode || !socket.username) return;

    const room = rooms[socket.roomCode];
    if (!room) return;

    // 방장 권한 확인
    const controller = room.participants.find(p => p.socketId === socket.id);
    if (!controller || !controller.isOwner) {
      socket.emit('force-control-error', '방장만 이 기능을 사용할 수 있습니다.');
      return;
    }

    // 대상 참가자 찾기
    const targetParticipant = room.participants.find(p => p.socketId === targetSocketId);
    if (!targetParticipant) {
      socket.emit('force-control-error', '대상 참가자를 찾을 수 없습니다.');
      return;
    }

    // 자기 자신은 제어할 수 없음
    if (targetSocketId === socket.id) {
      socket.emit('force-control-error', '자기 자신은 제어할 수 없습니다.');
      return;
    }

    console.log(`[강제 제어] ${action}=${value} to ${targetParticipant.username} (현재 상태: video=${targetParticipant.isVideoOn}, audio=${targetParticipant.isAudioOn}, headset=${targetParticipant.isHeadsetOn})`);

    // 시스템 메시지 생성
    let systemMessage = '';

    switch (action) {
      case 'video':
        if (!value) {
          // 비디오 강제로 끄기
          systemMessage = `🔒 ${socket.username}님이 ${targetParticipant.username}님의 비디오를 강제 비활성화했습니다.`;
          // 현재 상태를 이전 상태로 저장
          targetParticipant.previousVideoState = targetParticipant.isVideoOn;
          targetParticipant.isVideoOn = false;
          targetParticipant.isVideoForcedOff = true;
        } else {
          // 비디오 강제 제어 해제
          systemMessage = `🔓 ${socket.username}님이 ${targetParticipant.username}님의 비디오 강제 제어를 해제했습니다.`;
          // 이전 상태로 복원
          const previousState = targetParticipant.previousVideoState !== undefined ?
            targetParticipant.previousVideoState : false;
          targetParticipant.isVideoOn = previousState;
          targetParticipant.isVideoForcedOff = false;
          targetParticipant.previousVideoState = undefined;
        }
        break;

      case 'audio':
        if (!value) {
          // 마이크 강제로 끄기
          systemMessage = `🔇 ${socket.username}님이 ${targetParticipant.username}님의 마이크를 강제 비활성화했습니다.`;
          // 현재 상태를 이전 상태로 저장
          targetParticipant.previousAudioState = targetParticipant.isAudioOn;
          targetParticipant.isAudioOn = false;
          targetParticipant.isAudioForcedOff = true;
        } else {
          // 마이크 강제 제어 해제
          systemMessage = `🔓 ${socket.username}님이 ${targetParticipant.username}님의 마이크 강제 제어를 해제했습니다.`;
          // 이전 상태로 복원 (헤드셋이 켜져있을 때만)
          if (targetParticipant.isHeadsetOn && !targetParticipant.isHeadsetForcedOff) {
            const previousState = targetParticipant.previousAudioState !== undefined ?
              targetParticipant.previousAudioState : false;
            targetParticipant.isAudioOn = previousState;
          } else {
            targetParticipant.isAudioOn = false;
          }
          targetParticipant.isAudioForcedOff = false;
          targetParticipant.previousAudioState = undefined;
        }
        break;

      case 'headset':
        if (!value) {
          // 헤드셋 강제로 끄기 (마이크도 함께)
          systemMessage = `🎧 ${socket.username}님이 ${targetParticipant.username}님의 헤드셋과 마이크를 강제 비활성화했습니다.`;
          // 현재 상태들을 이전 상태로 저장
          targetParticipant.previousHeadsetState = targetParticipant.isHeadsetOn;
          targetParticipant.previousAudioState = targetParticipant.isAudioOn;
          // 헤드셋과 마이크 모두 끄기
          targetParticipant.isHeadsetOn = false;
          targetParticipant.isAudioOn = false;
          targetParticipant.isHeadsetForcedOff = true;
          targetParticipant.isAudioForcedOff = true;
        } else {
          // 헤드셋 강제 제어 해제
          systemMessage = `🔓 ${socket.username}님이 ${targetParticipant.username}님의 헤드셋 강제 제어를 해제했습니다.`;
          // 이전 상태들 복원
          const prevHeadsetState = targetParticipant.previousHeadsetState !== undefined ?
            targetParticipant.previousHeadsetState : true;
          const prevAudioState = targetParticipant.previousAudioState !== undefined ?
            targetParticipant.previousAudioState : false;

          targetParticipant.isHeadsetOn = prevHeadsetState;
          targetParticipant.isHeadsetForcedOff = false;

          // 헤드셋이 이전에 켜져있었다면 마이크 강제 제어도 해제하고 이전 상태로 복원
          if (prevHeadsetState) {
            targetParticipant.isAudioOn = prevAudioState;
            targetParticipant.isAudioForcedOff = false;
          }

          // 이전 상태 초기화
          targetParticipant.previousHeadsetState = undefined;
          targetParticipant.previousAudioState = undefined;
        }
        break;

      case 'kick':
        systemMessage = `🚪 ${socket.username}님이 ${targetParticipant.username}님을 강퇴했습니다.`;
        break;
    }

    console.log(`[강제 제어 결과] ${targetParticipant.username}: video=${targetParticipant.isVideoOn}, audio=${targetParticipant.isAudioOn}, headset=${targetParticipant.isHeadsetOn}, videoForced=${targetParticipant.isVideoForcedOff}, audioForced=${targetParticipant.isAudioForcedOff}, headsetForced=${targetParticipant.isHeadsetForcedOff}`);

    if (action === 'kick') {
      // 강퇴 처리
      io.to(targetSocketId).emit('force-kicked', {
        message: `방장에 의해 강퇴되었습니다.`,
        controllerName: socket.username
      });

      room.participants = room.participants.filter(p => p.socketId !== targetSocketId);

      const kickMessage = {
        id: Date.now(),
        user: 'System',
        message: systemMessage,
        time: getCurrentTime()
      };
      room.messages.push(kickMessage);

      io.to(socket.roomCode).emit('user-kicked', {
        participants: room.participants,
        message: kickMessage,
        kickedSocketId: targetSocketId
      });

      console.log(`[${getCurrentTime()}] 강퇴: ${targetParticipant.username} by ${socket.username} in ${socket.roomCode}`);
    } else {
      // 미디어 제어 - 대상에게 직접 명령 전송
      io.to(targetSocketId).emit('force-control-command', {
        action,
        value,
        controllerName: socket.username,
        // 서버에서 관리하는 최종 상태 전송
        finalStates: {
          isVideoOn: targetParticipant.isVideoOn,
          isAudioOn: targetParticipant.isAudioOn,
          isHeadsetOn: targetParticipant.isHeadsetOn,
          isVideoForcedOff: targetParticipant.isVideoForcedOff,
          isAudioForcedOff: targetParticipant.isAudioForcedOff,
          isHeadsetForcedOff: targetParticipant.isHeadsetForcedOff
        }
      });

      const controlMessage = {
        id: Date.now(),
        user: 'System',
        message: systemMessage,
        time: getCurrentTime()
      };
      room.messages.push(controlMessage);

      // 모든 참가자에게 제어 알림
      io.to(socket.roomCode).emit('force-control-applied', {
        participants: room.participants,
        message: controlMessage,
        targetSocketId,
        action,
        value
      });

      console.log(`[${getCurrentTime()}] 강제 제어: ${action}=${value} to ${targetParticipant.username} by ${socket.username} in ${socket.roomCode}`);
    }
  });

  // WebRTC 시그널링 - Offer 전달
  socket.on('offer', ({ targetSocketId, offer }) => {
    socket.to(targetSocketId).emit('offer', {
      offer,
      senderSocketId: socket.id,
      senderUsername: socket.username
    });
  });

  // WebRTC 시그널링 - Answer 전달
  socket.on('answer', ({ targetSocketId, answer }) => {
    socket.to(targetSocketId).emit('answer', {
      answer,
      senderSocketId: socket.id
    });
  });

  // WebRTC 시그널링 - ICE Candidate 전달
  socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
    socket.to(targetSocketId).emit('ice-candidate', {
      candidate,
      senderSocketId: socket.id
    });
  });

  // 미디어 상태 변경 - 비디오
  socket.on('toggle-video', ({ isVideoOn }) => {
    if (!socket.roomCode || !socket.username) return;

    const room = rooms[socket.roomCode];
    if (room) {
      const participant = room.participants.find(p => p.socketId === socket.id);
      if (participant) {
        participant.isVideoOn = isVideoOn;

        io.to(socket.roomCode).emit('user-media-changed', {
          socketId: socket.id,
          username: socket.username,
          isVideoOn,
          isAudioOn: participant.isAudioOn,
          isHeadsetOn: participant.isHeadsetOn,
          participants: room.participants
        });
      }
    }
  });

  // 미디어 상태 변경 - 오디오
  socket.on('toggle-audio', ({ isAudioOn }) => {
    if (!socket.roomCode || !socket.username) return;

    const room = rooms[socket.roomCode];
    if (room) {
      const participant = room.participants.find(p => p.socketId === socket.id);
      if (participant) {
        participant.isAudioOn = isAudioOn;

        io.to(socket.roomCode).emit('user-media-changed', {
          socketId: socket.id,
          username: socket.username,
          isVideoOn: participant.isVideoOn,
          isAudioOn,
          isHeadsetOn: participant.isHeadsetOn,
          participants: room.participants
        });
      }
    }
  });

  // 미디어 상태 변경 - 헤드셋 (새로 추가)
  socket.on('toggle-headset', ({ isHeadsetOn }) => {
    if (!socket.roomCode || !socket.username) return;

    const room = rooms[socket.roomCode];
    if (room) {
      const participant = room.participants.find(p => p.socketId === socket.id);
      if (participant) {
        participant.isHeadsetOn = isHeadsetOn;

        console.log(`[${getCurrentTime()}] ${socket.username} 헤드셋 ${isHeadsetOn ? '켜짐' : '꺼짐'}: ${socket.roomCode}`);

        io.to(socket.roomCode).emit('user-media-changed', {
          socketId: socket.id,
          username: socket.username,
          isVideoOn: participant.isVideoOn,
          isAudioOn: participant.isAudioOn,
          isHeadsetOn: isHeadsetOn,
          participants: room.participants
        });
      }
    }
  });

  // 음성 레벨 업데이트 처리
  socket.on('audio-level', ({ level, isSpeaking }) => {
    if (!socket.roomCode || !socket.username) return;

    const room = rooms[socket.roomCode];
    if (room) {
      const participant = room.participants.find(p => p.socketId === socket.id);
      if (participant) {
        participant.audioLevel = level;
        participant.isSpeaking = isSpeaking;
        participant.lastAudioUpdate = Date.now();

        io.to(socket.roomCode).emit('audio-level-update', {
          socketId: socket.id,
          username: socket.username,
          level,
          isSpeaking
        });
      }
    }
  });

  // 채팅 메시지 전송
  socket.on('send-message', (message) => {
    if (!socket.roomCode || !socket.username) return;

    const chatMessage = {
      id: Date.now(),
      user: socket.username,
      socketId: socket.id,
      message: message,
      time: getCurrentTime()
    };

    rooms[socket.roomCode].messages.push(chatMessage);
    io.to(socket.roomCode).emit('new-message', chatMessage);
  });

  // 방 설정 업데이트 (방장만 가능)
  socket.on('update-room-settings', ({ name, description, password, hasPassword }) => {
    if (!socket.roomCode || !socket.username) {
      socket.emit('update-room-error', '방에 입장한 상태가 아닙니다.');
      return;
    }

    const room = rooms[socket.roomCode];
    if (!room) {
      socket.emit('update-room-error', '존재하지 않는 방입니다.');
      return;
    }

    // 방장 권한 확인
    const participant = room.participants.find(p => p.socketId === socket.id);
    if (!participant || !participant.isOwner) {
      socket.emit('update-room-error', '방장만 방 설정을 변경할 수 있습니다.');
      return;
    }

    // 방 정보 업데이트
    room.name = name.trim();
    room.description = description.trim();
    room.password = hasPassword ? password.trim() : '';

    // 설정 변경 시스템 메시지
    const settingsMessage = {
      id: Date.now(),
      user: 'System',
      message: `🔧 ${socket.username}님이 방 설정을 변경했습니다.`,
      time: getCurrentTime()
    };
    room.messages.push(settingsMessage);

    console.log(`[${getCurrentTime()}] 방 설정 변경: ${socket.roomCode} by ${socket.username}`);

    // 모든 참가자에게 업데이트된 방 정보 전송
    const updatedRoomInfo = {
      name: room.name,
      description: room.description,
      hasPassword: !!room.password
    };

    socket.emit('room-settings-updated', updatedRoomInfo);
    socket.to(socket.roomCode).emit('room-settings-changed', {
      roomInfo: updatedRoomInfo,
      message: settingsMessage
    });
  });

  // 방 삭제 (방장만 가능)
  socket.on('delete-room', () => {
    if (!socket.roomCode || !socket.username) {
      socket.emit('delete-room-error', '방에 입장한 상태가 아닙니다.');
      return;
    }

    const room = rooms[socket.roomCode];
    if (!room) {
      socket.emit('delete-room-error', '존재하지 않는 방입니다.');
      return;
    }

    // 방장 권한 확인
    const participant = room.participants.find(p => p.socketId === socket.id);
    if (!participant || !participant.isOwner) {
      socket.emit('delete-room-error', '방장만 방을 삭제할 수 있습니다.');
      return;
    }

    console.log(`[${getCurrentTime()}] 방 삭제: ${socket.roomCode} "${room.name}" by ${socket.username}`);

    // 모든 참가자에게 방 삭제 알림
    io.to(socket.roomCode).emit('room-force-closed', {
      message: '😢 방장이 방을 삭제했습니다. 메인 화면으로 이동합니다.'
    });

    // 방 삭제
    delete rooms[socket.roomCode];

    socket.emit('room-deleted');
  });

  // 연결 해제 처리
  socket.on('disconnect', () => {
    if (socket.roomCode && socket.username) {
      const room = rooms[socket.roomCode];
      if (room) {
        // 현재 사용자가 방장인지 확인
        const leavingUser = room.participants.find(p => p.socketId === socket.id);
        const wasOwner = leavingUser?.isOwner || false;

        // 참가자 목록에서 제거
        room.participants = room.participants.filter(p => p.socketId !== socket.id);

        const leaveMessage = {
          id: Date.now(),
          user: 'System',
          message: `${socket.username}님이 퇴장했습니다.`,
          time: getCurrentTime()
        };
        room.messages.push(leaveMessage);

        // 방장이 나간 경우 이양 처리
        let ownershipMessage = null;
        if (wasOwner && room.participants.length > 0) {
          ownershipMessage = transferOwnership(room);
        }

        // 퇴장 알림과 방장 변경 알림을 함께 전송
        const messagesToSend = [leaveMessage];
        if (ownershipMessage) {
          messagesToSend.push(ownershipMessage);
        }

        socket.to(socket.roomCode).emit('user-left', {
          participants: room.participants,
          messages: messagesToSend,
          disconnectedSocketId: socket.id
        });

        console.log(`[${getCurrentTime()}] ${socket.username} 퇴장: ${socket.roomCode} (${room.participants.length}명)${wasOwner ? ' - 방장이양 완료' : ''}`);

        // 방이 비어있으면 삭제
        if (room.participants.length === 0) {
          console.log(`[${getCurrentTime()}] 방 삭제: ${socket.roomCode} "${room.name}"`);
          delete rooms[socket.roomCode];
        }
      }
    }
  });

  // 비활성 음성 레벨 정리 (5초마다 실행)
  setInterval(() => {
    Object.values(rooms).forEach(room => {
      const now = Date.now();
      room.participants.forEach(participant => {
        // 5초 이상 음성 레벨 업데이트가 없으면 비활성화
        if (participant.lastAudioUpdate && (now - participant.lastAudioUpdate > 5000)) {
          if (participant.isSpeaking || participant.audioLevel > 0) {
            participant.audioLevel = 0;
            participant.isSpeaking = false;

            // 모든 참가자에게 음성 레벨 초기화 알림
            io.to(room.id).emit('audio-level-update', {
              socketId: participant.socketId,
              username: participant.username,
              level: 0,
              isSpeaking: false
            });
          }
        }
      });
    });
  }, 5000);
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 모각코 WebRTC 서버 시작: http://localhost:${PORT}`);
});