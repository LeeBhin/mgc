import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

export const useSocket = (onRoomInfoUpdate = null) => {
  // 기본 상태
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [currentUserSocketId, setCurrentUserSocketId] = useState('');

  // 미디어 상태
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [peerConnections, setPeerConnections] = useState({});
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isHeadsetOn, setIsHeadsetOn] = useState(true);
  const [previousAudioState, setPreviousAudioState] = useState(false);

  // 강제 제어 상태
  const [isVideoForcedOff, setIsVideoForcedOff] = useState(false);
  const [isAudioForcedOff, setIsAudioForcedOff] = useState(false);
  const [isHeadsetForcedOff, setIsHeadsetForcedOff] = useState(false);

  // 장치 선택 상태
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState('');

  // Refs
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const isVideoOnRef = useRef(false);
  const isAudioOnRef = useRef(false);
  const isHeadsetOnRef = useRef(true);

  // 오디오 레벨 분석을 위한 변수들
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);

  // ICE 서버 설정
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
  };

  // 로컬 미디어 스트림 획득
  const getLocalStream = async (videoDeviceId = null, audioDeviceId = null) => {
    try {
      const constraints = {
        video: videoDeviceId ?
          { deviceId: { exact: videoDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } } :
          { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: audioDeviceId ?
          { deviceId: { exact: audioDeviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 48000, sampleSize: 24, channelCount: 2, latency: 0 } :
          { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 48000, sampleSize: 24, channelCount: 2, latency: 0 }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setLocalStream(stream);
      localStreamRef.current = stream;

      // 초기 상태: 미디어 비활성화
      stream.getVideoTracks().forEach(track => {
        track.enabled = false;
      });
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });

      // 오디오 품질 설정
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        if (isHeadsetOn) {
          await applyHighQualityAudioSettings(audioTrack);
        } else {
          await applyVoiceOptimizedSettings(audioTrack);
        }
      }

      return stream;
    } catch (error) {
      setError('카메라/마이크 접근이 허용되지 않습니다. 브라우저 설정에서 권한을 허용해주세요.');
      return null;
    }
  };

  // 장치 변경 처리
  const handleDeviceChange = async (type, deviceId) => {
    if (!localStreamRef.current) {
      console.warn('로컬 스트림이 없습니다.');
      return;
    }

    console.log(`장치 변경 시작: ${type}, ${deviceId}`);

    try {
      if (type === 'video') {
        setSelectedVideoDevice(deviceId);

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
          audio: false
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        if (!newVideoTrack) {
          console.warn('새 비디오 트랙을 얻을 수 없습니다.');
          return;
        }

        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        newVideoTrack.enabled = isVideoOnRef.current;

        if (oldVideoTrack) {
          localStreamRef.current.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        localStreamRef.current.addTrack(newVideoTrack);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        // PeerConnection 트랙 교체
        if (Object.keys(peerConnectionsRef.current).length > 0) {
          Object.entries(peerConnectionsRef.current).forEach(([socketId, pc]) => {
            try {
              if (pc && pc.connectionState && pc.connectionState !== 'closed') {
                const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                  sender.replaceTrack(newVideoTrack).catch(err => {
                    console.warn(`비디오 트랙 교체 실패 (${socketId}):`, err);
                  });
                }
              }
            } catch (err) {
              console.warn(`PeerConnection 처리 실패 (${socketId}):`, err);
            }
          });
        }

      } else if (type === 'audioInput') {
        setSelectedAudioInput(deviceId);

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: {
            deviceId: { exact: deviceId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
            sampleSize: 24,
            channelCount: 2,
            latency: 0
          }
        });

        const newAudioTrack = newStream.getAudioTracks()[0];
        if (!newAudioTrack) {
          console.warn('새 오디오 트랙을 얻을 수 없습니다.');
          return;
        }

        const oldAudioTrack = localStreamRef.current.getAudioTracks()[0];

        if (isHeadsetOnRef.current) {
          await applyHighQualityAudioSettings(newAudioTrack);
        } else {
          await applyVoiceOptimizedSettings(newAudioTrack);
        }

        newAudioTrack.enabled = isAudioOnRef.current && isHeadsetOnRef.current;

        if (oldAudioTrack) {
          localStreamRef.current.removeTrack(oldAudioTrack);
          oldAudioTrack.stop();
        }
        localStreamRef.current.addTrack(newAudioTrack);

        // PeerConnection 트랙 교체
        if (Object.keys(peerConnectionsRef.current).length > 0) {
          Object.entries(peerConnectionsRef.current).forEach(([socketId, pc]) => {
            try {
              if (pc && pc.connectionState && pc.connectionState !== 'closed') {
                const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
                if (sender) {
                  sender.replaceTrack(newAudioTrack).catch(err => {
                    console.warn(`오디오 트랙 교체 실패 (${socketId}):`, err);
                  });
                }
              }
            } catch (err) {
              console.warn(`PeerConnection 처리 실패 (${socketId}):`, err);
            }
          });
        }

        // 오디오 분석 재시작
        stopAudioLevelAnalysis();
        if (participants.length > 0) {
          setTimeout(() => startAudioLevelAnalysis(), 100);
        }

        console.log('오디오 입력 장치 변경 완료');

      } else if (type === 'audioOutput') {
        setSelectedAudioOutput(deviceId);

        const videoElements = document.querySelectorAll('video');
        for (const video of videoElements) {
          if (video.setSinkId) {
            try {
              await video.setSinkId(deviceId);
            } catch (err) {
              console.warn('스피커 변경 실패:', err);
            }
          }
        }

        console.log('오디오 출력 장치 변경 완료');
      }
    } catch (error) {
      console.error(`${type} 장치 변경 실패:`, error);
    }
  };

  // 고품질 오디오 설정 적용
  const applyHighQualityAudioSettings = async (audioTrack) => {
    try {
      await audioTrack.applyConstraints({
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 2,
        sampleRate: 48000,
        sampleSize: 24,
        latency: 0
      });
      if ('contentHint' in audioTrack) {
        audioTrack.contentHint = 'music';
      }
    } catch (e) {
      console.warn('고품질 설정 적용 실패:', e);
    }
  };

  // 음성 최적화 설정 적용
  const applyVoiceOptimizedSettings = async (audioTrack) => {
    try {
      await audioTrack.applyConstraints({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
        sampleSize: 16,
        latency: 0
      });
      if ('contentHint' in audioTrack) {
        audioTrack.contentHint = 'speech';
      }
    } catch (e) {
      console.warn('음성 최적화 설정 적용 실패:', e);
    }
  };

  // 모든 비디오 자동 재생
  const playAllVideos = useCallback(() => {
    document.querySelectorAll('video').forEach(async (video) => {
      if (video.paused) {
        try {
          await video.play();
        } catch (error) {
          // 자동 재생 실패 무시
        }
      }
    });
  }, []);

  // SDP 고품질 Opus 최적화
  const enhanceSdpForHighQualityOpus = (sdp) => {
    if (!sdp) return sdp;

    let lines = sdp.split('\n');
    let opusPt = null;

    for (const line of lines) {
      const match = line.match(/^a=rtpmap:(\d+) opus\/48000\/?\d*/i);
      if (match) {
        opusPt = match[1];
        break;
      }
    }

    if (!opusPt) return sdp;

    const highQualityParams = {
      'stereo': '1',
      'sprop-stereo': '1',
      'maxaveragebitrate': '510000',
      'maxplaybackrate': '48000',
      'maxptime': '60',
      'ptime': '20',
      'useinbandfec': '1',
      'usedtx': '0',
      'cbr': '0'
    };

    const fmtpIndex = lines.findIndex(l => l.toLowerCase().startsWith(`a=fmtp:${opusPt}`));

    if (fmtpIndex !== -1) {
      const original = lines[fmtpIndex];
      const spaceIdx = original.indexOf(' ');
      const prefix = original.slice(0, spaceIdx);

      const existingParams = {};
      const paramString = original.slice(spaceIdx + 1);
      paramString.split(';').forEach(p => {
        const [k, v] = p.split('=');
        if (k) existingParams[k.trim()] = v?.trim();
      });

      const mergedParams = { ...existingParams, ...highQualityParams };
      const newParamString = Object.entries(mergedParams)
        .map(([k, v]) => v ? `${k}=${v}` : k)
        .join(';');

      lines[fmtpIndex] = `${prefix} ${newParamString}`;
    } else {
      const rtpmapIndex = lines.findIndex(l => l.toLowerCase().startsWith(`a=rtpmap:${opusPt}`));
      if (rtpmapIndex !== -1) {
        const paramString = Object.entries(highQualityParams)
          .map(([k, v]) => `${k}=${v}`)
          .join(';');
        lines.splice(rtpmapIndex + 1, 0, `a=fmtp:${opusPt} ${paramString}`);
      }
    }

    return lines.join('\n');
  };

  // Peer Connection 생성
  const createPeerConnection = useCallback((targetSocketId) => {
    const currentLocalStream = localStreamRef.current;

    if (!currentLocalStream) {
      return null;
    }

    const pcConfig = {
      ...iceServers,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      sdpSemantics: 'unified-plan'
    };

    const pc = new RTCPeerConnection(pcConfig);

    // 로컬 스트림 추가
    currentLocalStream.getTracks().forEach(track => {
      const sender = pc.addTrack(track, currentLocalStream);

      if (track.kind === 'audio') {
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];

        params.encodings[0] = {
          ...params.encodings[0],
          maxBitrate: 510000,
          priority: 'high',
          networkPriority: 'high'
        };

        sender.setParameters(params).catch(console.warn);
      }

      if (track.kind === 'video') {
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];

        params.encodings[0] = {
          ...params.encodings[0],
          maxBitrate: 2000000,
          maxFramerate: 30
        };

        sender.setParameters(params).catch(console.warn);
      }
    });

    // 원격 스트림 수신
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => ({
        ...prev,
        [targetSocketId]: remoteStream
      }));
    };

    // ICE 후보 처리
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    return pc;
  }, []);

  // 통화 시작
  const startCall = useCallback(async (targetSocketId) => {
    if (!socketRef.current || !localStreamRef.current) {
      return;
    }

    if (peerConnectionsRef.current[targetSocketId]) {
      return;
    }

    const pc = createPeerConnection(targetSocketId);
    if (!pc) return;

    setPeerConnections(prev => {
      const updated = { ...prev, [targetSocketId]: pc };
      peerConnectionsRef.current = updated;
      return updated;
    });

    try {
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        voiceActivityDetection: false
      };

      const offer = await pc.createOffer(offerOptions);
      const enhancedOffer = {
        ...offer,
        sdp: enhanceSdpForHighQualityOpus(offer.sdp)
      };

      await pc.setLocalDescription(enhancedOffer);
      socketRef.current.emit('offer', { targetSocketId, offer: enhancedOffer });
    } catch (error) {
      console.error('Offer 생성 실패:', error);
    }
  }, [createPeerConnection]);

  // 오디오 레벨 분석 시작
  const startAudioLevelAnalysis = useCallback(() => {
    if (!localStreamRef.current || audioContextRef.current) return;

    try {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (!audioTrack) return;

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(localStreamRef.current);

      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      sourceRef.current.connect(analyserRef.current);

      const analyzeAudio = () => {
        if (!analyserRef.current || !socketRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);

        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const value = Math.abs(dataArray[i] - 128);
          if (value > peak) {
            peak = value;
          }
        }

        const threshold = 5; // 더 낮은 임계값으로 설정
        const normalizedPeak = peak > threshold ? peak / 30 : 0;
        const level = normalizedPeak > 0 ? Math.min(100, Math.pow(normalizedPeak, 0.65) * 100) : 0;
        const isSpeaking = level > 15; // 말하는 중 판단 임계값

        // 오디오가 켜져있고 헤드셋이 켜져있을 때만 전송
        if (isAudioOnRef.current && isHeadsetOnRef.current) {
          socketRef.current.emit('audio-level', {
            level: level,
            isSpeaking: isSpeaking
          });
        } else {
          // 오디오가 꺼져있으면 0으로 전송
          socketRef.current.emit('audio-level', {
            level: 0,
            isSpeaking: false
          });
        }

        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      };

      analyzeAudio();
    } catch (error) {
      console.error('오디오 레벨 분석 시작 실패:', error);
    }
  }, []);

  // 오디오 레벨 분석 중지
  const stopAudioLevelAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  }, []);

  // 사용자 상태 업데이트 함수
  const updateUserStatus = useCallback((statusData) => {
    if (socketRef.current) {
      socketRef.current.emit('update-user-status', statusData);
    }
  }, []);

  // 강제 제어 함수
  const forceControl = useCallback((targetSocketId, action, value) => {
    if (socketRef.current) {
      socketRef.current.emit('force-control', {
        targetSocketId,
        action,
        value
      });
    }
  }, []);

  // Socket.IO 이벤트 설정
  useEffect(() => {
    if (!socket) {
      const newSocket = io('http://localhost:5000', {
        transports: ['websocket'],
        upgrade: false
      });
      setSocket(newSocket);
      socketRef.current = newSocket;

      newSocket.on('connect', () => {
        if (currentUserSocketId !== newSocket.id) {
          setCurrentUserSocketId(newSocket.id);
        }
      });

      newSocket.on('reconnect', () => {
        setCurrentUserSocketId(newSocket.id);
      });

      newSocket.on('room-created', ({ roomId, roomInfo }) => {
        // 방 생성 완료 처리
      });

      newSocket.on('room-info', (roomInfo) => {
        // 방 정보 처리
      });

      newSocket.on('room-joined', async ({ roomCode, participants, messages, roomInfo }) => {
        if (currentUserSocketId !== newSocket.id) {
          setCurrentUserSocketId(newSocket.id);
        }

        setParticipants(participants);
        setMessages(messages);
        setError('');

        if (onRoomInfoUpdate && roomInfo) {
          onRoomInfoUpdate(roomInfo);
        }

        let stream = localStreamRef.current;
        if (!stream) {
          stream = await getLocalStream(selectedVideoDevice, selectedAudioInput);
        }

        if (stream) {
          const videoTrack = stream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];

          if (videoTrack) {
            videoTrack.enabled = isVideoOnRef.current;
          }
          if (audioTrack && isHeadsetOnRef.current) {
            audioTrack.enabled = isAudioOnRef.current;
          }

          setTimeout(() => {
            if (socketRef.current) {
              socketRef.current.emit('toggle-video', { isVideoOn: isVideoOnRef.current });
              socketRef.current.emit('toggle-headset', { isHeadsetOn: isHeadsetOnRef.current });
              if (isHeadsetOnRef.current) {
                socketRef.current.emit('toggle-audio', { isAudioOn: isAudioOnRef.current });
              }
            }
          }, 100);

          // 오디오 분석 시작
          setTimeout(() => startAudioLevelAnalysis(), 500);

          const existingParticipants = participants.filter(p => p.socketId !== newSocket.id);
          existingParticipants.forEach((participant, index) => {
            setTimeout(() => startCall(participant.socketId), 500 * (index + 1));
          });
        }
      });

      newSocket.on('join-error', (errorMessage) => {
        setError(errorMessage);
      });

      newSocket.on('create-error', (errorMessage) => {
        setError(errorMessage);
      });

      newSocket.on('user-joined', ({ participants, message }) => {
        const newParticipant = participants[participants.length - 1];
        setParticipants(participants);
        setMessages(prev => [...prev, message]);

        if (newParticipant && newParticipant.socketId !== newSocket.id && localStreamRef.current) {
          setTimeout(() => startCall(newParticipant.socketId), 1000);
        }
      });

      newSocket.on('offer', async ({ offer, senderSocketId }) => {
        if (!localStreamRef.current || peerConnectionsRef.current[senderSocketId]) {
          return;
        }

        const pc = createPeerConnection(senderSocketId);
        if (!pc) return;

        setPeerConnections(prev => {
          const updated = { ...prev, [senderSocketId]: pc };
          peerConnectionsRef.current = updated;
          return updated;
        });

        try {
          await pc.setRemoteDescription(offer);

          const answerOptions = {
            voiceActivityDetection: false
          };

          const answer = await pc.createAnswer(answerOptions);
          const enhancedAnswer = {
            ...answer,
            sdp: enhanceSdpForHighQualityOpus(answer.sdp)
          };

          await pc.setLocalDescription(enhancedAnswer);
          newSocket.emit('answer', { targetSocketId: senderSocketId, answer: enhancedAnswer });
        } catch (error) {
          console.error('Answer 생성 실패:', error);
        }
      });

      newSocket.on('answer', async ({ answer, senderSocketId }) => {
        const pc = peerConnectionsRef.current[senderSocketId];
        if (pc) {
          try {
            await pc.setRemoteDescription(answer);
          } catch (error) {
            console.error('Answer 설정 실패:', error);
          }
        }
      });

      newSocket.on('ice-candidate', async ({ candidate, senderSocketId }) => {
        const pc = peerConnectionsRef.current[senderSocketId];
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(candidate);
          } catch (error) {
            console.warn('ICE Candidate 추가 실패:', error);
          }
        }
      });

      newSocket.on('user-left', ({ participants, messages, disconnectedSocketId }) => {
        setParticipants(participants);

        if (Array.isArray(messages)) {
          setMessages(prev => [...prev, ...messages]);
        } else {
          setMessages(prev => [...prev, messages]);
        }

        setPeerConnections(prev => {
          if (prev[disconnectedSocketId]) {
            prev[disconnectedSocketId].close();
            const updated = { ...prev };
            delete updated[disconnectedSocketId];
            peerConnectionsRef.current = updated;
            return updated;
          }
          return prev;
        });

        setRemoteStreams(prev => {
          const updated = { ...prev };
          delete updated[disconnectedSocketId];
          return updated;
        });
      });

      newSocket.on('user-media-changed', ({ participants }) => {
        setParticipants(participants);
      });

      newSocket.on('user-status-changed', ({ participants }) => {
        setParticipants(participants);
      });

      // 오디오 레벨 업데이트 수신
      newSocket.on('audio-level-update', ({ socketId, username, level, isSpeaking }) => {
        setParticipants(prev => 
          prev.map(p => 
            p.socketId === socketId 
              ? { ...p, audioLevel: level, isSpeaking: isSpeaking }
              : p
          )
        );
      });

      newSocket.on('new-message', (message) => {
        setMessages(prev => [...prev, message]);
      });

      newSocket.on('room-settings-changed', ({ roomInfo, message }) => {
        if (onRoomInfoUpdate) {
          onRoomInfoUpdate(roomInfo);
        }
      });

      newSocket.on('room-force-closed', ({ message }) => {
        alert(message);
        window.dispatchEvent(new CustomEvent('room-force-closed'));
      });

      // 강제 제어 명령 수신
      newSocket.on('force-control-command', async ({ action, value, controllerName, finalStates }) => {
        console.log(`[클라이언트] 강제 제어 수신: ${action}=${value} by ${controllerName}`);
        console.log('[클라이언트] 최종 상태:', finalStates);

        // 서버에서 계산된 최종 상태를 그대로 적용
        if (finalStates) {
          // 강제 제어 상태 업데이트
          setIsVideoForcedOff(finalStates.isVideoForcedOff);
          setIsAudioForcedOff(finalStates.isAudioForcedOff);
          setIsHeadsetForcedOff(finalStates.isHeadsetForcedOff);

          // 실제 미디어 상태 업데이트
          setIsVideoOn(finalStates.isVideoOn);
          setIsAudioOn(finalStates.isAudioOn);
          setIsHeadsetOn(finalStates.isHeadsetOn);

          // ref도 동기화
          isVideoOnRef.current = finalStates.isVideoOn;
          isAudioOnRef.current = finalStates.isAudioOn;
          isHeadsetOnRef.current = finalStates.isHeadsetOn;

          if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            const audioTrack = localStreamRef.current.getAudioTracks()[0];

            // 비디오 트랙 제어
            if (videoTrack) {
              videoTrack.enabled = finalStates.isVideoOn;
            }

            // 오디오 트랙 제어
            if (audioTrack) {
              if (finalStates.isHeadsetOn) {
                await applyHighQualityAudioSettings(audioTrack);
                audioTrack.enabled = finalStates.isAudioOn;

                // 헤드셋이 켜져있으면 스피커 음소거 해제
                document.querySelectorAll('video').forEach(video => {
                  if (video !== localVideoRef.current) {
                    video.muted = false;
                    if (video.setSinkId && selectedAudioOutput) {
                      video.setSinkId(selectedAudioOutput).catch(console.warn);
                    }
                  }
                });

                // 오디오 분석 재시작
                if (finalStates.isAudioOn) {
                  stopAudioLevelAnalysis();
                  setTimeout(() => startAudioLevelAnalysis(), 100);
                }
              } else {
                await applyVoiceOptimizedSettings(audioTrack);
                audioTrack.enabled = false;

                // 헤드셋이 꺼져있으면 스피커 음소거
                document.querySelectorAll('video').forEach(video => {
                  if (video !== localVideoRef.current) {
                    video.muted = true;
                  }
                });

                // 오디오 분석 중지
                stopAudioLevelAnalysis();
              }
            }
          }

          // 서버에 최종 상태 전송 (동기화 확인용)
          setTimeout(() => {
            if (socketRef.current) {
              socketRef.current.emit('toggle-video', { isVideoOn: finalStates.isVideoOn });
              socketRef.current.emit('toggle-audio', { isAudioOn: finalStates.isAudioOn });
              socketRef.current.emit('toggle-headset', { isHeadsetOn: finalStates.isHeadsetOn });
            }
          }, 100);

          console.log(`[클라이언트] 강제 제어 적용 완료: video=${finalStates.isVideoOn}, audio=${finalStates.isAudioOn}, headset=${finalStates.isHeadsetOn}`);
        }
      });

      newSocket.on('force-control-applied', ({ participants }) => {
        setParticipants(participants);
      });

      newSocket.on('force-kicked', ({ message, controllerName }) => {
        window.dispatchEvent(new CustomEvent('room-force-closed'));
      });

      newSocket.on('user-kicked', ({ participants, message, kickedSocketId }) => {
        setParticipants(participants);
        setMessages(prev => [...prev, message]);

        setPeerConnections(prev => {
          if (prev[kickedSocketId]) {
            prev[kickedSocketId].close();
            const updated = { ...prev };
            delete updated[kickedSocketId];
            peerConnectionsRef.current = updated;
            return updated;
          }
          return prev;
        });

        setRemoteStreams(prev => {
          const updated = { ...prev };
          delete updated[kickedSocketId];
          return updated;
        });
      });

      newSocket.on('force-control-error', (errorMessage) => {
        console.error('강제 제어 실패:', errorMessage);
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket, createPeerConnection, startCall, startAudioLevelAnalysis, stopAudioLevelAnalysis]);

  // 로컬 비디오 설정
  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => { });
    }
  }, [localStream]);

  // 로컬 스트림이 변경될 때 오디오 분석 시작
  useEffect(() => {
    if (localStreamRef.current && participants.length > 0) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        startAudioLevelAnalysis();
      }
    }

    return () => {
      stopAudioLevelAnalysis();
    };
  }, [localStream, participants.length, startAudioLevelAnalysis, stopAudioLevelAnalysis]);

  // 상태와 ref 동기화
  useEffect(() => {
    isVideoOnRef.current = isVideoOn;
  }, [isVideoOn]);

  useEffect(() => {
    isAudioOnRef.current = isAudioOn;
  }, [isAudioOn]);

  useEffect(() => {
    isHeadsetOnRef.current = isHeadsetOn;
  }, [isHeadsetOn]);

  // 비디오 토글
  const handleToggleVideo = async () => {
    if (isVideoForcedOff) {
      return;
    }

    if (!localStreamRef.current) {
      const stream = await getLocalStream(selectedVideoDevice, selectedAudioInput);
      if (!stream) return;
    }

    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const newVideoState = !isVideoOn;
        videoTrack.enabled = newVideoState;
        setIsVideoOn(newVideoState);
        isVideoOnRef.current = newVideoState;

        if (socketRef.current) {
          socketRef.current.emit('toggle-video', { isVideoOn: newVideoState });
        }

        playAllVideos();
      }
    }
  };

  // 오디오 토글
  const handleToggleAudio = async () => {
    if (isAudioForcedOff) {
      return;
    }

    if (!isHeadsetOn) return;

    if (!localStreamRef.current) {
      const stream = await getLocalStream(selectedVideoDevice, selectedAudioInput);
      if (!stream) return;
    }

    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const newAudioState = !isAudioOn;
        audioTrack.enabled = newAudioState;
        setIsAudioOn(newAudioState);
        isAudioOnRef.current = newAudioState;

        if (socketRef.current) {
          socketRef.current.emit('toggle-audio', { isAudioOn: newAudioState });
        }

        // 오디오 분석 상태 업데이트
        if (newAudioState) {
          startAudioLevelAnalysis();
        } else {
          stopAudioLevelAnalysis();
        }

        playAllVideos();
      }
    }
  };

  // 헤드셋 토글
  const handleToggleHeadset = async () => {
    if (isHeadsetForcedOff) {
      return;
    }

    const newHeadsetState = !isHeadsetOn;
    setIsHeadsetOn(newHeadsetState);
    isHeadsetOnRef.current = newHeadsetState;

    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];

      if (newHeadsetState) {
        if (audioTrack) {
          await applyHighQualityAudioSettings(audioTrack);
          audioTrack.enabled = previousAudioState;
          setIsAudioOn(previousAudioState);
          isAudioOnRef.current = previousAudioState;

          if (socketRef.current) {
            socketRef.current.emit('toggle-audio', { isAudioOn: previousAudioState });
          }

          // 오디오 분석 재시작
          if (previousAudioState) {
            startAudioLevelAnalysis();
          }
        }

        document.querySelectorAll('video').forEach(video => {
          if (video !== localVideoRef.current) {
            video.muted = false;
            if (video.setSinkId && selectedAudioOutput) {
              video.setSinkId(selectedAudioOutput).catch(console.warn);
            }
          }
        });
      } else {
        setPreviousAudioState(isAudioOn);

        if (audioTrack) {
          await applyVoiceOptimizedSettings(audioTrack);
          audioTrack.enabled = false;
          setIsAudioOn(false);
          isAudioOnRef.current = false;

          if (socketRef.current) {
            socketRef.current.emit('toggle-audio', { isAudioOn: false });
          }

          // 오디오 분석 중지
          stopAudioLevelAnalysis();
        }

        document.querySelectorAll('video').forEach(video => {
          if (video !== localVideoRef.current) {
            video.muted = true;
          }
        });
      }
    }

    // 헤드셋 상태를 서버에 전송
    if (socketRef.current) {
      socketRef.current.emit('toggle-headset', { isHeadsetOn: newHeadsetState });
    }

    playAllVideos();
  };

  // 방 존재 확인
  const checkRoomExists = async (roomId) => {
    return new Promise((resolve) => {
      if (socketRef.current) {
        socketRef.current.emit('check-room', roomId);
        socketRef.current.once('room-info', (roomInfo) => {
          resolve(roomInfo);
        });
        socketRef.current.once('room-not-found', () => {
          resolve(null);
        });
      } else {
        resolve(null);
      }
    });
  };

  // 방 생성
  const createRoom = async (roomData) => {
    return new Promise((resolve) => {
      if (socketRef.current) {
        setError('');

        socketRef.current.emit('create-room', roomData);

        socketRef.current.once('room-created', async ({ roomId, roomInfo }) => {
          socketRef.current.emit('join-room', {
            username: roomData.creator,
            roomCode: roomId,
            password: roomData.password || ''
          });

          resolve({
            roomId,
            roomInfo: {
              ...roomInfo,
              name: roomData.name,
              description: roomData.description
            }
          });
        });

        socketRef.current.once('create-error', (errorMessage) => {
          setError(errorMessage);
          resolve(null);
        });
      } else {
        resolve(null);
      }
    });
  };

  // 방 참여
  const joinRoom = async (inputUsername, inputRoomCode, password = '') => {
    if (socketRef.current) {
      setError('');

      return new Promise((resolve) => {
        socketRef.current.emit('join-room', {
          username: inputUsername,
          roomCode: inputRoomCode,
          password: password
        });

        socketRef.current.once('room-joined', () => {
          resolve(true);
        });

        socketRef.current.once('join-error', () => {
          resolve(false);
        });
      });
    }
    return false;
  };

  // 메시지 전송
  const sendMessage = (message) => {
    if (socketRef.current && message.trim()) {
      socketRef.current.emit('send-message', message);
    }
  };

  // 방 설정 업데이트
  const updateRoomSettings = async (settings) => {
    return new Promise((resolve, reject) => {
      if (socketRef.current) {
        socketRef.current.emit('update-room-settings', settings);

        socketRef.current.once('room-settings-updated', (updatedRoomInfo) => {
          resolve(updatedRoomInfo);
        });

        socketRef.current.once('update-room-error', (errorMessage) => {
          setError(errorMessage);
          reject(new Error(errorMessage));
        });
      } else {
        reject(new Error('연결이 끊어졌습니다.'));
      }
    });
  };

  // 방 삭제
  const deleteRoom = async () => {
    return new Promise((resolve, reject) => {
      if (socketRef.current) {
        socketRef.current.emit('delete-room');

        socketRef.current.once('room-deleted', () => {
          resolve();
        });

        socketRef.current.once('delete-room-error', (errorMessage) => {
          setError(errorMessage);
          reject(new Error(errorMessage));
        });
      } else {
        reject(new Error('연결이 끊어졌습니다.'));
      }
    });
  };

  // 방 나가기
  const leaveRoom = () => {
    // 오디오 분석 중지
    stopAudioLevelAnalysis();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    Object.entries(peerConnectionsRef.current).forEach(([, pc]) => {
      if (pc) pc.close();
    });

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setSocket(null);
    setLocalStream(null);
    localStreamRef.current = null;
    setPeerConnections({});
    peerConnectionsRef.current = {};
    setRemoteStreams({});
    setParticipants([]);
    setMessages([]);
    setError('');
    setIsVideoOn(false);
    setIsAudioOn(false);
    setIsHeadsetOn(true);
    setPreviousAudioState(false);
    setCurrentUserSocketId('');
    setIsVideoForcedOff(false);
    setIsAudioForcedOff(false);
    setIsHeadsetForcedOff(false);
  };

  return {
    socket,
    participants,
    messages,
    error,
    localStream,
    remoteStreams,
    peerConnections,
    isVideoOn,
    isAudioOn,
    isHeadsetOn,
    localVideoRef,
    playAllVideos,
    currentUserSocketId,
    selectedVideoDevice,
    selectedAudioInput,
    selectedAudioOutput,
    checkRoomExists,
    createRoom,
    joinRoom,
    sendMessage,
    leaveRoom,
    updateRoomSettings,
    deleteRoom,
    handleToggleVideo,
    handleToggleAudio,
    handleToggleHeadset,
    handleDeviceChange,
    setError,
    updateUserStatus,
    forceControl,
    isVideoForcedOff,
    isAudioForcedOff,
    isHeadsetForcedOff
  };
};