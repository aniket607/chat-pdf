"use client";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { ResponseWithCitations } from "@/components/ResponseWithCitations";


export default function ChatWindow({ docId }: { docId: string }) {
  const [input, setInput] = useState("");
  const { messages, status, sendMessage, error } = useChat();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(()=>{
    let cancelled= false;

    async function fetchSuggestions(){
      if(!docId) return;
      if(messages.length>0) return;
      setLoadingSuggestions(true);
      try{
        const res= await fetch(`/api/doc/${docId}/suggestions`);
        if(!res.ok) throw new Error("Failed to fetch suggestions");
        const json=await res.json();
        if(!cancelled) setSuggestions(Array.isArray(json.suggestions) ? json.suggestions : []);
      }catch{
        if(!cancelled) setSuggestions([]);
      }finally{
        if(!cancelled) setLoadingSuggestions(false);
      }
    }

    fetchSuggestions();
    return()=>{cancelled=true};
  },[docId,messages.length]);


  const getErrorMessage = (error: Error): string => {
    const errorMsg = error.message.toLowerCase();
    
    if (errorMsg.includes('overloaded') || errorMsg.includes('503') || errorMsg.includes('unavailable')) {
      return `🚧 **Service Temporarily Overloaded**

Google's AI service is experiencing high demand right now. This usually resolves within a few minutes.

**What you can do:**
- Wait a moment and try your question again
- The system will automatically retry with exponential backoff
- Your conversation history is preserved

*This is a temporary issue with Google's servers, not with your PDF or question.*`;
    }
    
    if (errorMsg.includes('rate limit') || errorMsg.includes('429') || errorMsg.includes('too many requests')) {
      return `⏱️ **Rate Limit Reached**

You've made several requests in quick succession. Please wait a moment before trying again.

**What you can do:**
- Wait about 30-60 seconds
- Try your question again
- Consider breaking complex questions into smaller parts

*Your conversation history is preserved.*`;
    }
    
    if (errorMsg.includes('network') || errorMsg.includes('connection')) {
      return `🌐 **Network Connection Issue**

There seems to be a connectivity problem reaching the AI service.

**What you can do:**
- Check your internet connection
- Try your question again in a moment
- The system will automatically retry failed requests

*Your conversation and PDF data are safe.*`;
    }
    
    // Generic error
    return `⚠️ **Something Went Wrong**

An unexpected error occurred while processing your question.

**What you can do:**
- Try rephrasing your question
- Wait a moment and try again
- Check if your PDF is still loaded correctly

**Technical details:** ${error.message}

*Your conversation history is preserved.*`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(
        { text: input },
        {
          body: { docId },
        },
      );
      setInput("");
    }
  };

  const handleSuggestionClick= (q:string)=>{
    setInput(q);
    sendMessage(
      { text: q },
      {
        body: { docId },
      },
    );
    setInput("");
  }
  
  return (
    <div className="w-full h-full min-h-0">
      <div className="flex h-full min-h-0 flex-col">
        <Conversation className="relative w-full flex-1 min-h-0">
          <ConversationContent>
            {messages.map((m) => (
              <Message from={m.role} key={m.id}>
                <MessageContent>
                {m.parts.map((part, i) => (
                  part.type === "text" ? (
                    <ResponseWithCitations key={`${m.id}-${i}`}>{part.text}</ResponseWithCitations>
                  ) : null
                ))}
                </MessageContent>
              </Message>
            ))}
            
            {/* Show error as system message */}
            {error && (
              <Message from="system" key="error-message">
                <MessageContent>
                  <ResponseWithCitations>{getErrorMessage(error)}</ResponseWithCitations>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        {messages.length===0 && (loadingSuggestions || suggestions.length>0) &&(
          <div className="mt-2 w-full">
            <div className="flex flex-wrap gap-2">
              {loadingSuggestions && (
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white/70 px-3 py-1.5 text-sm text-gray-600 shadow-sm">
                  Generating Suggestions...
                </span>
              )}
              {!loadingSuggestions &&
                suggestions.slice(0,3).map((q,idx)=>(
                  <button
                    key={idx}
                    type="button"
                    onClick={()=>handleSuggestionClick(q)}
                    className="group inline-flex max-w-full break-words text-left rounded-full border border-gray-200 bg-white/70 px-3 py-1.5 text-sm text-gray-800 shadow-sm transition-all duration-150 hover:border-gray-300 hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer">
                      {q}
                  </button>
                ))}
            </div>
          </div>
        )}
        <PromptInput onSubmit={handleSubmit} className="mt-3 w-full relative shrink-0">
          <PromptInputTextarea
            value={input}
            placeholder="Say something..."
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12"
          />
          <PromptInputSubmit
            status={status}
            disabled={!input.trim()}
            className="absolute bottom-1 right-1"
          />
        </PromptInput>
      </div>
    </div>
  );
}


