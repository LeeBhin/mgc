import React, { useState, useEffect } from 'react';
import VideoCard from './VideoCard';

/**
 * 비디오 그리드 컴포넌트
 * - 참가자들의 비디오 카드를 그리드로 배치
 * - 확대/축소 모드 지원
 * - 개별 볼륨 조절 상태 관리
 * - 로컬 스토리지와 연동하여 볼륨 설정 유지
 * - 방장 전용 강제 제어 기능
 */
const VideoGrid = ({
  username = '',
  participants = [],
  currentUserSocketId = '',
  localStream = null,
  remoteStreams = {},
  localVideoRef = null,
  expandedVideo = null,
  onVideoClick = () => { },
  playAllVideos = () => { },
  isHeadsetOn = true,
  onForceControl = () => {} // 강제 제어 콜백 추가
}) => {
  // 각 참가자별 볼륨 상태 관리
  const [participantVolumes, setParticipantVolumes] = useState({});
  const [participantPreviousVolumes, setParticipantPreviousVolumes] = useState({});

  // 새 참가자 기본 볼륨 설정 및 나간 참가자 정리
  useEffect(() => {
    setParticipantVolumes(prev => {
      const updated = { ...prev };
      let hasChanges = false;
      
      // 새로 들어온 참가자만 기본 볼륨 설정
      participants.forEach(participant => {
        if (!(participant.socketId in updated)) {
          updated[participant.socketId] = 50;
          hasChanges = true;
        }
      });

      // 나간 참가자의 볼륨 상태 정리
      const currentParticipantIds = participants.map(p => p.socketId);
      Object.keys(updated).forEach(socketId => {
        if (!currentParticipantIds.includes(socketId)) {
          delete updated[socketId];
          hasChanges = true;
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [participants]);

  // 로컬 스토리지에서 볼륨 설정 복원
  useEffect(() => {
    setParticipantVolumes(prev => {
      const updated = { ...prev };
      let hasChanges = false;
      
      participants.forEach(participant => {
        const volumeKey = `mogakko_volume_${participant.socketId}`;
        const savedVolume = localStorage.getItem(volumeKey);
        if (savedVolume && !(participant.socketId in updated)) {
          updated[participant.socketId] = parseInt(savedVolume);
          hasChanges = true;
        }
      });
      
      return hasChanges ? updated : prev;
    });

    // 이전 볼륨도 복원
    setParticipantPreviousVolumes(prev => {
      const updated = { ...prev };
      let hasChanges = false;
      
      participants.forEach(participant => {
        const prevVolumeKey = `mogakko_prev_volume_${participant.socketId}`;
        const savedPrevVolume = localStorage.getItem(prevVolumeKey);
        if (savedPrevVolume && !(participant.socketId in updated)) {
          updated[participant.socketId] = parseInt(savedPrevVolume);
          hasChanges = true;
        }
      });
      
      return hasChanges ? updated : prev;
    });
  }, [participants]);

  // 볼륨 변경 처리 (이전 볼륨 자동 저장)
  const handleVolumeChange = (participantSocketId, newVolume) => {
    // 음소거(0%)로 변경하는 경우 현재 볼륨을 이전 볼륨으로 저장
    const currentVol = participantVolumes[participantSocketId];
    if (currentVol !== undefined && currentVol > 0 && newVolume === 0) {
      setParticipantPreviousVolumes(prev => ({
        ...prev,
        [participantSocketId]: currentVol
      }));
      
      // 로컬 스토리지에도 이전 볼륨 저장
      const prevVolumeKey = `mogakko_prev_volume_${participantSocketId}`;
      localStorage.setItem(prevVolumeKey, currentVol.toString());
    }
    
    // 현재 볼륨 업데이트
    setParticipantVolumes(prev => ({
      ...prev,
      [participantSocketId]: newVolume
    }));

    // 로컬 스토리지에 현재 볼륨 저장
    const volumeKey = `mogakko_volume_${participantSocketId}`;
    localStorage.setItem(volumeKey, newVolume.toString());
  };

  // 참가자 정렬: 현재 사용자 우선
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.socketId === currentUserSocketId) return -1;
    if (b.socketId === currentUserSocketId) return 1;
    return a.socketId.localeCompare(b.socketId);
  });

  // 참가자 수에 따른 그리드 설정
  const getGridConfig = () => {
    if (sortedParticipants.length === 1) {
      return { gridClass: 'grid-cols-1', gapClass: 'gap-3 sm:gap-4' };
    } else if (sortedParticipants.length === 2) {
      return { gridClass: 'grid-cols-1 sm:grid-cols-2', gapClass: 'gap-3 sm:gap-4' };
    } else if (sortedParticipants.length <= 4) {
      return { gridClass: 'grid-cols-2', gapClass: 'gap-2 xs:gap-3 sm:gap-4' };
    } else {
      return { gridClass: 'grid-cols-2 md:grid-cols-3', gapClass: 'gap-2 xs:gap-3 sm:gap-4' };
    }
  };

  const { gridClass, gapClass } = getGridConfig();

  return (
    <div className="flex-1 p-2 sm:p-4 md:p-6 overflow-hidden">
      {expandedVideo ? (
        // 확대 모드
        <div className="flex items-center justify-center min-h-0 h-full">
          <div className="w-full max-w-6xl grid grid-cols-1 gap-4 place-items-center">
            {/* 확대된 비디오 */}
            <div className="w-full max-w-4xl aspect-video">
              {sortedParticipants.map((participant) => {
                const isCurrentUser = participant.socketId === currentUserSocketId;
                const remoteStream = isCurrentUser ? null : remoteStreams[participant.socketId];
                const isExpanded = participant.socketId === expandedVideo;

                if (!isExpanded) return null;

                return (
                  <VideoCard
                    key={participant.socketId}
                    participant={participant}
                    currentUserSocketId={currentUserSocketId}
                    localStream={localStream}
                    remoteStream={remoteStream}
                    localVideoRef={localVideoRef}
                    onClick={() => onVideoClick(participant.socketId)}
                    isExpanded={true}
                    playAllVideos={playAllVideos}
                    isHeadsetOn={isHeadsetOn}
                    participantVolumes={participantVolumes}
                    participantPreviousVolumes={participantPreviousVolumes}
                    onVolumeChange={handleVolumeChange}
                    onForceControl={onForceControl}
                    participants={participants}
                  />
                );
              })}
            </div>

            {/* 작은 비디오들 */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-2 w-full justify-center max-w-4xl h-32" style={{ scrollbarWidth: 'none' }}>
              {sortedParticipants.map((participant) => {
                const isCurrentUser = participant.socketId === currentUserSocketId;
                const remoteStream = isCurrentUser ? null : remoteStreams[participant.socketId];
                const isExpanded = participant.socketId === expandedVideo;

                if (isExpanded) return null;

                return (
                  <div
                    key={participant.socketId}
                    className="flex-shrink-0 w-40 h-24 group"
                  >
                    <VideoCard
                      participant={participant}
                      currentUserSocketId={currentUserSocketId}
                      localStream={localStream}
                      remoteStream={remoteStream}
                      localVideoRef={localVideoRef}
                      onClick={() => onVideoClick(participant.socketId)}
                      isExpanded={false}
                      playAllVideos={playAllVideos}
                      isHeadsetOn={isHeadsetOn}
                      participantVolumes={participantVolumes}
                      participantPreviousVolumes={participantPreviousVolumes}
                      onVolumeChange={handleVolumeChange}
                      onForceControl={onForceControl}
                      participants={participants}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        // 일반 그리드 모드
        <div className="flex items-center justify-center min-h-0 h-full">
          <div className={`grid ${gridClass} ${gapClass} mx-auto w-full max-w-6xl`} style={{ maxHeight: 'calc(100vh - 280px)' }}>
            {sortedParticipants.map((participant) => {
              const isCurrentUser = participant.socketId === currentUserSocketId;
              const remoteStream = isCurrentUser ? null : remoteStreams[participant.socketId];

              return (
                <div key={participant.socketId} className="w-full h-auto transition-all duration-300 ease-in-out group">
                  <VideoCard
                    participant={participant}
                    currentUserSocketId={currentUserSocketId}
                    localStream={localStream}
                    remoteStream={remoteStream}
                    localVideoRef={localVideoRef}
                    onClick={() => onVideoClick(participant.socketId)}
                    isExpanded={false}
                    playAllVideos={playAllVideos}
                    isHeadsetOn={isHeadsetOn}
                    participantVolumes={participantVolumes}
                    participantPreviousVolumes={participantPreviousVolumes}
                    onVolumeChange={handleVolumeChange}
                    onForceControl={onForceControl}
                    participants={participants}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGrid;