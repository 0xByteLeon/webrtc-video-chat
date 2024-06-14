const socket = io();

socket.on('connect', () => {
    console.log('Successfully connected to the server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from the server');
});

socket.on('user-connected', (userId) => {
    console.log('User connected:', userId);
    handleUserConnected(userId);
});

socket.on('signal', (signal) => {
    console.log('Received signal:', signal);
    handleSignal(signal);
});

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        const localVideo = document.getElementById('localVideo');
        localVideo.srcObject = stream;

        const peerConnection = new RTCPeerConnection();

        // 监听连接状态变化
        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state change:', peerConnection.connectionState);
            switch (peerConnection.connectionState) {
                case 'connected':
                    console.log('Peers connected!');
                    break;
                case 'disconnected':
                case 'failed':
                    console.log('Connection failed or disconnected!');
                    break;
                case 'closed':
                    console.log('Connection closed!');
                    break;
            }
        };

        // 监听ICE连接状态变化
        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state changed:', peerConnection.iceConnectionState);
            if (peerConnection.iceConnectionState === 'disconnected' || peerConnection.iceConnectionState === 'failed') {
                console.log('ICE connection failed or disconnected!');
            }
        };

        // 监听信令状态变化
        peerConnection.onsignalingstatechange = () => {
            console.log('Signaling state changed:', peerConnection.signalingState);
        };

        // 监听轨道事件
        peerConnection.ontrack = event => {
            console.log('Remote track received:', event.streams[0]);
            const remoteVideo = document.getElementById('remoteVideo');
            remoteVideo.srcObject = event.streams[0];
        };

        stream.getTracks().forEach(track => {
            console.log('Adding local track:', track);
            peerConnection.addTrack(track, stream);
        });

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                console.log('Sending ICE candidate:', event.candidate);
                socket.emit('signal', {
                    type: 'candidate',
                    candidate: event.candidate,
                    roomId: roomId,
                    from: socket.id,
                    to: otherUserId // 使用实际的其他用户ID
                });
            } else {
                console.log('All ICE candidates have been sent');
            }
        };

        const roomId = 'default-room';
        socket.emit('join-room', roomId);
        console.log("Joined room:", roomId);

        window.peerConnection = peerConnection;
    })
    .catch(error => {
        console.error('Error accessing media devices:', error);
    });

function handleUserConnected(userId) {
    console.log('User connected:', userId);
    window.otherUserId = userId;

    const peerConnection = window.peerConnection;
    peerConnection.createOffer()
        .then(offer => {
            console.log('Creating offer:', offer);
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            socket.emit('signal', {
                type: 'offer',
                sdp: peerConnection.localDescription,
                roomId: 'default-room',
                from: socket.id,
                to: userId
            });
        })
        .catch(error => console.error('Error creating offer:', error));
}

function handleSignal(signal) {
    const peerConnection = window.peerConnection;

    if (signal.type === 'offer') {
        console.log('Received offer:', signal.sdp);
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp))
            .then(() => {
                return peerConnection.createAnswer();
            })
            .then(answer => {
                console.log('Creating answer:', answer);
                return peerConnection.setLocalDescription(answer);
            })
            .then(() => {
                socket.emit('signal', {
                    type: 'answer',
                    sdp: peerConnection.localDescription,
                    roomId: signal.roomId,
                    from: socket.id,
                    to: signal.from
                });
            })
            .catch(error => console.error('Error handling offer:', error));
    } else if (signal.type === 'answer') {
        console.log('Received answer:', signal.sdp);
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp))
            .catch(error => console.error('Error setting remote description:', error));
    } else if (signal.type === 'candidate') {
        console.log('Received ICE candidate:', signal.candidate);
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate))
            .catch(error => console.error('Error adding received ICE candidate', error));
    }
}