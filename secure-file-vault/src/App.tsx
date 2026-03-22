import React, { useState, useRef, useEffect } from 'react';
import { Upload, File as FileIcon, Download, ShieldCheck, ShieldAlert, AlertTriangle, Loader2, Info, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { cn } from './lib/utils';

interface FileData {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  hash: string;
  createdAt: string;
}

export default function App() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{id: number, isValid: boolean, message: string} | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        await fetchFiles();
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const verifyIntegrity = async (id: number) => {
    try {
      const res = await fetch(`/api/verify/${id}`);
      const data = await res.json();
      setVerificationResult({
        id,
        isValid: data.isValid,
        message: data.message || data.error
      });
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setVerificationResult(null);
      }, 5000);
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        id,
        isValid: false,
        message: 'Verification request failed.'
      });
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const clearAllFiles = async () => {
    try {
      const response = await fetch('/api/files', { method: 'DELETE' });
      if (response.ok) {
        setFiles([]);
        setVerificationResult(null);
        setIsConfirmingClear(false);
      } else {
        console.error('Failed to clear files');
      }
    } catch (error) {
      console.error('Error clearing files:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-600 font-sans relative overflow-hidden selection:bg-indigo-500/30">
      {/* Ambient background glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-40 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-200 to-transparent blur-[100px] rounded-full mix-blend-multiply" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-6 sm:p-12 space-y-12">
        <header className="space-y-6 text-center sm:text-left">
          <div>
            <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-2xl mb-6 border border-indigo-200 shadow-sm">
              <ShieldCheck className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 mb-4">Secure File Vault</h1>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto sm:mx-0">
              Upload files securely. Files are encrypted with AES encryption and their integrity is verified using SHA-256 hashes.
            </p>
          </div>
        </header>

        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative group overflow-hidden border-2 border-dashed rounded-[2rem] p-12 sm:p-16 text-center cursor-pointer transition-all duration-300 bg-white",
            isDragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50",
            isUploading && "pointer-events-none opacity-50"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/50 pointer-events-none" />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="relative z-10 flex flex-col items-center space-y-6">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm group-hover:scale-110 group-hover:border-indigo-200 transition-all duration-300">
              {isUploading ? (
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              ) : (
                <Upload className="w-10 h-10 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xl font-medium text-slate-900">
                {isUploading ? 'Encrypting and uploading...' : 'Click or drag file to this area to upload'}
              </p>
              <p className="text-sm text-slate-500">
                Supports any file type. Files are encrypted before storage.
              </p>
            </div>
          </div>
        </div>

        {/* File List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Stored Files</h2>
              <div className="text-sm text-slate-600 font-mono bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">{files.length} items</div>
            </div>
            
            {files.length > 0 && (
              isConfirmingClear ? (
                <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-right-2">
                  <span className="text-sm text-slate-500 font-medium mr-1 hidden sm:inline">Are you sure?</span>
                  <button
                    onClick={clearAllFiles}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                  >
                    Yes, delete all
                  </button>
                  <button
                    onClick={() => setIsConfirmingClear(false)}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsConfirmingClear(true)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Clear All
                </button>
              )
            )}
          </div>
          
          {files.length === 0 ? (
            <div className="text-center p-12 bg-white/50 rounded-3xl border border-slate-200 text-slate-500 border-dashed">
              No files uploaded yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {files.map((file) => (
                <div key={file.id} className="group relative bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 overflow-hidden">
                  
                  {/* Subtle hover gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/0 via-indigo-50/0 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <div className="relative z-10 flex items-start space-x-5 overflow-hidden flex-1">
                    <div className="p-3 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl shrink-0 group-hover:text-indigo-600 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-colors">
                      <FileIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-medium text-slate-900 truncate" title={file.originalName}>
                        {file.originalName}
                      </h3>
                      <div className="flex items-center space-x-3 text-sm text-slate-500 mt-1">
                        <span>{formatBytes(file.size)}</span>
                        <span>&bull;</span>
                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-3 inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-500 truncate max-w-full" title={file.hash}>
                        <span className="text-slate-400 mr-2 uppercase tracking-wider text-[10px]">SHA-256</span>
                        {file.hash.substring(0, 32)}...
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-col sm:items-end gap-3 shrink-0">
                    <button
                      onClick={() => verifyIntegrity(file.id)}
                      className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-all shadow-sm hover:shadow-md"
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Verify Integrity
                    </button>

                    {/* Verification Result Toast-like inline display */}
                    {verificationResult?.id === file.id && (
                      <div className={cn(
                        "px-3 py-2 rounded-lg border flex items-center space-x-2 animate-in fade-in slide-in-from-right-4",
                        verificationResult.isValid 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                          : "bg-red-50 border-red-200 text-red-700"
                      )}>
                        {verificationResult.isValid ? (
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                        )}
                        <span className="text-xs font-medium">{verificationResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
