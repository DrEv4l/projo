// File: src/components/ChatWindow.js
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Form, Button, Card, Alert } from 'react-bootstrap';

const ChatWindow = ({ roomName, currentUserId }) => {
  const { accessToken, loadingAuth } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState(null);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (loadingAuth) {
      console.log("EFFECT: Auth is loading. Aborting connection attempt.");
      return;
    }
    if (!roomName || !accessToken) {
      console.log("EFFECT: Room name or token missing. Aborting connection attempt.");
      return;
    }
    if (socketRef.current) {
      console.log(`EFFECT: A socket instance already exists (state=${socketRef.current.readyState}). Aborting new connection.`);
      return;
    }

    const wsUrl = `ws://127.0.0.1:8000/ws/chat/${roomName}/?token=${accessToken}`;
    console.log(`EFFECT: Creating NEW WebSocket connection to: ${wsUrl}`);
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    setIsConnected(false);
    setSocketError(null);
    setMessages([]);

    socket.onopen = () => {
      console.log('✅ WebSocket Connected to room:', roomName);
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('✉️ Message from server:', data);
        if (data.type === 'message_history') {
          setMessages(data.messages || []);
        } else if (data.type === 'chat_message') {
          setMessages((prev) => [...prev, data]);
        } else if (data.type === 'error') {
          setSocketError(data.message);
        }
      } catch (e) { 
        console.error("❗️ Failed to parse server message:", e);
      }
    };

    socket.onclose = (event) => {
      console.warn('🔌 WebSocket Disconnected. Code:', event.code, 'Reason:', event.reason);
      setIsConnected(false);
      if (!event.wasClean) {
        setSocketError('Connection failed or was closed unexpectedly.');
      }
      socketRef.current = null;
    };

    socket.onerror = (error) => {
      console.error('❌ WebSocket Error:', error);
      setSocketError('A WebSocket error occurred. Please check server logs.');
    };

    return () => {
      console.log(`🧹 Component Unmounting. Cleaning up WebSocket for room: ${roomName}.`);
      if (socketRef.current) {
        socketRef.current.close(1000, "Component unmounting");
        socketRef.current = null;
      }
    };
  }, [roomName, accessToken, loadingAuth]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        const payload = { message: newMessage };
        const roomParts = roomName.split('_');
        if (roomName.startsWith('booking_') && roomParts.length === 2 && !isNaN(parseInt(roomParts[1]))) {
            payload.booking_id = roomParts[1];
        }
        socketRef.current.send(JSON.stringify(payload));
        setNewMessage('');
    } else {
        setSocketError('Cannot send message. Connection is not active.');
    }
  };

  if (loadingAuth) return <p>Loading session...</p>;
  if (!accessToken) return <p>Please log in to chat.</p>;
  
  return (
    <Card className="shadow-sm" style={{ height: '600px' }}>
      <Card.Header as="h5" className="text-center">
        Chat: {roomName.replace(/_/g, ' ')} ({isConnected ? <span className="text-success">Connected</span> : <span className="text-danger">Disconnected</span>})
      </Card.Header>
      <Card.Body className="d-flex flex-column" style={{ overflowY: 'hidden' }}>
        {socketError && <Alert variant="danger" className="text-center py-2">{socketError}</Alert>}
        <div className="flex-grow-1 p-2" style={{ overflowY: 'auto' }}>
          {messages.map((msg) => (
            <div key={msg.id} className={`d-flex ${msg.is_self ? 'justify-content-end' : 'justify-content-start'} mb-2`}>
              <div className={`p-2 rounded`} style={{ backgroundColor: msg.is_self ? '#dcf8c6' : '#f0f0f0', maxWidth: '75%' }}>
                <strong className="d-block" style={{ fontSize: '0.9em' }}>{msg.sender_username}</strong>
                {msg.message}
                <div className="text-muted" style={{ fontSize: '0.7em', textAlign: 'right' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <Form onSubmit={handleSendMessage} className="mt-2 d-flex">
          <Form.Control 
            type="text" 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            placeholder="Type a message..." 
            disabled={!isConnected} 
            className="me-2" 
          />
          <Button type="submit" disabled={!isConnected || !newMessage.trim()}>
            Send
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ChatWindow;