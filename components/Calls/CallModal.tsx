"use client";

import { useCall } from "@/context/CallContext";
import { Mic, MicOff, Phone, Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function CallModal() {
    const {
        callState,
        endCall,
        answerCall,
        localStream,
        remoteStream,
        currentCaller,
        isMuted,
        toggleMute,
        isVideoOff,
        toggleVideo
    } = useCall();

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState(0);
    const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, callState, isVideoOff]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            // Check if remote stream has active video tracks
            const videoTracks = remoteStream.getVideoTracks();
            setHasRemoteVideo(videoTracks.length > 0 && videoTracks[0].enabled);

            // Listen for track changes (optional, but good for mute sync if PeerJS supported it easily)
            // For now, initial check is good enough for "Audio Call" mode.
        } else {
            setHasRemoteVideo(false);
        }
    }, [remoteStream, callState]);

    // Timer for active call
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (callState === 'connected') {
            interval = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            setDuration(0);
        }
        return () => clearInterval(interval);
    }, [callState]);

    // Format duration mm:ss | hh:mm:ss
    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (callState === 'idle') return null;

    return (
        <div className="call-overlay">
            {/* Background Blurs */}
            <div className="bg-gradient" />

            <div className="call-container">
                {/* INCOMING CALL SCREEN */}
                {callState === 'incoming' && (
                    <div className="incoming-screen">
                        <div className="avatar-pulse">
                            <div className="avatar-initial">
                                {currentCaller?.charAt(0).toUpperCase()}
                            </div>
                            <div className="pulse-ring ring-1" />
                            <div className="pulse-ring ring-2" />
                        </div>

                        <div className="caller-info">
                            <h2>{currentCaller}</h2>
                            <p>Incoming Call...</p>
                        </div>

                        <div className="actions-row">
                            <button onClick={endCall} className="btn-action decline">
                                <Phone size={32} />
                            </button>
                            <button onClick={answerCall} className="btn-action accept">
                                <Phone size={32} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ACTIVE / CALLING SCREEN */}
                {(callState === 'calling' || callState === 'connected') && (
                    <div className="active-call-screen">
                        {/* Remote Video (Full Screen) */}
                        <div className="remote-video-container">
                            {remoteStream && (
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className="remote-video"
                                    style={{ display: hasRemoteVideo ? 'block' : 'none' }}
                                />
                            )}

                            {(!remoteStream || !hasRemoteVideo) && (
                                <div className="remote-placeholder">
                                    <div className="placeholder-avatar">
                                        {currentCaller?.charAt(0).toUpperCase() || <Video size={40} />}
                                    </div>
                                    <span className="status-text">
                                        {callState === 'calling' ? 'Calling...' : (hasRemoteVideo ? 'Connecting...' : 'Audio Call')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Top Bar (Caller Name & Timer) */}
                        <div className="top-bar">
                            <h3 className="caller-name">{currentCaller}</h3>
                            {callState === 'connected' && (
                                <span className="call-timer">{formatDuration(duration)}</span>
                            )}
                        </div>

                        {/* Local Video (PiP) */}
                        <div className="local-pip">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="local-video"
                                style={{ display: isVideoOff ? 'none' : 'block' }}
                            />
                            {isVideoOff && (
                                <div style={{
                                    width: '100%', height: '100%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#333', color: 'white'
                                }}>
                                    <VideoOff size={32} />
                                </div>
                            )}
                        </div>

                        {/* Bottom Controls */}
                        <div className="controls-bar">
                            <button
                                onClick={toggleMute}
                                className={`control-btn ${isMuted ? 'active-red' : ''}`}
                            >
                                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                            </button>

                            <button
                                onClick={endCall}
                                className="control-btn end-call"
                            >
                                <Phone size={28} />
                            </button>

                            <button
                                onClick={toggleVideo}
                                className={`control-btn ${isVideoOff ? 'active-red' : ''}`}
                            >
                                {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                /* Overlay & Container */
                .call-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    background-color: #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: var(--font-geist-sans), sans-serif;
                    overflow: hidden;
                }
                
                .bg-gradient {
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at 50% 30%, #1e1e2e 0%, #000 70%);
                    opacity: 0.8;
                }

                .call-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    max-width: 100%;
                    background: transparent;
                    display: flex;
                    flex-direction: column;
                }

                /* Incoming Screen */
                .incoming-screen {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    gap: 3rem;
                    backdrop-filter: blur(10px);
                    animation: fadeIn 0.5s ease-out;
                }

                .caller-info {
                    text-align: center;
                }
                .caller-info h2 {
                    font-size: 2.5rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    text-shadow: 0 4px 12px rgba(0,0,0,0.5);
                }
                .caller-info p {
                    font-size: 1.1rem;
                    opacity: 0.7;
                    letter-spacing: 0.5px;
                }

                .avatar-pulse {
                    position: relative;
                    width: 120px;
                    height: 120px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .avatar-initial {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 3rem;
                    font-weight: 700;
                    color: white;
                    z-index: 2;
                    box-shadow: 0 10px 25px rgba(37, 99, 235, 0.5);
                }
                .pulse-ring {
                    position: absolute;
                    border-radius: 50%;
                    border: 2px solid rgba(59, 130, 246, 0.5);
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    animation: ripple 2s infinite;
                }
                .ring-1 { width: 100%; height: 100%; animation-delay: 0s; }
                .ring-2 { width: 100%; height: 100%; animation-delay: 0.6s; }

                .actions-row {
                    display: flex;
                    gap: 4rem;
                    margin-top: 1rem;
                }
                .btn-action {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: white;
                    transition: transform 0.2s, box-shadow 0.2s;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.3);
                }
                .btn-action:hover {
                    transform: scale(1.1);
                    box-shadow: 0 12px 25px rgba(0,0,0,0.4);
                }
                .btn-action.decline {
                    background-color: #ef4444;
                }
                .btn-action.decline svg {
                    transform: rotate(135deg);
                }
                .btn-action.accept {
                    background-color: #10b981;
                    animation: shake 3s infinite;
                }

                /* Active Call Screen */
                .active-call-screen {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    background: #000;
                }

                .remote-video-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .remote-video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .remote-placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                    color: rgba(255,255,255,0.6);
                }
                .placeholder-avatar {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.5rem;
                    color: white;
                    backdrop-filter: blur(10px);
                }

                .top-bar {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    padding: 40px 20px;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
                    text-align: center;
                    color: white;
                    z-index: 10;
                    pointer-events: none;
                }
                .caller-name {
                    font-size: 1.5rem;
                    font-weight: 600;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
                }
                .call-timer {
                    display: block;
                    margin-top: 4px;
                    font-family: monospace;
                    opacity: 0.8;
                    font-size: 0.9rem;
                }

                .local-pip {
                    position: absolute;
                    bottom: 120px;
                    right: 20px;
                    width: 160px;
                    aspectRatio: 9/16;
                    background: #1a1a1a;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.15);
                    z-index: 20;
                    transition: all 0.3s ease;
                }
                @media (min-width: 768px) {
                    .local-pip {
                        width: 200px;
                        right: 30px;
                        bottom: 130px;
                    }
                }
                .local-video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .controls-bar {
                    position: absolute;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    gap: 1.5rem;
                    padding: 16px 32px;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 100px;
                    z-index: 30;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                }

                .control-btn {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    border: none;
                    background: rgba(255, 255, 255, 0.15);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .control-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: translateY(-2px);
                }
                .control-btn.active-red {
                    background: white;
                    color: #ef4444;
                }
                .control-btn.end-call {
                    background: #ef4444;
                    width: 64px;
                    height: 64px;
                    margin: -4px 10px; /* Make it slightly larger and popped out */
                }
                .control-btn.end-call svg {
                    transform: rotate(135deg);
                }
                .control-btn.end-call:hover {
                    background: #dc2626;
                }

                /* Animations */
                @keyframes ripple {
                    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes shake {
                    0%, 100% { transform: rotate(0deg); }
                    10%, 30%, 50%, 70%, 90% { transform: rotate(-5deg); }
                    20%, 40%, 60%, 80% { transform: rotate(5deg); }
                }
            `}</style>
        </div>
    );
}
