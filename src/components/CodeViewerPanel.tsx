import React, { useMemo, useState } from 'react';
import { Copy, Check, Download, FileCode, FolderArchive, CheckCircle2 } from 'lucide-react';
import { PluginConfig } from '../types/plugin';
import { downloadMavenProjectZip, generatePluginFiles } from '../utils/codeGenerator';

interface CodeViewerPanelProps {
  config: PluginConfig;
  onUpdatePackage?: (newPkg: string) => void;
}

export const CodeViewerPanel: React.FC<CodeViewerPanelProps> = ({ config, onUpdatePackage }) => {
  const [includePackage, setIncludePackage] = useState<boolean>(true);
  const files = useMemo(() => generatePluginFiles(config, includePackage), [config, includePackage]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const currentFile = files[selectedFileIndex] || files[0];

  const handleCopy = async () => {
    if (!currentFile) return;
    try {
      await navigator.clipboard.writeText(currentFile.content);
      setCopiedPath(currentFile.path);
      setTimeout(() => setCopiedPath(null), 1800);
    } catch {
      // Fallback
    }
  };

  const handleDownloadSingleFile = () => {
    if (!currentFile) return;
    const blob = new Blob([currentFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const lines = currentFile ? currentFile.content.split('\n') : [];

  return (
    <div className="space-y-5">
      {/* IntelliJ / Compiler Fix Banner for "cannot resolve symbol 'me'" */}
      <div className="bg-emerald-950/35 border border-emerald-500/40 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-white">
              Fixed &ldquo;cannot resolve symbol &apos;me&apos;&rdquo; — Single-File All-in-One Java Plugin
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              All 6 classes (<span className="font-mono text-emerald-300">PrimeJobsPlugin</span>, Chest GUI, Event Listener, <span className="font-mono text-emerald-300">/jobs</span> Command, and Job Models) are now combined inside <span className="font-mono text-white font-semibold">1 single PrimeJobsPlugin.java file</span> with <span className="font-semibold text-emerald-300">zero</span> <span className="font-mono">import me.prime...</span> statements and automatic Vault reflection.
            </p>
          </div>
        </div>

        {/* Package Mode Selector for IntelliJ / Maven */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onUpdatePackage && includePackage && (
            <input
              type="text"
              value={config.packageName}
              onChange={(e) => onUpdatePackage(e.target.value)}
              placeholder="me.prime.jobs"
              title="Match your IntelliJ package folder name"
              className="px-2.5 py-1.5 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-amber-300 w-40 focus:outline-none focus:border-emerald-500"
            />
          )}
          <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setIncludePackage(true)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                includePackage ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              With package {config.packageName}
            </button>
            <button
              onClick={() => setIncludePackage(false)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                !includePackage ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              No Package (Root src/main/java)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar (4 cols): Maven Project File Explorer */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
            <div className="pb-3 mb-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">
                Generated Project Files ({files.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Only 1 Java file required — copy &amp; paste straight into IntelliJ or GitHub
              </p>
            </div>

            <div className="space-y-1.5 mb-4">
              {files.map((file, idx) => {
                const isSelected = idx === selectedFileIndex;
                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border border-emerald-500/40 text-white'
                        : 'bg-slate-900/60 border border-slate-800/70 text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCode
                        className={`w-4 h-4 shrink-0 ${
                          file.language === 'java'
                            ? 'text-amber-400'
                            : file.language === 'yaml'
                            ? 'text-emerald-400'
                            : 'text-sky-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-medium truncate">
                          {file.filename}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 truncate">
                          {file.path}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">
                      {file.language}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => downloadMavenProjectZip(config)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FolderArchive className="w-4 h-4" />
              Download Full Maven Project (.zip)
            </button>
          </div>
        </div>

        {/* Right Viewer (8 cols): Code Inspector with Line Numbers */}
        <div className="lg:col-span-8">
          <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900/90 border-b border-slate-800">
              <div>
                <div className="text-xs font-mono font-semibold text-white">
                  {currentFile.path}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {currentFile.description}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedPath === currentFile.path ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      Copied {currentFile.filename}!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy {currentFile.filename}
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadSingleFile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download {currentFile.filename}
                </button>
              </div>
            </div>

            <div className="max-h-[640px] overflow-auto bg-[#090C12] p-4 font-mono text-xs leading-relaxed">
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/60">
                      <td className="select-none pr-4 text-right text-slate-600 tabular-nums w-10 align-top">
                        {idx + 1}
                      </td>
                      <td className="text-slate-200 whitespace-pre">
                        {line || ' '}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
