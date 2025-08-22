import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import WaitingRoom from './mainroom/WaitingRoom'; 
import MainRoom from './mainroom/MainRoom';
import { useSocket } from '../hooks/useSocket';

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  
  // 상태 관리
  const [currentView, setCurrentView] = useState('waiting');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [existingRoomInfo, setExistingRoomInfo] = useState(null);
  const [currentRoomInfo, setCurrentRoomInfo] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedVideo, setExpandedVideo] = useState(null);
  
  // 사용자 상태 관리 (탭 전환 시에도 유지)
  const [userStatus, setUserStatus] = useState('online');
  const [userEmoji, setUserEmoji] = useState('');
  const [customText, setCustomText] = useState('');
  
  // Socket 훅 사용 - 방 정보 업데이트 콜백 전달
  const {
    participants,
    messages,
    error,
    localStream,
    remoteStreams,
    isVideoOn,
    isAudioOn,
    isHeadsetOn,
    localVideoRef,
    playAllVideos,
    currentUserSocketId,
    selectedVideoDevice,
    selectedAudioInput,
    selectedAudioOutput,
    joinRoom,
    createRoom,
    sendMessage,
    leaveRoom,
    updateRoomSettings,
    deleteRoom,
    handleToggleVideo,
    handleToggleAudio,
    handleToggleHeadset,
    handleDeviceChange,
    setError,
    checkRoomExists,
    updateUserStatus,  // 사용자 상태 업데이트 함수 추가
    forceControl,       // 강제 제어 함수 추가
    isVideoForcedOff,
    isAudioForcedOff,
    isHeadsetForcedOff
  } = useSocket((roomInfo) => {
    // 다른 사용자가 방 설정을 변경했을 때 실시간 업데이트
    setCurrentRoomInfo(prev => ({
      ...prev,
      name: roomInfo.name,
      description: roomInfo.description,
      hasPassword: roomInfo.hasPassword
    }));
  });

  // 방 강제 종료 처리
  useEffect(() => {
    const handleRoomForceClose = () => {
      navigate('/');
    };

    window.addEventListener('room-force-closed', handleRoomForceClose);
    
    return () => {
      window.removeEventListener('room-force-closed', handleRoomForceClose);
    };
  }, [navigate]);

  // 페이지 새로고침 감지 및 뒤로가기 처리
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentView === 'main') {
        leaveRoom();
      }
    };

    const handlePopState = () => {
      if (currentView === 'main') {
        setCurrentView('waiting');
      } else {
        navigate('/');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentView, navigate, leaveRoom]);

  // 방 정보 확인 (URL 직접 접근 시)
  useEffect(() => {
    if (roomId !== 'create' && (!mode || mode === 'join')) {
      checkRoomInfo();
    }
  }, [mode, roomId]);

  // 방 존재 여부 확인
  const checkRoomInfo = async () => {
    try {
      const roomInfo = await checkRoomExists(roomId);
      if (roomInfo) {
        setExistingRoomInfo(roomInfo);
      } else {
        setError('존재하지 않는 방입니다.');
      }
    } catch (error) {
      setError('방 정보를 확인할 수 없습니다.');
    }
  };

  // 방 생성 처리
  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError('방 이름을 입력해주세요.');
      return;
    }

    if (!username.trim()) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    const roomData = {
      name: roomName.trim(),
      description: roomDescription.trim(),
      password: roomPassword.trim(),
      creator: username.trim()
    };

    const result = await createRoom(roomData);
    if (result) {
      setCurrentRoomInfo({
        name: roomData.name,
        description: roomData.description,
        hasPassword: !!roomData.password
      });
      
      navigate(`/room/${result.roomId}`, { replace: true });
      setCurrentView('main');
    }
  };

  // 방 입장 처리
  const handleJoinRoom = async () => {
    if (!username.trim()) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    if (existingRoomInfo?.hasPassword && !password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    const result = await joinRoom(username, roomId, password);
    if (result) {
      setCurrentRoomInfo({
        name: existingRoomInfo?.name || '',
        description: existingRoomInfo?.description || '',
        hasPassword: existingRoomInfo?.hasPassword || false
      });
      setCurrentView('main');
    }
  };

  // 방 나가기 처리
  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/');
  };

  // 메시지 전송 처리
  const handleSendMessage = (message) => {
    sendMessage(message);
  };

  // 방 설정 업데이트 처리
  const handleUpdateRoomSettings = async (settings) => {
    try {
      await updateRoomSettings(settings);
      // 로컬 상태도 업데이트
      setCurrentRoomInfo(prev => ({
        ...prev,
        name: settings.name,
        description: settings.description,
        hasPassword: settings.hasPassword
      }));
    } catch (error) {
      console.error('방 설정 업데이트 실패:', error);
      throw error;
    }
  };

  // 방 삭제 처리
  const handleDeleteRoom = async () => {
    try {
      await deleteRoom();
      navigate('/');
    } catch (error) {
      console.error('방 삭제 실패:', error);
      throw error;
    }
  };

  // 사용자 상태 변경 처리
  const handleStatusChange = (statusData) => {
    setUserStatus(statusData.status);
    setUserEmoji(statusData.emoji || '');
    setCustomText(statusData.customText || '');
    
    // 소켓을 통해 서버에 상태 변경 알림
    if (updateUserStatus) {
      updateUserStatus(statusData);
    }
  };

  // 강제 제어 처리
  const handleForceControl = (targetSocketId, action, value) => {
    if (forceControl) {
      forceControl(targetSocketId, action, value);
    }
  };

  // 대기실 렌더링
  if (currentView === 'waiting') {
    return (
      <WaitingRoom
        mode={mode}
        roomId={roomId}
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        roomName={roomName}
        setRoomName={setRoomName}
        roomDescription={roomDescription}
        setRoomDescription={setRoomDescription}
        roomPassword={roomPassword}
        setRoomPassword={setRoomPassword}
        existingRoomInfo={existingRoomInfo}
        isVideoOn={isVideoOn}
        isAudioOn={isAudioOn}
        isHeadsetOn={isHeadsetOn}
        onToggleVideo={handleToggleVideo}
        onToggleAudio={handleToggleAudio}
        onToggleHeadset={handleToggleHeadset}
        localStream={localStream}
        localVideoRef={localVideoRef}
        error={error}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onCancel={() => navigate('/')}
      />
    );
  }

  // 메인룸 렌더링
  return (
    <MainRoom
      username={username}
      roomCode={roomId}
      roomName={currentRoomInfo?.name || existingRoomInfo?.name || ''}
      roomDescription={currentRoomInfo?.description || existingRoomInfo?.description || ''}
      currentRoomInfo={currentRoomInfo}
      existingRoomInfo={existingRoomInfo}
      participants={participants}
      messages={messages}
      currentUserSocketId={currentUserSocketId}
      onSendMessage={handleSendMessage}
      onLeaveRoom={handleLeaveRoom}
      onUpdateRoomSettings={handleUpdateRoomSettings}
      onDeleteRoom={handleDeleteRoom}
      localStream={localStream}
      remoteStreams={remoteStreams}
      isVideoOn={isVideoOn}
      isAudioOn={isAudioOn}
      isHeadsetOn={isHeadsetOn}
      onToggleVideo={handleToggleVideo}
      onToggleAudio={handleToggleAudio}
      onToggleHeadset={handleToggleHeadset}
      onDeviceChange={handleDeviceChange}
      localVideoRef={localVideoRef}
      playAllVideos={playAllVideos}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      expandedVideo={expandedVideo}
      setExpandedVideo={setExpandedVideo}
      onStatusChange={handleStatusChange}
      userStatus={userStatus}
      userEmoji={userEmoji}
      customText={customText}
      forceControl={forceControl}
      isVideoForcedOff={isVideoForcedOff}
      isAudioForcedOff={isAudioForcedOff}
      isHeadsetForcedOff={isHeadsetForcedOff}
    />
  );
};

export default RoomPage;