import React, { useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const VoiceManager = ({ socket, roomId, user, participants, isMicOn }) => {
    const peersRef = useRef({});
    const localStreamRef = useRef(null);
    const audioElementsRef = useRef({});
    const isMicOnRef = useRef(isMicOn);
    const participantsRef = useRef(participants);

    useEffect(() => {
        isMicOnRef.current = isMicOn;
    }, [isMicOn]);

    useEffect(() => {
        participantsRef.current = participants;
    }, [participants]);

    const cleanupPeer = useCallback((socketId) => {
        const pc = peersRef.current[socketId];
        if (pc) {
            pc.close();
            delete peersRef.current[socketId];
        }
        const audio = audioElementsRef.current[socketId];
        if (audio) {
            audio.pause();
            audio.srcObject = null;
            delete audioElementsRef.current[socketId];
        }
    }, []);

    const createPeerConnection = useCallback((targetSocketId) => {
        if (!socket || peersRef.current[targetSocketId]) return peersRef.current[targetSocketId];

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peersRef.current[targetSocketId] = pc;

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc-ice-candidate', { to: targetSocketId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            if (!audioElementsRef.current[targetSocketId]) {
                const audio = new Audio();
                audio.autoplay = true;
                audio.playsInline = true;
                audio.srcObject = event.streams[0];
                audio.play().catch((e) => console.error('Audio play failed', e));
                audioElementsRef.current[targetSocketId] = audio;
            }
        };

        const stream = localStreamRef.current;
        if (stream) {
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        }

        return pc;
    }, [socket]);

    const initiateConnection = useCallback(async (targetSocketId) => {
        if (!socket || targetSocketId === socket.id) return;
        if (!localStreamRef.current) return;
        try {
            const pc = createPeerConnection(targetSocketId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('webrtc-offer', { to: targetSocketId, offer });
        } catch (e) {
            console.error('Voice offer failed', e);
        }
    }, [socket, createPeerConnection]);

    const connectToAllPeers = useCallback(() => {
        if (!socket || !isMicOnRef.current || !localStreamRef.current) return;
        (participantsRef.current || []).forEach((p) => {
            const sid = p.socketId || p.id;
            if (sid && sid !== socket.id && !peersRef.current[sid]) {
                initiateConnection(sid);
            }
        });
    }, [socket, initiateConnection]);

    useEffect(() => {
        if (!socket) return;

        const onOffer = async ({ from, offer }) => {
            try {
                let pc = peersRef.current[from];
                if (!pc) {
                    pc = createPeerConnection(from);
                }
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('webrtc-answer', { to: from, answer });
            } catch (e) {
                console.error('Voice answer failed', e);
            }
        };

        const onAnswer = async ({ from, answer }) => {
            const pc = peersRef.current[from];
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        };

        const onIce = async ({ from, candidate }) => {
            const pc = peersRef.current[from];
            if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        };

        const onParticipants = () => {
            if (isMicOnRef.current) connectToAllPeers();
        };

        socket.on('webrtc-offer', onOffer);
        socket.on('webrtc-answer', onAnswer);
        socket.on('webrtc-ice-candidate', onIce);
        socket.on('update-participants', onParticipants);

        return () => {
            socket.off('webrtc-offer', onOffer);
            socket.off('webrtc-answer', onAnswer);
            socket.off('webrtc-ice-candidate', onIce);
            socket.off('update-participants', onParticipants);
        };
    }, [socket, createPeerConnection, connectToAllPeers]);

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            if (!socket) return;

            if (isMicOn) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    if (cancelled) {
                        stream.getTracks().forEach((t) => t.stop());
                        return;
                    }
                    localStreamRef.current = stream;
                    connectToAllPeers();
                } catch (err) {
                    console.error('Mic access denied', err);
                }
            } else {
                localStreamRef.current?.getTracks().forEach((t) => t.stop());
                localStreamRef.current = null;
                Object.keys(peersRef.current).forEach(cleanupPeer);
                Object.keys(audioElementsRef.current).forEach((id) => {
                    const a = audioElementsRef.current[id];
                    if (a) {
                        a.pause();
                        a.srcObject = null;
                    }
                });
                audioElementsRef.current = {};
            }
        };

        run();

        return () => {
            cancelled = true;
        };
    }, [socket, isMicOn, connectToAllPeers, cleanupPeer]);

    useEffect(() => {
        if (isMicOn && localStreamRef.current) {
            connectToAllPeers();
        }
    }, [participants, isMicOn, connectToAllPeers]);

    useEffect(() => () => {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        Object.keys(peersRef.current).forEach((id) => peersRef.current[id]?.close());
        peersRef.current = {};
        Object.values(audioElementsRef.current).forEach((a) => {
            a.pause();
            a.srcObject = null;
        });
        audioElementsRef.current = {};
    }, []);

    return null;
};

export default VoiceManager;
