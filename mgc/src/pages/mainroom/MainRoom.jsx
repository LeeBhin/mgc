import React, { useState } from 'react';
import Header from '../../components/layout/Header';
import VideoGrid from '../../components/VideoGrid';
import ControlBar from '../../components/ControlBar'; 
import Sidebar from '../../components/layout/SideBar';
import RoomSettingsPopup from '../../components/modals/RoomSettingPopup';

const MainRoom = ({ 
  username = '', 
  roomCode = '', 
  roomName = '',
  roomDescription = '',
  currentRoomInfo = null,
  existingRoomInfo = null,
  participants = [], 
  messages = [], 
  currentUserSocketId = '',
  onSendMessage = () => {}, 
  onLeaveRoom = () => {},
  onUpdateRoomSettings = () => {},
  onDeleteRoom = () => {},
  localStream = null,
  remoteStreams = {},
  isVideoOn = false,
  isAudioOn = false,
  isHeadsetOn = true,
  onToggleVideo = () => {},
  onToggleAudio = () => {},
  onToggleHeadset = () => {},
  onDeviceChange = () => {},
  localVideoRef = null,
  playAllVideos = () => {},
  isSidebarOpen = false,
  setIsSidebarOpen = () => {},
  expandedVideo = null,
  setExpandedVideo = () => {},
  // 사용자 상태 관련 props 추가
  onStatusChange = () => {},
  userStatus = 'online',
  userEmoji = '',
  customText = '',
  // 강제 제어 관련 props 추가
  forceControl = () => {},
  isVideoForcedOff = false,
  isAudioForcedOff = false,
  isHeadsetForcedOff = false
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 비디오 클릭 처리 (확대/축소)
  const handleVideoClick = (participantSocketId) => {
    if (expandedVideo === participantSocketId) {
      setExpandedVideo(null);
    } else {
      setExpandedVideo(participantSocketId);
    }
  };

  // 방 설정 업데이트
  const handleUpdateRoomSettings = async (settings) => {
    await onUpdateRoomSettings(settings);
  };

  // 방 삭제
  const handleDeleteRoom = async () => {
    await onDeleteRoom();
  };

  // 사용자 상태 변경 처리
  const handleStatusChange = (statusData) => {
    onStatusChange(statusData);
  };

  // 강제 제어 처리
  const handleForceControl = (targetSocketId, action, value) => {
    forceControl(targetSocketId, action, value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col md:flex-row">
      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Header 
          roomCode={roomCode}
          roomName={roomName}
          roomDescription={roomDescription}
          currentUserSocketId={currentUserSocketId}
          participants={participants}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onLeaveRoom={onLeaveRoom}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        
        <VideoGrid
          username={username}
          participants={participants}
          currentUserSocketId={currentUserSocketId}
          localStream={localStream}
          remoteStreams={remoteStreams}
          localVideoRef={localVideoRef}
          expandedVideo={expandedVideo}
          onVideoClick={handleVideoClick}
          playAllVideos={playAllVideos}
          isHeadsetOn={isHeadsetOn}
          onForceControl={handleForceControl}
        />
        
        <ControlBar
          isVideoOn={isVideoOn}
          isAudioOn={isAudioOn}
          isHeadsetOn={isHeadsetOn}
          onToggleVideo={onToggleVideo}
          onToggleAudio={onToggleAudio}
          onToggleHeadset={onToggleHeadset}
          onDeviceChange={onDeviceChange}
          onLeaveRoom={onLeaveRoom}
          isVideoForcedOff={isVideoForcedOff}
          isAudioForcedOff={isAudioForcedOff}
          isHeadsetForcedOff={isHeadsetForcedOff}
        />
      </div>

      {/* 사이드바 */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        username={username}
        roomCode={roomCode}
        participants={participants}
        messages={messages}
        onSendMessage={onSendMessage}
        currentUserSocketId={currentUserSocketId}
        onStatusChange={handleStatusChange}
        onForceControl={handleForceControl}
        userStatus={userStatus}
        userEmoji={userEmoji}
        customText={customText}
      />

      {/* 방 설정 팝업 */}
      <RoomSettingsPopup
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        roomInfo={{
          name: roomName,
          description: roomDescription,
          hasPassword: currentRoomInfo?.hasPassword || existingRoomInfo?.hasPassword || false
        }}
        onUpdateRoom={handleUpdateRoomSettings}
        onDeleteRoom={handleDeleteRoom}
      />
    </div>
  );
};

export default MainRoom;