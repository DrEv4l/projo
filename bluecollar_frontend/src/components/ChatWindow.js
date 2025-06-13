// src/components/ChatWindow.js
import React, { useState, useEffect, useRef, } from 'react';
import { useAuth } from '../context/AuthContext';

const ChatWindow = ({ roomName, currentUserId /* Pass currentUserId from App.js/ChatPage */ }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  // const [socket, setSocket] = useState(null); // We might not need socket in state if we manage via ref for this pattern
  const socketRef = useRef(null); // Use a ref to hold the socket instance
  const [isConnected, setIsConnected] = useState(false); // For UI feedback
  const [socketError, setSocketError] = useState(null);
  const { accessToken, user } = useAuth();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // The connectWebSocket function is now just a setup, doesn't need to be in useCallback as much
  // if its dependencies are stable or managed by the outer useEffect.
  useEffect(() => {
    if (!roomName || !accessToken) {
      console.log("Room name or access token missing, not connecting WebSocket.");
      setIsConnected(false);
      return;
    }

    // const wsUrl = `ws://127.0.0.1:8000/ws/chat/${roomName}/`;
    // FOR TESTING AUTHENTICATION (as per our previous discussion on WebSocket auth):
    const wsUrl = `ws://127.0.0.1:8000/ws/chat/${roomName}/?token=${accessToken}`;
    console.log(`Attempting to connect to WebSocket: ${wsUrl}`);

    const newSocket = new WebSocket(wsUrl);
    socketRef.current = newSocket; // Store in ref

    newSocket.onopen = () => {
      console.log('WebSocket Connected to room:', roomName);
      setIsConnected(true);
      setSocketError(null);
    };

    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Message from server:', data);
      setMessages((prevMessages) => [...prevMessages, data]);
    };

    newSocket.onclose = (event) => {
      console.warn('WebSocket Disconnected:', event.reason, event.code);
      setIsConnected(false);
      if (socketRef.current && event.target === socketRef.current) { // Ensure it's our current socket closing
        socketRef.current = null; // Clear the ref if this socket instance closed
      }
      // Optional: Reconnection logic
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setIsConnected(false);
      setSocketError('WebSocket connection error.');
    };

    // Cleanup function
    return () => {
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        console.log('Closing WebSocket from useEffect cleanup (due to unmount or dependency change).');
        newSocket.close();
      }
      socketRef.current = null; // Clear ref on cleanup too
    };
  }, [roomName, accessToken]); // Dependencies that trigger a new connection

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ message: newMessage }));
      setNewMessage('');
    } else {
      console.error("Socket not open or message empty");
      setSocketError('Cannot send message. Connection not open.');
    }
  };

  // Ensure 'user.id' or 'user.user_id' matches what your backend sends as 'sender_id'
  const actualCurrentUserId = currentUserId || (user ? (user.id || user.user_id) : null);


  if (!user) return <p>Please log in to chat.</p>; // Or use !accessToken for a stricter check
  if (!roomName) return <p>Chat room not specified.</p>;

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', height: '500px', display: 'flex', flexDirection: 'column' }}>
      <h3>Chat Room: {roomName.replace(/_/g, ' ')} ({isConnected ? 'Connected' : 'Disconnected'})</h3>
      {socketError && <p style={{color: 'red'}}>{socketError}</p>}
      <div style={{ flexGrow: 1, overflowY: 'auto', border: '1px solid #eee', padding: '10px', marginBottom: '10px' }}>
        {messages.length === 0 && !socketError && isConnected && <p>No messages yet. Say hello!</p>}
        {messages.length === 0 && !socketError && !isConnected && <p>Attempting to connect...</p>}
        {messages.map((msg, index) => (
          // Ensure actualCurrentUserId is correctly derived
          <div key={msg.id || index} style={{ textAlign: msg.sender_id === actualCurrentUserId ? 'right' : 'left', marginBottom: '5px' }}>
            <div style={{
              display: 'inline-block',
              padding: '8px 12px',
              borderRadius: '15px',
              backgroundColor: msg.sender_id === actualCurrentUserId ? '#dcf8c6' : '#f0f0f0',
              maxWidth: '70%',
            }}>
              <strong>{msg.sender_username || `User ${msg.sender_id}`}: </strong> {/* Display sender_id if username is missing */}
              {msg.message}
              <div style={{ fontSize: '0.7em', color: '#888', textAlign: 'right' }}>
                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} style={{ display: 'flex' }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{ flexGrow: 1, padding: '10px', marginRight: '5px', borderRadius: '5px', border: '1px solid #ccc' }}
          disabled={!isConnected || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN}
        />
        <button type="submit" style={{ padding: '10px 15px', borderRadius: '5px' }} disabled={!isConnected || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN}>
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;