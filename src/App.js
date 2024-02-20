import React, { useEffect, useRef, useState } from 'react';
import OpenAI from 'openai';
import { ethers } from 'ethers';
import { FaSpinner } from 'react-icons/fa';
import { IoIosSend } from "react-icons/io";

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

function App() {
  const [prompt, setPrompt] = useState('');
  const [chat, setChat] = useState([]);
  const [connected, setConnected] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const chatEndRef = useRef(null);
  const textAreaRef = useRef(null);

  const connect = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
  
    try {
      const address = await signer.getAddress().then(address => address.toLowerCase()); // Convert to lowercase to ensure case-insensitive comparison
      const authorizedAddresses = [
        process.env.REACT_APP_AUTH_ADDRESS_1.toLowerCase(),
        process.env.REACT_APP_AUTH_ADDRESS_2.toLowerCase()
      ];
      
      await signer.signMessage("Security check. Only cool people allowed.");
  
      if (authorizedAddresses.includes(address)) {
        setConnected(true);
        setAuthMessage('Welcome!'); 
      } else {
        setAuthMessage('Not authorized.'); 
        setConnected(false);
      }
    } catch (error) {
      console.error('Failed to connect', error);
      setAuthMessage('Failed to connect.');
    }
  };
  
  
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'inherit';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [prompt]);
  

 const generate = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setPrompt('');
  
    const systemMessage = `You are a helpful assistant with an emphasis on writing code.`;
    
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        model: 'gpt-4',
      });
  
      setChat([...chat, { role: 'user', content: prompt }, { role: 'assistant', content: completion.choices[0].message.content }]);
    } catch (error) {
      console.error('Failed to generate', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); 
      generate();
    }
  };

  const parseContent = (content) => {
    const regex = /```[\s\S]+?```/g;
    let result = [];
    let lastIndex = 0;

    content.replace(regex, (match, index) => {
      if (index > lastIndex) {
        result.push({ type: 'text', content: content.slice(lastIndex, index) });
      }
      result.push({ type: 'code', content: match.slice(3, -3) });
      lastIndex = index + match.length;
    });

    if (lastIndex < content.length) {
      result.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return result;
  };

  return (
    <div className="App">
       {isLoading && <div className="loading-spinner"><FaSpinner className="spinner" /></div>}
      
       {!connected && (
      <>
        <div className="connect">
          <button onClick={connect}>Connect</button>
        </div>
        {authMessage && <p>{authMessage}</p>}
      </>
    )}
      {connected && (
      <>
      <div className="chat-history">
      {chat.map((message, index) => (
        <div key={index} className={`message ${message.role}`}>
          {parseContent(message.content).map((segment, idx) =>
            segment.type === 'code' ? (
              <pre key={idx}><code>{segment.content}</code></pre>
            ) : (
              <p key={idx}>{segment.content}</p>
            )
          )}
        </div>
      ))}
      <div ref={chatEndRef} />
    </div>

    <div className="chat-input">
      <textarea
        ref={textAreaRef}
        className="chat-bar"
        placeholder="Type your message here..."
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        onKeyPress={handleKeyPress}
      />
      <button className="send-btn" onClick={generate}><IoIosSend/></button>
    </div>
    </>
   )}
    </div>
  );
}

export default App;
