"use client";

import { useState, useEffect, FormEvent } from "react";

interface Note {
  id: number;
  title: string;
  content: string;
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dataSource, setDataSource] = useState<"local" | "pocket">("local");
  const [pocketToken, setPocketToken] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // token value can now be entered by user
  const [tokenInput, setTokenInput] = useState("");
  const envToken = process.env.NEXT_PUBLIC_SECRET_TOKEN || "";
  const hasInput = tokenInput.trim() !== "";
  // token to send will be user input if provided, otherwise fallback to env
  const SECRET_TOKEN = hasInput ? tokenInput : envToken;
  const API_URL = "http://localhost:3001/api/notes";

  // require user to actually type something before enabling actions
  const isAuthorized = hasInput && !!SECRET_TOKEN;
  // if an env value exists, we can validate the input locally
  const tokenValid = hasInput ? (envToken ? tokenInput === envToken : true) : false;

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      } else {
        setError(`Failed to load: ${res.status}`);
      }
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedSource = localStorage.getItem("dataSource") as "local" | "pocket" || "local";
    const savedToken = localStorage.getItem("pocketToken") || "";
    setDataSource(savedSource);
    setPocketToken(savedToken);
    fetchNotes();
  }, []);

  // Auto-refresh when dataSource changes from Settings
  useEffect(() => {
    if (showSettings === false) {
      fetchNotes();
    }
  }, [showSettings]);

  const handleSaveConfig = async () => {
    localStorage.setItem("dataSource", dataSource);
    localStorage.setItem("pocketToken", pocketToken);
    
    // Send config to backend
    try {
      const res = await fetch("http://localhost:3001/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          pocketToken: dataSource === "pocket" ? pocketToken : null 
        }),
      });
      if (res.ok) {
        setError(null);
        await fetchNotes(); // Reload notes after switching
      } else {
        setError("Failed to save config");
      }
    } catch (e) {
      setError("Failed to save config");
    }
    
    setShowSettings(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      console.log('submit', { method, url, title, content, editingId });
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: SECRET_TOKEN,
        },
        body: JSON.stringify({ title, content }),
      });
      if (res.status === 401) {
        setError("Unauthorized: invalid token");
      } else if (res.ok) {
        setTitle("");
        setContent("");
        setEditingId(null);
        fetchNotes();
      } else {
        setError(`Error: ${res.status}`);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: SECRET_TOKEN },
      });
      if (res.status === 401) {
        setError("Unauthorized: invalid token");
      } else if (res.ok) {
        fetchNotes();
      } else if (res.status === 404) {
        setError("Note not found");
      } else {
        setError(`Error: ${res.status}`);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Filter notes based on search query
  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Title & Token Input */}
      <div className="bg-white shadow-sm rounded-xl m-6 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">📖</span>
            <h1 className="text-3xl font-bold text-gray-800">SecureNote</h1>
          </div>
          <p className="text-gray-600 text-sm mt-2">🔑 Secure your notes with authentication</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authorization Token
            </label>
            <input
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={process.env.NEXT_PUBLIC_SECRET_TOKEN ? "(using env value)" : "enter token"}
            />
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            title="Settings"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mx-6 mb-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Source Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Data Source
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="local"
                    checked={dataSource === "local"}
                    onChange={(e) => setDataSource(e.target.value as "local")}
                  />
                  <span>Local Storage (notes.json)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="pocket"
                    checked={dataSource === "pocket"}
                    onChange={(e) => setDataSource(e.target.value as "pocket")}
                  />
                  <span>PocketHost API</span>
                </label>
              </div>
            </div>

            {dataSource === "pocket" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PocketHost API Token
                </label>
                <input
                  type="password"
                  placeholder="Enter your PocketHost API token"
                  value={pocketToken}
                  onChange={(e) => setPocketToken(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-600 mt-2">
                  📌 Get your token from PocketHost dashboard → API Keys
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Save Configuration
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mx-6 mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm" data-testid="error">
          ⚠️ {error}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create Note Form (Sticky) */}
        {isAuthorized && (
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 bg-white shadow-sm rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {editingId ? `Edit Note #${editingId}` : 'Create Note'}
              </h2>
              {editingId && (
                <button
                  type="button"
                  className="text-sm text-indigo-600 mb-4"
                  onClick={() => {
                    setEditingId(null);
                    setTitle('');
                    setContent('');
                  }}
                >
                  Cancel editing
                </button>
              )}
              {!tokenValid && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  ⚠️ Token does not match. Actions disabled.
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-50"
                  type="text"
                  placeholder="Note title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={!tokenValid}
                />
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-50 resize-none h-32"
                  placeholder="Note content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  disabled={!tokenValid}
                />
                <button
                  type="submit"
                  className="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !tokenValid}
                >
                  {loading ? "Saving..." : editingId ? "Update Note" : "Add Note"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Right Column: Notes List (2 columns on desktop) */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Your Notes</h2>
            {loading && <span className="text-sm text-gray-500">Loading...</span>}
          </div>

          {/* Search Box */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="🔍 Search notes by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {notes.length === 0 && !loading ? (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
              <p className="text-gray-600">No notes found. Create your first secure note!</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
              <p className="text-gray-600">No notes match your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-xl p-5 relative group"
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{note.title}</h3>
                  <p className="text-gray-600 text-sm break-words">{note.content}</p>
                  {/* Edit button */}
                  <button
                    onClick={() => {
                      setTitle(note.title);
                      setContent(note.content);
                      setEditingId(note.id);
                    }}
                    className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600"
                    title="Edit note"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                      <path fillRule="evenodd" d="M4 13v3h3l9.293-9.293-3-3L4 13z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Delete Button as Trash Icon (Hidden until hover) */}
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={loading || !tokenValid}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 disabled:cursor-not-allowed"
                    title="Delete note"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
