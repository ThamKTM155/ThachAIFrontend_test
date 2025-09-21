import React, { useState, useRef, useEffect } from 'react'
import './App.css'

export default function ChatBox() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Backend base URL từ Vite env: VITE_API_URL
  const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'
  const CHAT_URL = `${API_BASE.replace(/\/$/, '')}/chat`

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Khởi tạo SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('Trình duyệt không hỗ trợ Web Speech API')
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = 'vi-VN'
    rec.continuous = false
    rec.interimResults = false

    rec.onresult = (e) => {
      const text = e.results[0][0].transcript
      handleSend(text, true)
    }
    rec.onend = () => setListening(false)
    rec.onerror = (err) => {
      console.error('SpeechRecognition error', err)
      setListening(false)
    }
    recognitionRef.current = rec
  }, [])

  const handleSend = async (text, fromVoice = false) => {
    if (!text || !text.trim()) return
    setMessages(prev => [...prev, { sender: 'Bạn', text }])
    if (!fromVoice) setInput('')

    // Gọi backend
    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      })
      const data = await res.json()
      const reply = data.reply || `ThamAI (giả lập) nhận: ${text}`
      setMessages(prev => [...prev, { sender: 'ThamAI', text: reply }])

      // TTS
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(reply)
        u.lang = 'vi-VN'
        window.speechSynthesis.speak(u)
      }
    } catch (err) {
      console.error('Lỗi gọi backend', err)
      const fallback = `ThamAI (offline) đã nhận: ${text}`
      setMessages(prev => [...prev, { sender: 'ThamAI', text: fallback }])
    }
  }

  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Trình duyệt không hỗ trợ nhận diện giọng nói')
      return
    }
    setListening(true)
    recognitionRef.current.start()
  }

  return (
    <div className="chatbox-wrapper">
      <div className="chatbox">
        <div className="messages">
          {messages.map((m, i) => (
            <div key={i} className={m.sender === 'Bạn' ? 'msg user' : 'msg bot'}>
              <strong>{m.sender}:</strong> {m.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="controls">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="Nhập tin nhắn..."
          />
          <button onClick={() => handleSend(input)}>Gửi</button>
          <button className={listening ? 'mic active' : 'mic'} onClick={startListening}>🎤</button>
        </div>
      </div>
    </div>
  )
}
