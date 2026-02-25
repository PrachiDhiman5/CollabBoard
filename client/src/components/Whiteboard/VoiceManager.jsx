import React, { useEffect, useRef } from 'react';

const VoiceManager = ({ socket, roomId, user, participants, isMicOn }) => {
    const peersRef = useRef({}); // { socketId: RTCPeerConnection }
    const localStreamRef = useRef(null);
    const audioElementsRef = useRef({}); // { socketId: HTMLAudioElement }

    useEffect(() => {
        if (!socket) return;

        socket.on('webrtc-offer', async ({ from, offer }) => {
            const pc = createPeerConnection(from);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc-answer', { to: from, answer });
        });

        socket.on('webrtc-answer', async ({ from, answer }) => {
            const pc = peersRef.current[from];
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('webrtc-ice-candidate', async ({ from, candidate }) => {
            const pc = peersRef.current[from];
            if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on('update-participants', (users) => {
            if (isMicOn) {
                users.forEach(p => {
                    if (p.id !== socket.id && !peersRef.current[p.id]) {
                        initiateConnection(p.id);
                    }
                });
            }
        });

        return () => {
            socket.off('webrtc-offer');
            socket.off('webrtc-answer');
            socket.off('webrtc-ice-candidate');
            // Cleanup and close all peers if component unmounts
            Object.values(peersRef.current).forEach(pc => pc.close());
            localStreamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, [socket, isMicOn]);

    useEffect(() => {
        const handleMicToggle = async () => {
            if (isMicOn) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    localStreamRef.current = stream;
                    participants.forEach(p => {
                        if (p.id !== socket.id) initiateConnection(p.id);
                    });
                } catch (err) {
                    console.error("Mic access denied", err);
                }
            } else {
                localStreamRef.current?.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
                Object.values(peersRef.current).forEach(pc => pc.close());
                peersRef.current = {};
            }
        };
        handleMicToggle();
    }, [isMicOn]);

    const createPeerConnection = (targetSocketId) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        peersRef.current[targetSocketId] = pc;
        pc.onicecandidate = (event) => {
            if (event.candidate) socket.emit('webrtc-ice-candidate', { to: targetSocketId, candidate: event.candidate });
        };
        pc.ontrack = (event) => {
            if (!audioElementsRef.current[targetSocketId]) {
                const audio = new Audio();
                audio.srcObject = event.streams[0];
                audio.play().catch(e => console.error("Audio play failed", e));
                audioElementsRef.current[targetSocketId] = audio;
            }
        };
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
        return pc;
    };

    const initiateConnection = async (targetSocketId) => {
        const pc = createPeerConnection(targetSocketId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { to: targetSocketId, offer });
    };

    return null;
};

export default VoiceManager;
