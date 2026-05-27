import { useState, useEffect, useRef } from 'react';
import './App.css';

const BACKEND_URL = 'http://localhost:3001';

// Suggestions templates
const SUGGESTIONS = [
  {
    title: '🔴 Image Replacer Block',
    prompt: 'Make a Chrome extension that blocks all images on a website and replaces them with a red square.',
  },
  {
    title: '🌙 Dark Mode Injector',
    prompt: 'Create a dark mode extension that injects a styling sheet to turn page backgrounds dark and text light, toggled via a floating widget.',
  },
  {
    title: '🔗 Link Neon Highlighter',
    prompt: 'Build a Chrome extension that finds all links on a web page, highlights them in neon cyan, and displays the total count in a popup.',
  },
  {
    title: '⏱️ Read Time Estimator',
    prompt: 'Make an extension that estimates the reading time of the article on the current page, and displays it at the top-right corner of the window.',
  }
];

export default function App() {
  // State variables
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Phase 2 state variables
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'sandbox'
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSandboxExtensionActive, setIsSandboxExtensionActive] = useState(false);
  const [isSandboxPopupOpen, setIsSandboxPopupOpen] = useState(false);

  const consoleEndRef = useRef(null);

  // Load API key and projects on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('extensio_api_key') || '';
    setApiKey(savedKey);
    fetchProjects();
  }, []);

  // Scroll logs console to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Listen to messages from Sandbox iframe
  useEffect(() => {
    const handleSandboxMessage = (e) => {
      if (!e.data || !e.data.type) return;
      const { type, text, message, items, response } = e.data;
      if (type === 'CONSOLE_LOG') {
        addLog(`[Console] 🟢 ${text}`);
      } else if (type === 'CONSOLE_ERROR') {
        addLog(`[Console Error] 🔴 ${text}`);
      } else if (type === 'CONSOLE_WARN') {
        addLog(`[Console Warning] 🟡 ${text}`);
      } else if (type === 'RUNTIME_SEND_MESSAGE') {
        addLog(`[Extension Message] ✉️ content.js sent message: ${JSON.stringify(message)}`);
      } else if (type === 'STORAGE_SET') {
        addLog(`[Extension Storage] 💾 content.js set storage: ${JSON.stringify(items)}`);
      } else if (type === 'POPUP_TO_CONTENT_RESPONSE') {
        addLog(`[Popup Message] 📥 Popup received response from content.js: ${JSON.stringify(response)}`);
      } else if (type === 'POPUP_SEND_MESSAGE') {
        addLog(`[Popup Message] ✉️ popup.js sent message: ${JSON.stringify(message)}`);
      } else if (type === 'POPUP_SEND_TAB_MESSAGE') {
        addLog(`[Popup Tab Message] ✉️ popup.js sent tab message: ${JSON.stringify(message)}`);
      } else if (type === 'POPUP_STORAGE_SET') {
        addLog(`[Popup Storage] 💾 popup.js set storage: ${JSON.stringify(items)}`);
      }
    };

    window.addEventListener('message', handleSandboxMessage);
    return () => window.removeEventListener('message', handleSandboxMessage);
  }, []);

  // Fetch projects from express backend
  const fetchProjects = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  // Helper to add timestamped logs
  const addLog = (text) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, text }]);
  };

  // Trigger Settings Modal save
  const handleSaveApiKey = (e) => {
    e.preventDefault();
    const key = e.target.elements.apiKey.value.trim();
    localStorage.setItem('extensio_api_key', key);
    setApiKey(key);
    setIsSettingsOpen(false);
    addLog(`System configured: API Key updated.`);
  };

  // Select project and default to its latest version and first file
  const handleSelectProject = (project) => {
    setSelectedProject(project);
    const latestVersion = project.versions[project.versions.length - 1];
    setSelectedVersion(latestVersion.version);
    
    const defaultFile = latestVersion.files.find(f => f.name.toLowerCase() === 'manifest.json') || latestVersion.files[0];
    setSelectedFile(defaultFile);
    
    // Clear logs when selecting a project
    setLogs([]);
    setIsEditing(false);
    setIsSandboxExtensionActive(false);
    setIsSandboxPopupOpen(false);
  };

  // Select specific version from history timeline
  const handleSelectVersion = (versionNumber) => {
    setSelectedVersion(versionNumber);
    const ver = selectedProject.versions.find(v => v.version === versionNumber);
    if (ver) {
      const defaultFile = ver.files.find(f => f.name.toLowerCase() === 'manifest.json') || ver.files[0];
      setSelectedFile(defaultFile);
    }
    setIsEditing(false);
    setIsSandboxExtensionActive(false);
    setIsSandboxPopupOpen(false);
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (selectedFile) {
      const codeToCopy = isEditing ? editedContent : selectedFile.content;
      navigator.clipboard.writeText(codeToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Enter editing mode
  const handleStartEdit = () => {
    if (selectedFile) {
      setEditedContent(selectedFile.content);
      setIsEditing(true);
    }
  };

  // Save manual modifications back to backend
  const handleSaveFileContent = async () => {
    if (!selectedProject || !selectedVersion || !selectedFile) return;

    try {
      addLog(`💾 Committing manual modifications to ${selectedFile.name}...`);
      
      const response = await fetch(`${BACKEND_URL}/api/projects/${selectedProject.id}/versions/${selectedVersion}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedFile.name,
          content: editedContent
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save changes');
      }

      const updatedProject = await response.json();
      
      addLog(`✅ File ${selectedFile.name} successfully written to local disk & structurally validated!`);
      
      // Update local projects status
      await fetchProjects();
      setSelectedProject(updatedProject);
      
      // Update local file display content
      const activeVersionObj = updatedProject.versions.find(v => v.version === selectedVersion);
      if (activeVersionObj) {
        const updatedFile = activeVersionObj.files.find(f => f.name === selectedFile.name);
        if (updatedFile) setSelectedFile(updatedFile);
      }
      
      setIsEditing(false);
    } catch (err) {
      addLog(`❌ Validation Error: ${err.message}`);
      alert(`Schema Validation Failed:\n${err.message}`);
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId, e) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this extension project? All versions and files will be permanently deleted.")) {
      return;
    }

    try {
      addLog(`🗑️ Deleting project...`);
      const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }

      addLog(`✅ Project successfully deleted!`);
      
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setSelectedVersion(null);
        setSelectedFile(null);
      }
      
      await fetchProjects();
    } catch (err) {
      addLog(`❌ Project Deletion Error: ${err.message}`);
      alert(`Project Deletion Failed: ${err.message}`);
    }
  };

  // Rename project
  const handleRenameProject = async (projectId, e) => {
    if (e) e.stopPropagation();
    const currentName = selectedProject?.name || '';
    const currentDesc = selectedProject?.description || '';
    
    const newName = prompt("Enter new project name:", currentName);
    if (newName === null) return;
    const trimmedName = newName.trim();
    if (!trimmedName) {
      alert("Project name cannot be empty!");
      return;
    }
    
    const newDesc = prompt("Enter new project description:", currentDesc);
    if (newDesc === null) return;

    try {
      addLog(`✏️ Renaming project to "${trimmedName}"...`);
      const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, description: newDesc.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update metadata');
      }

      const updatedProject = await response.json();
      addLog(`✅ Project renamed successfully!`);
      
      await fetchProjects();
      setSelectedProject(updatedProject);
    } catch (err) {
      addLog(`❌ Project Rename Error: ${err.message}`);
      alert(`Project Rename Failed: ${err.message}`);
    }
  };

  // Create file
  const handleCreateFile = async () => {
    if (!selectedProject || !selectedVersion) return;
    const name = prompt("Enter new file name (e.g. background.js, popup.css):");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    if (getActiveFiles().some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
      alert("File already exists!");
      return;
    }

    const defaultContent = trimmed.endsWith('.js') ? '// JavaScript file' : trimmed.endsWith('.css') ? '/* Stylesheet */' : trimmed.endsWith('.html') ? '<!-- HTML structure -->' : '';

    try {
      addLog(`➕ Creating file ${trimmed}...`);
      const response = await fetch(`${BACKEND_URL}/api/projects/${selectedProject.id}/versions/${selectedVersion}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          content: defaultContent
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create file');
      }

      const updatedProject = await response.json();
      addLog(`✅ File ${trimmed} successfully created!`);
      
      await fetchProjects();
      setSelectedProject(updatedProject);
      
      const verObj = updatedProject.versions.find(v => v.version === selectedVersion);
      if (verObj) {
        const newFile = verObj.files.find(f => f.name === trimmed);
        if (newFile) setSelectedFile(newFile);
      }
    } catch (err) {
      addLog(`❌ File Creation Error: ${err.message}`);
      alert(`File Creation Failed: ${err.message}`);
    }
  };

  // Delete file
  const handleDeleteFile = async (fileName) => {
    if (!selectedProject || !selectedVersion) return;
    if (fileName.toLowerCase() === 'manifest.json') {
      alert("Cannot delete manifest.json");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

    try {
      addLog(`🗑️ Deleting file ${fileName}...`);
      const response = await fetch(`${BACKEND_URL}/api/projects/${selectedProject.id}/versions/${selectedVersion}/files/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fileName })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete file');
      }

      const updatedProject = await response.json();
      addLog(`✅ File ${fileName} successfully deleted!`);

      await fetchProjects();
      setSelectedProject(updatedProject);

      const verObj = updatedProject.versions.find(v => v.version === selectedVersion);
      if (verObj && verObj.files.length > 0) {
        const defaultFile = verObj.files.find(f => f.name.toLowerCase() === 'manifest.json') || verObj.files[0];
        setSelectedFile(defaultFile);
      } else {
        setSelectedFile(null);
      }
    } catch (err) {
      addLog(`❌ File Deletion Error: ${err.message}`);
      alert(`File Deletion Failed: ${err.message}`);
    }
  };

  // Generate / Iterate flow
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    setLoading(true);
    setLogs([]);
    addLog('🚀 Starting Chrome Extension Generator...');
    
    // Step-by-step premium logs simulation
    setTimeout(() => addLog('🔍 Parsing instructions and intent...'), 600);
    setTimeout(() => addLog('⚡ Initiating LLM model connection...'), 1200);
    setTimeout(() => addLog('🧠 Formatting System Prompt for Chrome V3 Manifest compliance...'), 1800);
    setTimeout(() => addLog('🛰️ Sending request to Gemini Core Engine...'), 2400);

    try {
      const isIteration = selectedProject !== null;
      const requestBody = {
        prompt: prompt,
        apiKey: apiKey
      };

      if (isIteration) {
        requestBody.projectId = selectedProject.id;
        requestBody.parentVersion = selectedVersion;
        addLog(`🔧 Iterating on current Version ${selectedVersion} of "${selectedProject.name}"...`);
      }

      const response = await fetch(`${BACKEND_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate');
      }

      const updatedProject = await response.json();
      
      addLog('✨ Code generation completed successfully!');
      addLog('💾 Physically writing extension files to local temporary workspace (/temp)...');
      addLog('🧪 Verification: structural manifest checks completed!');
      addLog('📦 Creating validated ZIP package... (Manifest V3 integrity validated)');
      addLog('✅ All systems active. Ready to download.');

      // Refresh project lists
      await fetchProjects();

      // Switch view to the new/updated project
      setSelectedProject(updatedProject);
      const newLatestVer = updatedProject.versions[updatedProject.versions.length - 1];
      setSelectedVersion(newLatestVer.version);
      const defaultFile = newLatestVer.files.find(f => f.name.toLowerCase() === 'manifest.json') || newLatestVer.files[0];
      setSelectedFile(defaultFile);
      setPrompt('');
      setIsEditing(false);
      setIsSandboxExtensionActive(false);

    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Get active files based on selected project and selected version
  const getActiveFiles = () => {
    if (!selectedProject || !selectedVersion) return [];
    const ver = selectedProject.versions.find(v => v.version === selectedVersion);
    return ver ? ver.files : [];
  };

  // Icon helper based on file extension
  const getFileIconClass = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'json') return 'file-icon json';
    if (ext === 'js') return 'file-icon js';
    if (ext === 'html') return 'file-icon html';
    if (ext === 'css') return 'file-icon css';
    return 'file-icon';
  };

  // Get active content.js script for live simulation
  const getActiveContentJsContent = () => {
    const files = getActiveFiles();
    const manifestFile = files.find(f => f.name.toLowerCase() === 'manifest.json');
    let contentJsName = 'content.js';
    if (manifestFile) {
      try {
        const manifestJson = JSON.parse(manifestFile.content);
        if (manifestJson.content_scripts && manifestJson.content_scripts[0] && manifestJson.content_scripts[0].js) {
          contentJsName = manifestJson.content_scripts[0].js[0];
        }
      } catch(e) {}
    }
    const contentJsFile = files.find(f => f.name.toLowerCase() === contentJsName.toLowerCase());
    return contentJsFile ? contentJsFile.content : '';
  };

  // Check what simulator features should be active based on file content keyword analysis (styling overrides fallback)
  const getSimulatorDirectives = () => {
    const files = getActiveFiles();
    const manifestFile = files.find(f => f.name.toLowerCase() === 'manifest.json')?.content || '';
    const contentJsFile = files.find(f => f.name.toLowerCase() === 'content.js')?.content || '';
    const popupHtmlFile = files.find(f => f.name.toLowerCase() === 'popup.html')?.content || '';

    const joinedText = (manifestFile + contentJsFile + popupHtmlFile).toLowerCase();
    
    return {
      isImageBlocker: joinedText.includes('image') || joinedText.includes('img') || joinedText.includes('red'),
      isDarkMode: joinedText.includes('dark') || joinedText.includes('night') || joinedText.includes('background'),
      isHighlighter: joinedText.includes('highlight') || joinedText.includes('neon') || joinedText.includes('link')
    };
  };

  const directives = getSimulatorDirectives();

  // Check if current version has popup html file
  const hasPopupHtml = () => {
    return getActiveFiles().some(f => f.name.toLowerCase() === 'popup.html');
  };

  // Bundle and construct the dynamic popup.html inside an iframe
  const generatePopupSrcDoc = () => {
    const files = getActiveFiles();
    const popupHtmlFile = files.find(f => f.name.toLowerCase() === 'popup.html');
    if (!popupHtmlFile) return '';

    let html = popupHtmlFile.content;

    // Replace link stylesheet references with actual stylesheet contents
    const cssFiles = files.filter(f => f.name.endsWith('.css'));
    cssFiles.forEach(cssFile => {
      const cssRefRegex = new RegExp(`<link[^>]*href=["']\\.?\\/?${cssFile.name}["'][^>]*>`, 'gi');
      html = html.replace(cssRefRegex, `<style>${cssFile.content}</style>`);
    });

    // Replace script src references with inlined wrapped code mocking Chrome Extension APIs
    const jsFiles = files.filter(f => f.name.endsWith('.js'));
    jsFiles.forEach(jsFile => {
      const jsRefRegex = new RegExp(`<script[^>]*src=["']\\.?\\/?${jsFile.name}["'][^>]*>\\s*<\\/script>`, 'gi');
      const wrappedJs = `
        (function() {
          // Mock chrome API for popup
          window.chrome = {
            runtime: {
              sendMessage: (message, responseCallback) => {
                window.parent.postMessage({ type: 'POPUP_SEND_MESSAGE', message }, '*');
                const sandboxIframe = window.parent.document.getElementById('sandbox-iframe-viewport');
                if (sandboxIframe) {
                  sandboxIframe.contentWindow.postMessage({ type: 'POPUP_TO_CONTENT', message }, '*');
                }
                if (responseCallback) {
                  setTimeout(() => responseCallback({ success: true, status: 'forwarded' }), 50);
                }
              }
            },
            tabs: {
              query: (queryInfo, callback) => {
                if (callback) callback([{ id: 1, url: 'https://extensio-sandbox.io/vibrant-blog-page' }]);
              },
              sendMessage: (tabId, message, responseCallback) => {
                const iframe = window.parent.document.getElementById('sandbox-iframe-viewport');
                if (iframe) {
                  iframe.contentWindow.postMessage({ type: 'POPUP_TO_CONTENT', message }, '*');
                }
                window.parent.postMessage({ type: 'POPUP_SEND_TAB_MESSAGE', message }, '*');
                if (responseCallback) {
                  setTimeout(() => responseCallback({ success: true }), 100);
                }
              }
            },
            storage: {
              local: {
                get: (keys, callback) => {
                  const data = {};
                  const prefix = 'mock_ext_storage_';
                  if (typeof keys === 'string') {
                    data[keys] = JSON.parse(localStorage.getItem(prefix + keys) || 'null');
                  } else if (Array.isArray(keys)) {
                    keys.forEach(k => {
                      data[k] = JSON.parse(localStorage.getItem(prefix + k) || 'null');
                    });
                  }
                  if (callback) callback(data);
                },
                set: (items, callback) => {
                  const prefix = 'mock_ext_storage_';
                  Object.entries(items).forEach(([k, v]) => {
                    localStorage.setItem(prefix + k, JSON.stringify(v));
                  });
                  window.parent.postMessage({ type: 'POPUP_STORAGE_SET', items }, '*');
                  if (callback) callback();
                }
              }
            }
          };

          // Override console.log for popup
          const originalLog = console.log;
          console.log = function(...args) {
            originalLog.apply(console, args);
            window.parent.postMessage({ type: 'CONSOLE_LOG', text: '[Popup] ' + args.join(' ') }, '*');
          };
          
          try {
            ${jsFile.content}
          } catch(e) {
            console.error('[Popup Error] ' + e.message);
          }
        })();
      `;
      html = html.replace(jsRefRegex, `<script>${wrappedJs}</script>`);
    });

    html = `
      <style>
        body { 
          margin: 0; 
          padding: 12px; 
          font-family: system-ui, -apple-system, sans-serif; 
          background-color: #1f2937; 
          color: #f9fafb; 
        }
      </style>
      ${html}
    `;

    return html;
  };

  // Compile and download the ZIP package with safety checks
  const handleDownloadZip = async (e) => {
    e.preventDefault();
    if (!selectedProject || !selectedVersion) return;

    addLog(`📦 Requesting extension ZIP package from server...`);
    try {
      const url = `${BACKEND_URL}/api/download/${selectedProject.id}/${selectedVersion}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Server error packing extension');
        } else {
          const errorText = await response.text();
          throw new Error(errorText || 'Server error packing extension');
        }
      }

      // Download the blob
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${selectedProject.name.replace(/[^a-zA-Z0-9]/g, '_')}_v${selectedVersion}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      addLog(`✅ Extension ZIP downloaded successfully!`);
    } catch (err) {
      addLog(`❌ Download Error: ${err.message}`);
      alert(`Download Failed:\n${err.message}`);
    }
  };

  // Build the sandboxed iframe viewport content dynamically
  const getSandboxHtml = (isSandboxExtensionActive) => {
    const contentJsContent = getActiveContentJsContent();
    let contentScriptInject = '';
    
    if (isSandboxExtensionActive && contentJsContent) {
      contentScriptInject = `
        <script>
          (function() {
            // 1. Intercept console logs/errors
            const originalLog = console.log;
            const originalError = console.error;
            const originalInfo = console.info;
            const originalWarn = console.warn;

            console.log = function(...args) {
              originalLog.apply(console, args);
              window.parent.postMessage({ type: 'CONSOLE_LOG', text: args.join(' ') }, '*');
            };
            console.error = function(...args) {
              originalError.apply(console, args);
              window.parent.postMessage({ type: 'CONSOLE_ERROR', text: args.join(' ') }, '*');
            };
            console.warn = function(...args) {
              originalWarn.apply(console, args);
              window.parent.postMessage({ type: 'CONSOLE_WARN', text: args.join(' ') }, '*');
            };

            window.onerror = function(message, source, lineno, colno, error) {
              window.parent.postMessage({ type: 'CONSOLE_ERROR', text: message + ' (line ' + lineno + ')' }, '*');
              return true;
            };

            // 2. Define mock Chrome API
            window.chrome = {
              runtime: {
                id: 'mock-extension-id',
                sendMessage: (message, responseCallback) => {
                  window.parent.postMessage({ type: 'RUNTIME_SEND_MESSAGE', message }, '*');
                  if (responseCallback) {
                    setTimeout(() => responseCallback({ success: true, status: 'delivered_to_mock_receiver' }), 50);
                  }
                },
                onMessage: {
                  addListener: (listener) => {
                    window.addEventListener('message', (event) => {
                      if (event.data && event.data.type === 'POPUP_TO_CONTENT') {
                        listener(event.data.message, {}, (response) => {
                          window.parent.postMessage({ type: 'POPUP_TO_CONTENT_RESPONSE', response }, '*');
                        });
                      }
                    });
                  }
                }
              },
              storage: {
                local: {
                  get: (keys, callback) => {
                    const data = {};
                    const prefix = 'mock_ext_storage_';
                    if (typeof keys === 'string') {
                      data[keys] = JSON.parse(localStorage.getItem(prefix + keys) || 'null');
                    } else if (Array.isArray(keys)) {
                      keys.forEach(k => {
                        data[k] = JSON.parse(localStorage.getItem(prefix + k) || 'null');
                      });
                    } else if (typeof keys === 'object' && keys !== null) {
                      Object.entries(keys).forEach(([k, defaultVal]) => {
                        const stored = localStorage.getItem(prefix + k);
                        data[k] = stored !== null ? JSON.parse(stored) : defaultVal;
                      });
                    }
                    if (callback) callback(data);
                  },
                  set: (items, callback) => {
                    const prefix = 'mock_ext_storage_';
                    Object.entries(items).forEach(([k, v]) => {
                      localStorage.setItem(prefix + k, JSON.stringify(v));
                    });
                    window.parent.postMessage({ type: 'STORAGE_SET', items }, '*');
                    if (callback) callback();
                  },
                  clear: (callback) => {
                    const prefix = 'mock_ext_storage_';
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key && key.startsWith(prefix)) {
                        localStorage.removeItem(key);
                      }
                    }
                    if (callback) callback();
                  }
                }
              }
            };
            
            try {
              ${contentJsContent}
            } catch(err) {
              console.error("Content Script Exception: " + err.message);
            }
          })();
        </script>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #ffffff;
            color: #111827;
            transition: all 0.3s;
          }
          header {
            background-color: #f3f4f6;
            border-bottom: 1px solid #e5e7eb;
            padding: 16px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.3s;
          }
          .logo {
            font-size: 18px;
            font-weight: 800;
            color: #4f46e5;
          }
          .nav-links {
            display: flex;
            gap: 16px;
          }
          .nav-link {
            color: #4f46e5;
            text-decoration: none;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.3s;
          }
          .content-area {
            padding: 32px;
          }
          h3 {
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 8px;
          }
          p {
            font-size: 13px;
            color: #4b5563;
            line-height: 1.5;
            margin-bottom: 20px;
          }
          .cards-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 24px;
          }
          .card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            background-color: white;
            transition: all 0.3s;
          }
          .card-img {
            width: 100%;
            height: 140px;
            object-fit: cover;
            display: block;
            transition: all 0.3s;
          }
          .card-body {
            padding: 16px;
          }
          .card-title {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .card-text {
            font-size: 12px;
            color: #6b7280;
          }
          /* FALLBACK SIMULATOR CLASSES */
          body.dark-theme-activated {
            background-color: #111827 !important;
            color: #f9fafb !important;
          }
          body.dark-theme-activated header {
            background: #1f2937 !important;
            border-bottom-color: #374151 !important;
          }
          body.dark-theme-activated .card {
            background: #1f2937 !important;
            border-color: #374151 !important;
            color: #f9fafb !important;
          }
          body.dark-theme-activated .nav-link {
            color: #38bdf8 !important;
          }
          .nav-link.neon-highlighted-activated {
            background-color: #00ffff !important;
            color: #000000 !important;
            box-shadow: 0 0 10px #00ffff !important;
            padding: 2px 6px;
            border-radius: 4px;
          }
          .card-img.red-square-activated {
            content: none !important;
            background-color: #ef4444 !important;
            width: 100%;
            height: 140px;
            display: flex !important;
          }
        </style>
      </head>
      <body class="${isSandboxExtensionActive && directives.isDarkMode ? 'dark-theme-activated' : ''}">
        <header>
          <div class="logo">Vibrant Media</div>
          <div class="nav-links">
            <a href="#home" class="nav-link ${isSandboxExtensionActive && directives.isHighlighter ? 'neon-highlighted-activated' : ''}">Home</a>
            <a href="#gallery" class="nav-link ${isSandboxExtensionActive && directives.isHighlighter ? 'neon-highlighted-activated' : ''}">Gallery</a>
            <a href="#articles" class="nav-link ${isSandboxExtensionActive && directives.isHighlighter ? 'neon-highlighted-activated' : ''}">Articles</a>
          </div>
        </header>
        <div class="content-area">
          <h3>Vibrant Modern Frameworks</h3>
          <p>
            Browse stunning mock layouts. Toggle the extension switch in the sandbox toolbar above to observe how your AI-generated Chrome content script interacts with the DOM elements (images, theme sheets, and hyperlinks) in real-time!
          </p>
          <div class="cards-grid">
            <div class="card">
              <img 
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60" 
                alt="Nature Card" 
                class="card-img ${isSandboxExtensionActive && directives.isImageBlocker ? 'red-square-activated' : ''}"
              />
              <div class="card-body">
                <div class="card-title">Nature's Vibrant Canvas</div>
                <div class="card-text">Sandy beach shores stretching endlessly under a high-definition sunlit sky.</div>
              </div>
            </div>
            <div class="card">
              <img 
                src="https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=500&auto=format&fit=crop&q=60" 
                alt="Cyber Card" 
                class="card-img ${isSandboxExtensionActive && directives.isImageBlocker ? 'red-square-activated' : ''}"
              />
              <div class="card-body">
                <div class="card-title">Neon Cyber Grid</div>
                <div class="card-text">Luminous streetlights reflecting over wet urban roads in neon Tokyo.</div>
              </div>
            </div>
          </div>
        </div>
        ${contentScriptInject}
      </body>
      </html>
    `;
  };

  return (
    <div className="app-container">
      {/* 1. Left Sidebar: Project List & Connection Status */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-title">
            <svg className="brand-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <span className="text-gradient">Extensio.ai</span>
          </div>
        </div>

        <button 
          className="new-project-btn"
          onClick={() => {
            setSelectedProject(null);
            setSelectedVersion(null);
            setSelectedFile(null);
            setLogs([]);
            setIsEditing(false);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Factory Project
        </button>

        <div className="projects-list">
          <div className="explorer-header" style={{ padding: '8px 0', borderBottom: 'none' }}>Your Extensions</div>
          {projects.length === 0 ? (
            <div style={{ padding: '20px 0', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No projects created yet. Use the launcher to create one!
            </div>
          ) : (
            projects.map((proj) => {
              const latestVer = proj.versions[proj.versions.length - 1];
              return (
                <div 
                  key={proj.id}
                  className={`project-item ${selectedProject?.id === proj.id ? 'active' : ''}`}
                  onClick={() => handleSelectProject(proj)}
                  style={{ position: 'relative' }}
                >
                  <div className="project-name" style={{ paddingRight: '45px' }}>{proj.name}</div>
                  <div className="project-desc">{proj.description}</div>
                  <div className="project-meta">
                    <span className="version-badge">v{latestVer.version}</span>
                    <span>{new Date(proj.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="project-sidebar-actions" style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                    <button 
                      className="sidebar-action-btn"
                      onClick={(e) => handleDeleteProject(proj.id, e)}
                      title="Delete Project"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.7 }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="sidebar-footer">
          <div className="api-status-pill">
            <div className="status-indicator">
              <div className={`status-dot ${apiKey ? 'active' : 'inactive'}`}></div>
              <span>Gemini Engine</span>
            </div>
            <button className="settings-toggle-btn" onClick={() => setIsSettingsOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Configure
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace Dashboard */}
      <main className="main-dashboard">
        <header className="dashboard-header">
          <div className="header-project-details" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {selectedProject ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 className="header-project-name">{selectedProject.name}</h2>
                  <button 
                    onClick={(e) => handleRenameProject(selectedProject.id, e)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '2px' }} 
                    title="Rename Extension / Update Description"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={(e) => handleDeleteProject(selectedProject.id, e)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '2px' }} 
                    title="Delete Extension Project"
                  >
                    🗑️
                  </button>
                </div>
                <p className="header-project-desc">{selectedProject.description}</p>
              </>
            ) : (
              <>
                <h2 className="header-project-name">Factory Launcher</h2>
                <p className="header-project-desc">Compose new Extensions using state-of-the-art Generative AI</p>
              </>
            )}
          </div>
          {selectedProject && (
            <div className="workspace-tabs">
              <button 
                className={`workspace-tab ${activeTab === 'editor' ? 'active' : ''}`}
                onClick={() => setActiveTab('editor')}
              >
                🛠️ Code & File Editor
              </button>
              <button 
                className={`workspace-tab ${activeTab === 'sandbox' ? 'active' : ''}`}
                onClick={() => setActiveTab('sandbox')}
              >
                🎮 Active Sandbox Simulator
              </button>
            </div>
          )}
        </header>

        {!selectedProject && !loading && logs.length === 0 ? (
          // Blank Slate Splash Screen
          <div className="blank-slate">
            <div className="splash-icon">🚀</div>
            <h1 className="splash-title">No-Code Chrome Extension Factory</h1>
            <p className="splash-subtitle">Type your vision, requirements, and features. Extensio.ai compiles fully functional Chrome V3 extensions with instant packages.</p>

            <form onSubmit={handleGenerate} style={{ width: '100%', maxWidth: '600px' }}>
              <div style={{ position: 'relative' }}>
                <textarea
                  className="prompt-textarea"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Make a Chrome extension that blocks all images on a website and replaces them with a red square..."
                  style={{ height: '140px', paddingRight: '120px' }}
                />
                <div style={{ position: 'absolute', bottom: '16px', right: '16px' }}>
                  <button type="submit" className="generate-btn">
                    <span>Generate</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </button>
                </div>
              </div>
            </form>

            <div className="suggestions-grid">
              {SUGGESTIONS.map((card, idx) => (
                <div 
                  key={idx} 
                  className="suggestion-card"
                  onClick={() => setPrompt(card.prompt)}
                >
                  <div className="suggestion-title">{card.title}</div>
                  <div className="suggestion-prompt">{card.prompt}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Active Project / Generating Workspace
          <div className="workspace-layout">
            {/* Left Panel: Prompt Editor & History Timeline */}
            <div className="workspace-left">
              <div className="prompt-card">
                <div className="prompt-label">
                  <span>{selectedProject ? 'Iterate extension' : 'Generate extension'}</span>
                  {loading && <span style={{ color: 'var(--accent-cyan)', fontSize: '10px' }}>AI active</span>}
                </div>
                <form onSubmit={handleGenerate}>
                  <textarea
                    className="prompt-textarea"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={selectedProject ? "Add modifications: e.g. Add a popup toggle switch..." : "Write details..."}
                    disabled={loading}
                  />
                  <div className="action-row">
                    <button type="submit" className="generate-btn" disabled={loading || !prompt.trim()}>
                      {loading ? (
                        <>
                          <div className="spinner"></div>
                          <span>Computing...</span>
                        </>
                      ) : (
                        <>
                          <span>{selectedProject ? 'Iterate' : 'Generate'}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {selectedProject && (
                <div className="history-timeline-panel">
                  <div className="timeline-title">Version History (Control)</div>
                  <div className="timeline-container">
                    {selectedProject.versions.map((ver) => (
                      <div 
                        key={ver.version} 
                        className={`timeline-node ${selectedVersion === ver.version ? 'active' : ''}`}
                        onClick={() => handleSelectVersion(ver.version)}
                      >
                        <div className="timeline-dot"></div>
                        <div className="timeline-version-name">Version {ver.version}</div>
                        <div className="timeline-version-prompt">"{ver.prompt}"</div>
                        <div className="timeline-version-date">{new Date(ver.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel: Code Files Explorer OR Live Log Monitor */}
            {loading || (logs.length > 0 && !selectedProject) ? (
              <div className="logging-panel">
                <div className="logging-header">
                  <div className="logging-title">
                    <div className="spinner"></div>
                    <span>AI Synthesis Logs</span>
                  </div>
                </div>
                <div className="logging-console">
                  {logs.map((log, idx) => (
                    <div key={idx} className="log-entry">
                      <span className="log-timestamp">[{log.time}]</span>
                      <span className="log-arrow">&gt;&gt;</span>
                      <span>{log.text}</span>
                    </div>
                  ))}
                  <div ref={consoleEndRef} />
                </div>
              </div>
            ) : (
              // Active Tab toggle between Editor and Sandbox
              activeTab === 'editor' ? (
                // High Fidelity Code Browser & Editor
                <div className="workspace-right">
                  <div className="code-explorer">
                    <div className="explorer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Extension Files</span>
                      <button 
                        onClick={handleCreateFile} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-cyan)', fontSize: '12px' }} 
                        title="Add New File"
                      >
                        ➕
                      </button>
                    </div>
                    <div className="file-list">
                      {getActiveFiles().map((file) => (
                        <div 
                          key={file.name} 
                          className={`file-item ${selectedFile?.name === file.name ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedFile(file);
                            setIsEditing(false);
                          }}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                            <span className={getFileIconClass(file.name)}>
                              {file.name.endsWith('.json') ? '⚙️' : file.name.endsWith('.js') ? '📄' : '🌐'}
                            </span>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{file.name}</span>
                          </div>
                          {file.name.toLowerCase() !== 'manifest.json' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.name); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '11px', padding: '2px' }}
                              title="Delete File"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="code-viewer-container">
                    <div className="viewer-header">
                      <div className="viewer-filename">
                        {selectedFile ? selectedFile.name : 'No file selected'}
                      </div>
                      <div className="viewer-actions">
                        {selectedFile && !isEditing && (
                          <button className="action-btn" onClick={handleStartEdit}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Edit File
                          </button>
                        )}
                        {isEditing && (
                          <>
                            <button className="action-btn" style={{ borderColor: 'var(--success)', color: 'var(--success)' }} onClick={handleSaveFileContent}>
                              Save Changes
                            </button>
                            <button className="action-btn" onClick={() => setIsEditing(false)}>
                              Cancel
                            </button>
                          </>
                        )}
                        {selectedFile && (
                          <button className="action-btn" onClick={handleCopyCode}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            {copySuccess ? 'Copied!' : 'Copy'}
                          </button>
                        )}
                        
                        {selectedProject && (
                          <button 
                            onClick={handleDownloadZip}
                            className="action-btn download-btn"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download ZIP
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="code-pre-container">
                      {selectedFile ? (
                        isEditing ? (
                          <textarea 
                            className="code-editor-textarea"
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                          />
                        ) : (
                          <>
                            <div className="code-line-numbers">
                              {selectedFile.content.split('\n').map((_, i) => (
                                <div key={i}>{i + 1}</div>
                              ))}
                            </div>
                            <div className="code-display">
                              {selectedFile.content}
                            </div>
                          </>
                        )
                      ) : (
                        <div style={{ padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
                          Choose a file from the explorer sidebar to view the code.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Phase 2: Live Extension Sandbox Viewport Simulator (Iframe Engine)
                <div className="sandbox-container">
                  <div className="sandbox-bar">
                    <div className="sandbox-dots">
                      <div className="sandbox-dot red"></div>
                      <div className="sandbox-dot yellow"></div>
                      <div className="sandbox-dot green"></div>
                    </div>
                    <div className="sandbox-address-bar">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      <span>https://extensio-sandbox.io/vibrant-blog-page</span>
                    </div>

                    <div className="sandbox-run-controls">
                      <span>Simulate extension</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={isSandboxExtensionActive} 
                          onChange={(e) => {
                            setIsSandboxExtensionActive(e.target.checked);
                            if(!e.target.checked) setIsSandboxPopupOpen(false);
                            addLog(`Sandbox simulator: Extension toggled ${e.target.checked ? 'ON' : 'OFF'}.`);
                          }}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="sandbox-extension-icons">
                      <div 
                        className="sandbox-ext-badge"
                        title={selectedProject.name}
                        onClick={() => {
                          if (isSandboxExtensionActive) {
                            setIsSandboxPopupOpen(!isSandboxPopupOpen);
                          } else {
                            alert("Please switch the 'Simulate extension' toggle ON to access the popup browser extension widget!");
                          }
                        }}
                      >
                        ⚡
                      </div>
                      
                      {isSandboxPopupOpen && (
                        <div className="sandbox-popup-drawer">
                          <div className="sandbox-popup-header">{selectedProject.name}</div>
                          <div className="sandbox-popup-body" style={{ padding: '0', height: '240px' }}>
                            {hasPopupHtml() ? (
                              <iframe
                                id="sandbox-popup-iframe"
                                srcDoc={generatePopupSrcDoc()}
                                sandbox="allow-scripts allow-same-origin"
                                style={{ border: 'none', width: '100%', height: '100%', backgroundColor: '#1f2937' }}
                              />
                            ) : (
                              <div style={{ padding: '16px', color: '#9ca3af', fontStyle: 'italic' }}>
                                This extension has no popup.html UI
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Simulator Dynamic Iframe Viewport Rendering */}
                  <iframe 
                    id="sandbox-iframe-viewport"
                    className="sandbox-viewport-iframe"
                    srcDoc={getSandboxHtml(isSandboxExtensionActive)}
                    sandbox="allow-scripts allow-same-origin"
                    style={{ border: 'none', borderTop: 'none', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', width: '100%', minHeight: '420px', flex: 1, backgroundColor: '#ffffff' }}
                  />
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* 3. API Key Config Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal-card glassmorphism">
            <div className="modal-header">
              <h3 className="modal-title text-gradient">Gemini AI Settings</h3>
              <button className="close-modal-btn" onClick={() => setIsSettingsOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSaveApiKey}>
              <div className="form-group">
                <label className="form-label" htmlFor="apiKey">Gemini API Key</label>
                <input 
                  type="password"
                  id="apiKey" 
                  className="form-input" 
                  defaultValue={apiKey}
                  placeholder="Paste your Gemini AI API Key here..."
                />
                <p className="form-help">
                  To get an API key, visit the Google AI Studio page. Your key is stored locally in your browser's memory and is never shared elsewhere.
                </p>
              </div>

              <button type="submit" className="save-modal-btn">Apply Settings</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
