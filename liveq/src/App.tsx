import { useState, useEffect, useRef } from "react";
import Peer, { DataConnection } from "peerjs";
import { motion, AnimatePresence } from "motion/react";
import { 
  Presentation, 
  Users, 
  Send, 
  Trash2, 
  LogOut, 
  PlusCircle, 
  Key, 
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  BarChart3,
  ListPlus,
  Trophy,
  Copy,
  QrCode,
  Check,
  ChevronDown,
  ChevronUp,
  Settings
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type View = "landing" | "create" | "presenter" | "audience" | "login-presenter" | "login-audience";

interface Answer {
  id: string;
  text: string;
  timestamp: number;
}

export default function App() {
  const [view, setView] = useState<View>("landing");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [hostConn, setHostConn] = useState<DataConnection | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<"text" | "poll">("text");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [pollOptions, setPollOptions] = useState<string[]>([]);
  const [pollVotes, setPollVotes] = useState<Record<number, number>>({});
  const [sessionPassword, setSessionPassword] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [isCreateExpanded, setIsCreateExpanded] = useState(true);
  
  // Input states
  const [inputQuestion, setInputQuestion] = useState("");
  const [inputAnswer, setInputAnswer] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [inputSessionPass, setInputSessionPass] = useState("");
  const [inputPollOptions, setInputPollOptions] = useState<string[]>(["", ""]);
  const [presenterTab, setPresenterTab] = useState<"text" | "poll">("text");
  const [hasVoted, setHasVoted] = useState(false);

  const answersEndRef = useRef<HTMLDivElement>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const stateRef = useRef({
    question: "",
    type: "text" as "text" | "poll",
    answers: [] as Answer[],
    pollOptions: [] as string[],
    pollVotes: {} as Record<number, number>,
    sessionPassword: "",
    isSessionActive: false
  });

  // Sync stateRef with state
  useEffect(() => {
    stateRef.current = {
      question,
      type,
      answers,
      pollOptions,
      pollVotes,
      sessionPassword,
      isSessionActive
    };
  }, [question, type, answers, pollOptions, pollVotes, sessionPassword, isSessionActive]);

  const broadcast = (data: any) => {
    connectionsRef.current.forEach(conn => {
      if (conn.open) {
        conn.send(data);
      }
    });
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sid = urlParams.get("session");
    if (sid) {
      setSessionId(sid);
      initPeer(false, sid);
    } else {
      initPeer(true);
    }

    return () => {
      peer?.destroy();
    };
  }, []);

  const initPeer = (asHost: boolean, targetId?: string) => {
    const newPeer = new Peer();
    setPeer(newPeer);
    setIsHost(asHost);

    newPeer.on("open", (id) => {
      setIsConnected(true);
      if (!asHost && targetId) {
        const conn = newPeer.connect(targetId);
        setupAudienceConnection(conn);
      }
    });

    newPeer.on("connection", (conn) => {
      if (asHost) {
        setupPresenterConnection(conn);
      }
    });

    newPeer.on("error", (err) => {
      console.error("Peer error:", err);
      setError("Connection error. Please refresh.");
    });

    newPeer.on("disconnected", () => {
      setIsConnected(false);
    });
  };

  const setupPresenterConnection = (conn: DataConnection) => {
    conn.on("open", () => {
      connectionsRef.current = [...connectionsRef.current, conn];
      setConnections([...connectionsRef.current]);
      // Send initial state to new audience member
      conn.send({
        type: "init",
        data: {
          question: stateRef.current.question,
          type: stateRef.current.type,
          pollOptions: stateRef.current.pollOptions,
          pollVotes: stateRef.current.pollVotes,
          isSessionActive: stateRef.current.isSessionActive
        }
      });
    });

    conn.on("data", (data: any) => {
      handlePresenterData(data, conn);
    });

    conn.on("close", () => {
      connectionsRef.current = connectionsRef.current.filter(c => c.peer !== conn.peer);
      setConnections([...connectionsRef.current]);
    });
  };

  const setupAudienceConnection = (conn: DataConnection) => {
    setHostConn(conn);
    conn.on("data", (data: any) => {
      handleAudienceData(data);
    });
    conn.on("close", () => {
      setIsSessionActive(false);
      setView("landing");
      setError("Host disconnected.");
    });
  };

  const handlePresenterData = (payload: any, conn: DataConnection) => {
    const { type, data } = payload;
    
    // Check password for sensitive actions
    if (type === "join-session") {
      if (data === stateRef.current.sessionPassword) {
        conn.send({
          type: "session-joined",
          data: {
            question: stateRef.current.question,
            type: stateRef.current.type,
            pollOptions: stateRef.current.pollOptions,
            pollVotes: stateRef.current.pollVotes
          }
        });
      } else {
        conn.send({ type: "error", data: "Incorrect password." });
      }
    }

    if (type === "submit-answer") {
      if (data.password === stateRef.current.sessionPassword) {
        const newAnswer: Answer = {
          id: Math.random().toString(36).substr(2, 9),
          text: data.answer,
          timestamp: Date.now()
        };
        setAnswers(prev => {
          const updated = [...prev, newAnswer];
          broadcast({ type: "new-answer", data: newAnswer });
          return updated;
        });
        conn.send({ type: "answer-accepted" });
      }
    }

    if (type === "vote-poll") {
      if (data.password === stateRef.current.sessionPassword) {
        setPollVotes(prev => {
          const updated = { ...prev, [data.optionIndex]: (prev[data.optionIndex] || 0) + 1 };
          broadcast({ type: "poll-updated", data: { pollVotes: updated } });
          return updated;
        });
        conn.send({ type: "vote-accepted" });
      }
    }
  };

  const handleAudienceData = (payload: any) => {
    const { type, data } = payload;
    switch (type) {
      case "init":
        setQuestion(data.question);
        setType(data.type);
        setPollOptions(data.pollOptions);
        setPollVotes(data.pollVotes);
        setIsSessionActive(data.isSessionActive);
        break;
      case "session-started":
        setIsSessionActive(true);
        setSuccess("Session started!");
        break;
      case "session-joined":
        setQuestion(data.question);
        setType(data.type);
        setPollOptions(data.pollOptions);
        setPollVotes(data.pollVotes);
        setView("audience");
        break;
      case "new-question":
        setQuestion(data.question);
        setType(data.type);
        setPollOptions(data.pollOptions || []);
        setPollVotes(data.pollVotes || {});
        setAnswers([]);
        setHasVoted(false);
        break;
      case "poll-updated":
        setPollVotes(data.pollVotes);
        break;
      case "new-answer":
        setAnswers(prev => [...prev, data]);
        break;
      case "answer-accepted":
      case "vote-accepted":
        setHasVoted(true);
        setSuccess(type === "answer-accepted" ? "Answer submitted!" : "Vote cast!");
        setTimeout(() => setSuccess(""), 2000);
        break;
      case "session-ended":
        setIsSessionActive(false);
        setView("landing");
        break;
      case "error":
        setError(data);
        setTimeout(() => setError(""), 3000);
        break;
    }
  };

  const handleCreateSession = () => {
    if (!inputSessionPass) {
      setError("Please set an audience password.");
      return;
    }
    setSessionPassword(inputSessionPass);
    setIsSessionActive(true);
    setView("presenter");
    
    // Update URL with session ID
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("session", peer?.id || "");
    window.history.pushState({}, "", newUrl);
    setSessionId(peer?.id || "");
    
    broadcast({ type: "session-started" });
  };

  const handlePresenterLogin = () => {
    setView("presenter");
  };

  const handleAudienceJoin = () => {
    if (hostConn) {
      hostConn.send({ type: "join-session", data: inputPassword });
      setSessionPassword(inputPassword);
    } else {
      setError("Not connected to host.");
    }
  };

  const handleSetQuestion = () => {
    if (!inputQuestion) return;
    const newType = "text";
    setQuestion(inputQuestion);
    setType(newType);
    setAnswers([]);
    broadcast({ type: "new-question", data: { question: inputQuestion, type: newType } });
    setInputQuestion("");
  };

  const handleSetPoll = () => {
    const validOptions = inputPollOptions.filter(opt => opt.trim() !== "");
    if (!inputQuestion || validOptions.length < 2) {
      setError("Please provide a question and at least 2 options.");
      return;
    }
    const newType = "poll";
    const initialVotes: Record<number, number> = {};
    validOptions.forEach((_, i) => initialVotes[i] = 0);
    
    setQuestion(inputQuestion);
    setType(newType);
    setPollOptions(validOptions);
    setPollVotes(initialVotes);
    setAnswers([]);
    
    broadcast({ 
      type: "new-question", 
      data: { 
        question: inputQuestion, 
        type: newType, 
        pollOptions: validOptions,
        pollVotes: initialVotes
      } 
    });
    setInputQuestion("");
    setInputPollOptions(["", ""]);
  };

  const handleSubmitAnswer = () => {
    if (!inputAnswer || hasVoted) return;
    hostConn?.send({
      type: "submit-answer",
      data: { password: sessionPassword, answer: inputAnswer }
    });
    setInputAnswer("");
  };

  const handleVotePoll = (index: number) => {
    if (hasVoted) return;
    hostConn?.send({
      type: "vote-poll",
      data: { password: sessionPassword, optionIndex: index }
    });
  };

  const handleClearAnswers = () => {
    setAnswers([]);
    const resetVotes: Record<number, number> = {};
    pollOptions.forEach((_, i) => resetVotes[i] = 0);
    setPollVotes(resetVotes);
    broadcast({ type: "answers-cleared" });
  };

  const handleRemoveAnswer = (id: string) => {
    setAnswers(prev => {
      const updated = prev.filter(a => a.id !== id);
      broadcast({ type: "answer-removed", data: id });
      return updated;
    });
  };

  const handleEndSession = () => {
    setShowEndConfirm(true);
  };

  const confirmEndSession = () => {
    setIsSessionActive(false);
    setView("landing");
    broadcast({ type: "session-ended" });
    setShowEndConfirm(false);
    
    // Clear URL
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("session");
    window.history.pushState({}, "", newUrl);
  };

  const handleCopyURL = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setSuccess("Session URL copied to clipboard!");
      setTimeout(() => {
        setCopied(false);
        setSuccess("");
      }, 2000);
    });
  };

  const renderLanding = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="inline-flex items-center justify-center p-4 bg-blue-100 rounded-2xl text-blue-600 mb-4">
          <Presentation size={48} />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">LiveQ</h1>
        <p className="text-xl text-gray-600 max-w-md mx-auto">
          Interactive real-time presentations. Engage your audience instantly.
        </p>
        {!isConnected && (
          <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-full text-sm font-medium mx-auto w-fit">
            <AlertCircle size={16} />
            Connecting to P2P network...
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView(isSessionActive ? "presenter" : "create")}
          className="flex flex-col items-center p-8 bg-white border-2 border-blue-500 rounded-3xl shadow-sm hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-blue-50 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors mb-4">
            <PlusCircle size={32} />
          </div>
          <span className="text-xl font-semibold text-gray-800">
            {isSessionActive ? "Manage Session" : "Create Session"}
          </span>
          <p className="text-sm text-gray-500 mt-2">Start or manage a live session</p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView("login-audience")}
          className="flex flex-col items-center p-8 bg-white border-2 border-purple-500 rounded-3xl shadow-sm hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-purple-50 rounded-xl text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors mb-4">
            <Users size={32} />
          </div>
          <span className="text-xl font-semibold text-gray-800">Join Session</span>
          <p className="text-sm text-gray-500 mt-2">Participate as an audience member</p>
        </motion.button>
      </div>
    </div>
  );

  const renderCreate = () => (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl border border-gray-100">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <PlusCircle className="text-blue-500" /> Create Session
      </h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Set Audience Password</label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="password"
              value={inputSessionPass}
              onChange={(e) => setInputSessionPass(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Audience will use this to join"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => setView("landing")}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateSession}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
          >
            Start Session
          </button>
        </div>
      </div>
    </div>
  );

  const renderLogin = (type: "presenter" | "audience") => (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-xl border border-gray-100">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Key className={type === "presenter" ? "text-blue-500" : "text-purple-500"} /> 
        {type === "presenter" ? "Presenter Access" : "Join Session"}
      </h2>
      <div className="space-y-6">
        {type === "presenter" ? (
          <div className="space-y-4">
            <p className="text-gray-600">You are the host of this session. You can return to your dashboard below.</p>
            <button
              onClick={() => setView("presenter")}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Enter Audience Password</label>
            <input
              type="password"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Enter session password"
              onKeyDown={(e) => e.key === "Enter" && handleAudienceJoin()}
            />
          </div>
        )}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => setView("landing")}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
          >
            Back
          </button>
          {type === "audience" && (
            <button
              onClick={handleAudienceJoin}
              className="flex-1 px-6 py-3 text-white rounded-xl font-semibold shadow-lg transition-all bg-purple-600 hover:bg-purple-700 shadow-purple-200"
            >
              Join
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderPresenter = () => (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 truncate">Presenter Dashboard</h3>
              <p className="text-xs text-gray-500 truncate">
                Audience Password: <span className="font-mono font-bold text-blue-600 select-all">{sessionPassword}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsControlsExpanded(!isControlsExpanded)}
            className="sm:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
          >
            {isControlsExpanded ? <ChevronUp size={24} /> : <Settings size={24} />}
          </button>
          
          {/* Desktop Controls */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={handleCopyURL}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all font-semibold text-sm justify-center border border-blue-100"
              title="Copy Session URL"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span>{copied ? "Copied!" : "Copy URL"}</span>
            </button>
            <button
              onClick={() => setShowQRCode(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-xl transition-all font-semibold text-sm justify-center border border-gray-100"
              title="Show QR Code"
            >
              <QrCode size={18} />
              <span>QR Code</span>
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl transition-all font-semibold text-sm justify-center border border-purple-100"
            >
              {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
              <span>{showPreview ? "Preview" : "Preview"}</span>
            </button>
            <button
              onClick={handleEndSession}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all font-semibold text-sm justify-center border border-red-100"
              title="End Session"
            >
              <LogOut size={18} />
              <span>End</span>
            </button>
          </div>
        </div>

        {/* Mobile Controls (Expandable) */}
        <AnimatePresence>
          {isControlsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="sm:hidden border-t border-gray-100 bg-gray-50/50 p-4 grid grid-cols-2 gap-2"
            >
              <button
                onClick={handleCopyURL}
                className="flex items-center gap-2 px-4 py-3 bg-white text-blue-600 rounded-xl font-bold text-sm justify-center border border-blue-100 shadow-sm"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                <span>{copied ? "Copied!" : "Copy URL"}</span>
              </button>
              <button
                onClick={() => { setShowQRCode(true); setIsControlsExpanded(false); }}
                className="flex items-center gap-2 px-4 py-3 bg-white text-gray-600 rounded-xl font-bold text-sm justify-center border border-gray-100 shadow-sm"
              >
                <QrCode size={18} />
                <span>QR Code</span>
              </button>
              <button
                onClick={() => { setShowPreview(!showPreview); setIsControlsExpanded(false); }}
                className="flex items-center gap-2 px-4 py-3 bg-white text-purple-600 rounded-xl font-bold text-sm justify-center border border-purple-100 shadow-sm"
              >
                {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
                <span>Preview</span>
              </button>
              <button
                onClick={() => { handleEndSession(); setIsControlsExpanded(false); }}
                className="flex items-center gap-2 px-4 py-3 bg-white text-red-600 rounded-xl font-bold text-sm justify-center border border-red-100 shadow-sm"
              >
                <LogOut size={18} />
                <span>End Session</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showPreview && (
        <motion.div 
          key="audience-preview-container"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="bg-purple-50 p-1 rounded-3xl border-2 border-purple-200 border-dashed">
            <div className="bg-white rounded-[22px] overflow-hidden shadow-inner">
              <div className="bg-purple-600 text-white px-4 py-2 text-xs font-bold flex justify-between items-center">
                <span>AUDIENCE PREVIEW MODE</span>
                <button onClick={() => setShowPreview(false)}><X size={14} /></button>
              </div>
              <div className="scale-90 origin-top transform -mb-[10%]">
                {renderAudience()}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRCode && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowQRCode(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button 
                onClick={() => setShowQRCode(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
              
              <div className="space-y-2 pt-2">
                <h3 className="text-2xl font-bold text-gray-900">Share Session</h3>
                <p className="text-sm text-gray-500">Audience members can scan this code to join the session instantly.</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 inline-block mx-auto shadow-inner">
                <QRCodeSVG 
                  value={window.location.href} 
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Audience Password</p>
                  <p className="text-2xl font-black text-blue-900 tracking-widest">{sessionPassword}</p>
                </div>
                <button
                  onClick={handleCopyURL}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
                >
                  <Copy size={18} /> Copy Link
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div 
          className="flex items-center justify-between p-6 sm:p-8 cursor-pointer hover:bg-gray-50/50 transition-colors"
          onClick={() => setIsCreateExpanded(!isCreateExpanded)}
        >
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare className="text-blue-500" /> Create Content
          </h2>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex bg-gray-100 p-1 rounded-xl" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setPresenterTab("text")}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${presenterTab === "text" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                Question
              </button>
              <button
                onClick={() => setPresenterTab("poll")}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${presenterTab === "poll" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                Poll
              </button>
            </div>
            <div className="p-2 text-gray-400">
              {isCreateExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isCreateExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 sm:px-8 pb-8 space-y-6"
            >
              <div className="sm:hidden flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setPresenterTab("text")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${presenterTab === "text" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
                >
                  Question
                </button>
                <button
                  onClick={() => setPresenterTab("poll")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${presenterTab === "poll" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500"}`}
                >
                  Poll
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                    {presenterTab === "text" ? "Question Text" : "Poll Question"}
                  </label>
                  <input
                    type="text"
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder={presenterTab === "text" ? "Type a new question..." : "What would you like to ask?"}
                    onKeyDown={(e) => e.key === "Enter" && (presenterTab === "text" ? handleSetQuestion() : null)}
                  />
                </div>

                {presenterTab === "poll" && (
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                      <span>Poll Options (2-6)</span>
                      <span>{inputPollOptions.length}/6</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {inputPollOptions.map((opt, i) => (
                        <div key={`input-opt-${i}`} className="relative group">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...inputPollOptions];
                              newOpts[i] = e.target.value;
                              setInputPollOptions(newOpts);
                            }}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                            placeholder={`Option ${i + 1}`}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">{i + 1}</span>
                          {inputPollOptions.length > 2 && (
                            <button 
                              onClick={() => setInputPollOptions(inputPollOptions.filter((_, idx) => idx !== i))}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      {inputPollOptions.length < 6 && (
                        <button
                          onClick={() => setInputPollOptions([...inputPollOptions, ""])}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-all text-sm font-medium"
                        >
                          <ListPlus size={16} /> Add Option
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={presenterTab === "text" ? handleSetQuestion : handleSetPoll}
                  className={`w-full py-3 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 justify-center ${presenterTab === "text" ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200" : "bg-purple-600 hover:bg-purple-700 shadow-purple-200"}`}
                >
                  <Send size={18} /> {presenterTab === "text" ? "Update Question" : "Start Poll"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`mx-6 sm:mx-8 mb-6 sm:mb-8 p-6 rounded-2xl border ${type === "text" ? "bg-blue-50 border-blue-100" : "bg-purple-50 border-purple-100"}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${type === "text" ? "bg-blue-200 text-blue-700" : "bg-purple-200 text-purple-700"}`}>
              LIVE {type}
            </span>
          </div>
          <p className={`text-xl font-bold leading-tight ${type === "text" ? "text-blue-900" : "text-purple-900"}`}>"{question}"</p>
        </div>
      </div>

      {type === "poll" ? (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="text-purple-500" /> Poll Results
            </h2>
            <button
              onClick={handleClearAnswers}
              className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={16} /> Reset Poll
            </button>
          </div>
          
          <div className="space-y-4">
            {(() => {
              const totalVotes = (Object.values(pollVotes) as number[]).reduce((a, b) => a + b, 0);
              const maxVotes = Math.max(...(Object.values(pollVotes) as number[]), 0);
              const sortedIndices = pollOptions
                .map((_, i) => i)
                .sort((a, b) => (pollVotes[b] || 0) - (pollVotes[a] || 0));

              return sortedIndices.map((idx, rank: number) => {
                const votes = pollVotes[idx] || 0;
                const percentage = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
                const isWinner = votes === maxVotes && maxVotes > 0;

                return (
                  <motion.div 
                    key={`presenter-poll-result-${idx}`}
                    layout
                    className={`relative p-4 rounded-2xl border transition-all ${isWinner ? "bg-yellow-50 border-yellow-200 shadow-sm" : "bg-gray-50 border-gray-100"}`}
                  >
                    <div className="flex justify-between items-center mb-2 relative z-10">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isWinner ? "bg-yellow-400 text-yellow-900" : "bg-gray-200 text-gray-500"}`}>
                          {isWinner ? <Trophy size={12} /> : rank + 1}
                        </span>
                        <span className={`font-bold ${isWinner ? "text-yellow-900" : "text-gray-700"}`}>{pollOptions[idx]}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-gray-900">{percentage}%</span>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">{votes} votes</p>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative z-10">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className={`h-full rounded-full ${isWinner ? "bg-yellow-400" : "bg-purple-500"}`}
                      />
                    </div>
                  </motion.div>
                );
              });
            })()}
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-purple-500" /> Audience Answers ({answers.length})
            </h2>
            <button
              onClick={handleClearAnswers}
              className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={16} /> Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {answers.length === 0 ? (
                <motion.div 
                  key="empty-answers"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-20 text-center text-gray-400"
                >
                  Waiting for answers...
                </motion.div>
              ) : (
                answers.map((ans) => (
                  <motion.div
                    key={ans.id}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:border-blue-200 transition-all group/ans relative"
                  >
                    <button
                      onClick={() => handleRemoveAnswer(ans.id)}
                      className="absolute top-2 right-2 p-1.5 text-gray-400 sm:text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-100 sm:opacity-0 sm:group-hover/ans:opacity-100 transition-all"
                      title="Remove Answer"
                    >
                      <Trash2 size={14} />
                    </button>
                    <p className="text-gray-800 pr-6">{ans.text}</p>
                    <span className="text-[10px] text-gray-400 mt-2 block">
                      {new Date(ans.timestamp).toLocaleTimeString()}
                    </span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            <div ref={answersEndRef} />
          </div>
        </div>
      )}
    </div>
  );

  const renderAudience = () => (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0">
            <Users size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 truncate">Audience View</h3>
            <p className="text-xs text-gray-500 truncate">Connected to live session</p>
          </div>
        </div>
        <button
          onClick={() => setView("landing")}
          className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all shrink-0 border border-transparent hover:border-gray-200"
          title="Leave Session"
        >
          <LogOut size={20} />
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6"
      >
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${type === "text" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}>
            LIVE {type}
          </span>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
          {question || "Waiting for presenter..."}
        </p>
      </motion.div>

      {type === "poll" ? (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-xl font-bold text-gray-800">Cast Your Vote</h2>
          <div className="space-y-3">
            {pollOptions.map((opt, i) => (
              <button
                key={`audience-poll-opt-${i}`}
                onClick={() => handleVotePoll(i)}
                disabled={hasVoted}
                className={`w-full p-4 rounded-2xl border-2 text-left font-bold transition-all flex justify-between items-center ${hasVoted ? "border-gray-100 bg-gray-50 text-gray-400" : "border-purple-100 hover:border-purple-500 hover:bg-purple-50 text-gray-700"}`}
              >
                <span>{opt}</span>
                {hasVoted && <CheckCircle2 size={18} className="text-purple-500" />}
              </button>
            ))}
          </div>
          {hasVoted && (
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 space-y-4">
              <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={14} /> Live Results
              </h3>
              <div className="space-y-3">
                {(() => {
                  const totalVotes = (Object.values(pollVotes) as number[]).reduce((a, b) => a + b, 0);
                  const maxVotes = Math.max(...(Object.values(pollVotes) as number[]), 0);
                  const sortedIndices = pollOptions
                    .map((_, i) => i)
                    .sort((a, b) => (pollVotes[b] || 0) - (pollVotes[a] || 0));

                  return sortedIndices.map((idx, rank: number) => {
                    const votes = pollVotes[idx] || 0;
                    const percentage = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
                    const isWinner = votes === maxVotes && maxVotes > 0;
                    return (
                      <div key={`audience-poll-result-${idx}`} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold uppercase">
                          <span className={isWinner ? "text-yellow-600" : "text-gray-500"}>{pollOptions[idx]} {isWinner && "🏆"}</span>
                          <span className="text-gray-900">{percentage}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className={`h-full rounded-full ${isWinner ? "bg-yellow-400" : "bg-purple-500"}`}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Your Answer</h2>
            {!hasVoted && (
              <span className={`text-xs font-bold ${inputAnswer.length > 150 ? "text-red-500" : "text-gray-400"}`}>
                {inputAnswer.length}/150
              </span>
            )}
          </div>
          {hasVoted ? (
            <div className="p-8 bg-green-50 border border-green-100 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <p className="font-bold text-green-900 text-lg">Answer Submitted!</p>
              <p className="text-sm text-green-700">Thank you for your response. The presenter will see it shortly.</p>
            </div>
          ) : (
            <>
              <textarea
                value={inputAnswer}
                onChange={(e) => setInputAnswer(e.target.value.substring(0, 150))}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all min-h-[120px] resize-none"
                placeholder="Type your response here..."
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={!question || question === "Waiting for question..." || inputAnswer.length === 0}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold text-lg hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} /> Submit Answer
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Top Nav */}
      <nav className="p-4 flex justify-between items-center max-w-7xl mx-auto">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => setView("landing")}
        >
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Presentation size={24} />
          </div>
          <span className="text-2xl font-black tracking-tighter text-gray-900">LiveQ</span>
        </div>
        <div className="flex items-center gap-3">
          {!isConnected && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold border border-red-100">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              DISCONNECTED
            </div>
          )}
          {isSessionActive && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              LIVE SESSION
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === "landing" && renderLanding()}
            {view === "create" && renderCreate()}
            {view === "login-presenter" && renderLogin("presenter")}
            {view === "login-audience" && renderLogin("audience")}
            {view === "presenter" && renderPresenter()}
            {view === "audience" && renderAudience()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Notifications and Modals */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        <AnimatePresence>
          {error && (
            <motion.div
              key="error-toast"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
            >
              <AlertCircle size={20} />
              <span className="font-medium">{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div
              key="success-toast"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
            >
              <CheckCircle2 size={20} />
              <span className="font-medium">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* End Session Confirmation Modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">End Session?</h3>
                <p className="text-gray-500">This will permanently delete all current questions and answers. This action cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEndSession}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
                >
                  End Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}
