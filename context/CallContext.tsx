"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Peer, { MediaConnection } from 'peerjs';

interface CallContextType {
    callState: 'idle' | 'calling' | 'incoming' | 'connected';
    startCall: (remoteEmail: string, video?: boolean) => void;
    answerCall: () => void;
    endCall: () => void;
    localStream: MediaStream | undefined;
    remoteStream: MediaStream | undefined;
    currentCaller: string;
    isMuted: boolean;
    toggleMute: () => void;
    isVideoOff: boolean;
    toggleVideo: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

// Helper to sanitize email to a safe Peer ID
// e.g. "mukesh.g@example.com" -> "mukesh-g-example-com"
export const getPeerId = (email: string) => {
    return email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
};

// Declare global to persist Peer instance across HMR
declare global {
    interface Window {
        existingPeer: Peer | undefined;
    }
}

import { logCall } from '@/actions/callActions';

export function CallProvider({ children, user }: { children: React.ReactNode, user: any }) {
    const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
    const [localStream, setLocalStream] = useState<MediaStream>();
    const [remoteStream, setRemoteStream] = useState<MediaStream>();
    const [currentCaller, setCurrentCaller] = useState("");
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const peerRef = useRef<Peer | null>(null);
    const callRef = useRef<MediaConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const startTimeRef = useRef<Date | null>(null);
    const remoteEmailRef = useRef<string | null>(null);
    const callTypeRef = useRef<'audio' | 'video'>('video');
    const isCallerRef = useRef<boolean>(false);
    const retryCountRef = useRef<number>(0);

    // Initialize Peer with HMR support
    useEffect(() => {
        if (!user?.email) return;

        let peerInstance: Peer | null = null;
        const myPeerId = getPeerId(user.email);

        const initPeer = () => {
            // Check for existing global peer instance to reuse (HMR fix)
            if (typeof window !== 'undefined' && window.existingPeer && !window.existingPeer.destroyed && window.existingPeer.id === myPeerId) {
                console.log("Reusing existing PeerJS instance");
                peerInstance = window.existingPeer;
            } else {
                // Determine if we need to cleanup old one
                if (typeof window !== 'undefined' && window.existingPeer) {
                    window.existingPeer.destroy();
                }

                console.log("Creating new PeerJS instance");
                const peer = new Peer(myPeerId, {
                    debug: 1
                });

                peer.on('open', (id) => {
                    console.log('My PeerJS ID is:', id);
                    retryCountRef.current = 0;
                });

                if (typeof window !== 'undefined') window.existingPeer = peer;
                peerInstance = peer;
            }

            peerRef.current = peerInstance;

            // Ensure we are connected if reusing
            if (peerInstance.disconnected) {
                console.log("Peer reused but disconnected. Reconnecting...");
                peerInstance.reconnect();
            }

            console.log("PeerJS active. ID:", peerInstance.id);

            // Remove previous listeners to prevent accumulation/stale closures
            // We cast to any because Typescript definitions for PeerJS might be incomplete regarding .off()
            try {
                (peerInstance as any).off('call');
                (peerInstance as any).off('error');
                (peerInstance as any).off('disconnected');
            } catch (e) {
                console.warn("Retrying removing listeners failed", e);
            }

            // Handle Incoming Call
            peerInstance.on('call', (call) => {
                console.log("Receiving call from", call.peer);
                setCurrentCaller(call.metadata?.callerName || call.peer);
                remoteEmailRef.current = call.metadata?.callerEmail;
                callTypeRef.current = call.metadata?.type || 'video';
                isCallerRef.current = false;
                setCallState('incoming');
                callRef.current = call;

                call.on('close', () => {
                    cleanupCall();
                });

                call.on('error', (err) => {
                    console.error("Call error:", err);
                    cleanupCall();
                });
            });

            // Handle connection errors
            peerInstance.on('error', (err: any) => {
                if (err.type === 'peer-unavailable') {
                    setCallState('idle');
                } else if (err.type === 'unavailable-id') {
                    console.error(`Peer ID taken. Retrying (${retryCountRef.current + 1}/3)...`);

                    try {
                        if (peerInstance && !peerInstance.destroyed) peerInstance.destroy();
                    } catch (e) { console.warn("Destroy failed", e); }

                    if (typeof window !== 'undefined') window.existingPeer = undefined;

                    if (retryCountRef.current < 3) {
                        retryCountRef.current++;
                        setTimeout(() => {
                            initPeer();
                        }, 3000);
                    } else {
                        console.error("Giving up on Peer connection. User might be active in another tab.");
                    }
                } else if (err.type === 'network') {
                    // Network error
                }
            });

            peerInstance.on('disconnected', () => {
                console.warn("PeerJS disconnected. Attempting to reconnect...");
                peerInstance?.reconnect();
            });
        };

        // Run immediately
        initPeer();

        return () => {
            // On unmount, strip listeners but DO NOT destroy peer (allows HMR to reuse it)
            // Unless user changed (handled by useEffect deps)
            if (peerInstance) {
                (peerInstance as any).off('call');
                (peerInstance as any).off('error');
                (peerInstance as any).off('disconnected');
            }
            // peerInstance.destroy(); // disabled for HMR
            peerRef.current = null;
        };
    }, [user?.email]);

    const cleanupCall = () => {
        if (callState === 'connected' && startTimeRef.current && user?.email && remoteEmailRef.current) {
            const endTime = new Date();
            logCall({
                caller: isCallerRef.current ? user.email : remoteEmailRef.current!,
                receiver: isCallerRef.current ? remoteEmailRef.current! : user.email,
                type: callTypeRef.current,
                status: 'completed',
                startTime: startTimeRef.current,
                endTime: endTime
            });
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (callRef.current) {
            callRef.current.close();
        }
        setCallState('idle');
        setLocalStream(undefined);
        setRemoteStream(undefined);
        setCurrentCaller("");
        callRef.current = null;
        localStreamRef.current = null;
        startTimeRef.current = null;
        remoteEmailRef.current = null;
    };

    const startCall = async (remoteEmail: string, video = true) => {
        // Check for secure context support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("WebRTC Not Supported: Accessing camera/microphone requires a secure context (HTTPS or localhost). You appear to be on an insecure HTTP connection.\n\nTry opening http://localhost:3000");
            return;
        }

        try {
            setCallState('calling');
            const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });

            setLocalStream(stream);
            localStreamRef.current = stream;

            // Sync UI state with requested media type
            setIsVideoOff(!video);

            const remotePeerId = getPeerId(remoteEmail);
            console.log("Calling peer:", remotePeerId);

            if (!peerRef.current) return;

            // Pass metadata so receiver knows who is calling and type
            const call = peerRef.current.call(remotePeerId, stream, {
                metadata: {
                    callerName: user.name || user.email,
                    callerEmail: user.email,
                    type: video ? 'video' : 'audio'
                }
            });
            remoteEmailRef.current = remoteEmail;
            callTypeRef.current = video ? 'video' : 'audio';
            isCallerRef.current = true;

            callRef.current = call;

            call.on('stream', (remoteStream) => {
                setRemoteStream(remoteStream);
                setCallState('connected');
                startTimeRef.current = new Date();
            });

            call.on('close', () => cleanupCall());
            call.on('error', () => cleanupCall());

        } catch (err: any) {
            console.error("Failed to get local stream", err);
            setCallState('idle');

            // Handle specific errors
            if (err.name === 'NotReadableError') {
                alert("Camera/Microphone is in use by another application.\n\nTip: If you are testing in two tabs on the same device, one tab might be hogging the camera. Try closing one tab or use Audio-only call.");
            } else if (err.name === 'NotAllowedError') {
                alert("Permission Denied: You must allow camera/microphone access in your browser settings.");
            } else if (err.name === 'NotFoundError') {
                alert("No Camera/Microphone found on this device.");
            } else {
                const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                let msg = `Could not access media: ${err.name || err.message}`;
                if (!isSecure) {
                    msg += `\n\nERROR: Insecure context detected. WebRTC requires HTTPS or localhost.`;
                }
                alert(msg);
            }
        }
    };

    const answerCall = async () => {
        if (!callRef.current) return;

        // Check for secure context support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("WebRTC Not Supported: Accessing camera/microphone requires a secure context (HTTPS or localhost). You appear to be on an insecure HTTP connection.");
            cleanupCall();
            return;
        }

        try {
            // Determine call type from metadata
            const callType = callRef.current.metadata?.type || 'video';
            const isVideoCall = callType === 'video';

            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true });

            setLocalStream(stream);
            localStreamRef.current = stream;
            setIsVideoOff(!isVideoCall); // Sync UI state

            callRef.current.answer(stream);
            setCallState('connected');
            startTimeRef.current = new Date();

            callRef.current.on('stream', (remoteStream) => {
                setRemoteStream(remoteStream);
            });

        } catch (err: any) {
            console.error("Failed to answer call", err);
            cleanupCall();
            alert(`Failed to access media for answering: ${err.name || err.message}`);
        }
    };

    const endCall = () => {
        cleanupCall();
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    return (
        <CallContext.Provider value={{
            callState,
            startCall,
            answerCall,
            endCall,
            localStream,
            remoteStream,
            currentCaller,
            isMuted,
            toggleMute,
            isVideoOff,
            toggleVideo
        }}>
            {children}
        </CallContext.Provider>
    );
}

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) throw new Error("useCall must be used within a CallProvider");
    return context;
};
