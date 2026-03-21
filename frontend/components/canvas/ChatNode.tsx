import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ChevronDown, Send, MoreVertical, Minimize2 } from 'lucide-react';

export const ChatNode = memo(({ data }: any) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [messages, setMessages] = useState(data.messages || []);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { role: 'user', content: input }]);
      setInput('');
      setTimeout(() => {
        setMessages((prev: any) => [
          ...prev,
          { role: 'assistant', content: 'This is a mock AI response to help you study.' },
        ]);
      }, 500);
    }
  };

  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className="px-4 py-2.5 bg-white rounded-full border border-[#E2E8F0] shadow-md cursor-pointer hover:border-[#00274C] transition-all min-w-[140px]"
      >
        <Handle type="target" position={Position.Left} className="w-2 h-2 bg-[#00274C]" />
        <Handle type="source" position={Position.Right} className="w-2 h-2 bg-[#00274C]" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#FFCB05]" />
          <span className="text-sm font-medium text-[#1A1A2E]">{data.title}</span>
          <span className="text-xs text-[#94A3B8]">{messages.length}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-lg w-[400px]" style={{ minHeight: '500px' }}>
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-[#00274C]" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-[#00274C]" />

      <div className="h-10 bg-[#00274C] rounded-t-lg px-4 flex items-center justify-between">
        <input
          type="text"
          defaultValue={data.title}
          className="bg-transparent text-white text-sm font-medium outline-none flex-1"
        />
        <div className="flex items-center gap-2">
          <button className="px-2 py-0.5 bg-[#FFCB05] text-[#00274C] rounded text-xs font-medium">
            {data.skill}
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5 text-white" />
          </button>
          <button className="p-1 hover:bg-white/10 rounded transition-colors">
            <MoreVertical className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      <div className="p-4 h-[380px] overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-[#94A3B8] mt-8">
            Start a conversation to get help studying
          </div>
        ) : (
          messages.map((msg: any, idx: number) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#FFF8E1] text-[#1A1A2E]'
                    : 'bg-white border border-[#E2E8F0] text-[#1A1A2E]'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-[#E2E8F0]">
        <div className="h-1 bg-[#E2E8F0] rounded-full mb-2">
          <div className="h-full w-1/3 bg-[#16A34A] rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-[#CBD5E1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#00274C]"
          />
          <button
            onClick={handleSend}
            className="w-9 h-9 bg-[#00274C] rounded-full flex items-center justify-center hover:bg-[#1B365D] transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
});

ChatNode.displayName = 'ChatNode';
