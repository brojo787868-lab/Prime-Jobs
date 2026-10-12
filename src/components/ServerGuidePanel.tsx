import React, { useState } from 'react';
import {
  FolderArchive,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Coins,
  UploadCloud,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  FileCode,
  Play,
} from 'lucide-react';
import { PluginConfig } from '../types/plugin';
import {
  downloadMavenProjectZip,
  generatePluginFiles,
  pushPluginToGitHub,
} from '../utils/codeGenerator';
import { MinecraftItemIcon, renderMinecraftText } from './MinecraftIcons';

interface ServerGuidePanelProps {
  config: PluginConfig;
  onSwitchTab: (tab: 'SIMULATOR' | 'EDITOR' | 'CODE' | 'GUIDE') => void;
}

export const ServerGuidePanel: React.FC<ServerGuidePanelProps> = ({ config, onSwitchTab }) => {
  const [repoName, setRepoName] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [branch, setBranch] = useState('main');
  const [pushStatus, setPushStatus] = useState<'IDLE' | 'PUSHING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [progressText, setProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deployedUrls, setDeployedUrls] = useState<{
    repoUrl: string;
    actionsUrl: string;
    releasesUrl: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const allFiles = generatePluginFiles(config);
  const workflowFile = allFiles.find((f) => f.path.includes('build-plugin.yml'));

  const handleCopyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const handlePushToGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName.trim() || !githubToken.trim()) {
      setPushStatus('ERROR');
      setErrorMessage('Enter both your GitHub repository (username/repo) and your GitHub Token.');
      return;
    }

    setPushStatus('PUSHING');
    setErrorMessage('');
    setDeployedUrls(null);

    try {
      const urls = await pushPluginToGitHub({
        config,
        repoFullName: repoName,
        token: githubToken,
        branch: branch.trim() || 'main',
        onProgress: (msg) => setProgressText(msg),
      });
      setDeployedUrls(urls);
      setPushStatus('SUCCESS');
      setProgressText('Success! All 10 files were uploaded to GitHub. GitHub is now building your .JAR file.');
    } catch (err) {
      setPushStatus('ERROR');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to push to GitHub.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual 3-Step Box: How to Get the .JAR Download on GitHub */}
      <div className="bg-[#111827] border border-emerald-500/40 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-emerald-400 mb-1">
              GitHub .JAR Download &amp; Auto-Build Guide
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              How to Host &amp; Download <span className="font-mono text-emerald-400">{config.pluginName}-{config.version}.jar</span> on GitHub
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              If you do not see the <span className="font-mono text-emerald-400">.jar</span> download on your GitHub page, it is because the hidden file <span className="font-mono text-amber-300">.github/workflows/build-plugin.yml</span> was not added or GitHub Actions permissions are turned off. Follow the visual steps below to make GitHub build and host your <span className="font-mono text-emerald-400">.jar</span> file automatically!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => downloadMavenProjectZip(config)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FolderArchive className="w-4 h-4" />
              1. Download Plugin .ZIP
            </button>
            <button
              onClick={() => onSwitchTab('CODE')}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileCode className="w-4 h-4 text-amber-400" />
              View All 10 Files
            </button>
          </div>
        </div>

        {/* Visual Step-by-Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Step 1 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono font-semibold text-amber-400 mb-1">
                STEP 1 · Enable GitHub Permissions
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                Allow GitHub to Create Releases
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                On your GitHub repository page, click:
              </p>
              <div className="mt-2 p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-200 space-y-1">
                <div>1. Settings → Actions → General</div>
                <div>2. Scroll to &ldquo;Workflow permissions&rdquo;</div>
                <div className="text-emerald-400">3. Select &ldquo;Read and write permissions&rdquo;</div>
                <div>4. Click Save</div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono font-semibold text-sky-400 mb-1">
                STEP 2 · Add the Auto-Compiler File
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                Create <span className="font-mono text-sky-300">.github/workflows/build-plugin.yml</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">
                Folders starting with a dot (<span className="font-mono text-amber-300">.github</span>) are hidden on Windows/Mac! On GitHub, click <span className="font-mono text-white">Add file → Create new file</span> and paste this exact file name &amp; code:
              </p>
            </div>

            <div className="space-y-2 mt-2">
              <button
                onClick={() => handleCopyText('path', '.github/workflows/build-plugin.yml')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg text-amber-300 transition-colors cursor-pointer"
              >
                <span className="truncate">.github/workflows/build-plugin.yml</span>
                {copiedKey === 'path' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
              </button>

              <button
                onClick={() => workflowFile && handleCopyText('yaml', workflowFile.content)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors cursor-pointer"
              >
                {copiedKey === 'yaml' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied Workflow YAML Code!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Workflow YAML Code
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono font-semibold text-emerald-400 mb-1">
                STEP 3 · Where to Download Your .JAR
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                Download from &ldquo;Actions&rdquo; or &ldquo;Releases&rdquo;
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Do <span className="text-rose-400 font-semibold">NOT</span> click the green <span className="font-mono text-slate-200">Code → Download ZIP</span> button (that is source code only). Instead:
              </p>
              <div className="mt-2 p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-200 space-y-1">
                <div>1. Click the <span className="text-white font-bold">Actions</span> tab at the top of GitHub</div>
                <div>2. Wait ~45s for the green checkmark ✔</div>
                <div className="text-emerald-400">
                  3. Click <span className="font-bold">Releases</span> (right sidebar) or <span className="font-bold">Artifacts</span> to download <span className="underline">{config.pluginName}-{config.version}.jar</span>!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Automatic 1-Click GitHub API Uploader */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">
                Automatic 1-Click Upload to Your GitHub Repo (Uploads Hidden .github Workflow Automatically)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Pushes all 10 files + starts .JAR build
            </span>
          </div>

          <form onSubmit={handlePushToGitHub} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                GitHub Repository (username/repo)
              </label>
              <input
                type="text"
                placeholder="e.g. brojo787868/PrimeJobs"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                GitHub Token (repo + workflow)
              </label>
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={pushStatus === 'PUSHING'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {pushStatus === 'PUSHING' ? 'Uploading...' : 'Push & Build .JAR'}
              </button>
            </div>
          </form>

          {pushStatus === 'PUSHING' && progressText && (
            <div className="mt-3 text-xs font-mono text-amber-300">
              {progressText}
            </div>
          )}

          {pushStatus === 'ERROR' && errorMessage && (
            <div className="mt-3 p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 flex items-start gap-2 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {pushStatus === 'SUCCESS' && deployedUrls && (
            <div className="mt-3 p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 space-y-2 text-xs">
              <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {progressText}
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <a
                  href={deployedUrls.actionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-sky-300 hover:text-sky-200 underline"
                >
                  Open GitHub Actions (.JAR Build Progress)
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={deployedUrls.releasesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-emerald-300 hover:text-emerald-200 underline"
                >
                  Open GitHub Releases (Download .JAR)
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5 Professions Economy Matrix */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">
              Configured 5-Job Economy Matrix
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            Payout Formula: Base Money × (1 + (Level - 1) × Level Bonus) × {config.boosterMultiplier.toFixed(1)}x Booster
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-medium text-slate-400">
                <th className="py-2.5 px-4">Profession</th>
                <th className="py-2.5 px-4">Chest Slot</th>
                <th className="py-2.5 px-4">Max Level</th>
                <th className="py-2.5 px-4">Income Scaling</th>
                <th className="py-2.5 px-4">Earnable Tasks</th>
                <th className="py-2.5 px-4 text-right">Lv.1 → Lv.50 Top Task Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {config.jobs.map((job) => {
                const topTask = [...job.tasks].sort((a, b) => b.baseMoney - a.baseMoney)[0];
                const lv1Pay = topTask ? topTask.baseMoney * config.boosterMultiplier : 0;
                const lv50Pay = topTask
                  ? topTask.baseMoney * (1 + 49 * job.incomeMultiplierPerLevel) * config.boosterMultiplier
                  : 0;

                return (
                  <tr key={job.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <MinecraftItemIcon icon={job.icon} size={22} />
                        <span className="font-mono font-semibold">
                          {renderMinecraftText(job.displayName)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 tabular-nums">
                      Slot #{job.slot}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 tabular-nums">
                      Lv.{job.maxLevel}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 tabular-nums">
                      +{Math.round(job.incomeMultiplierPerLevel * 100)}% / level
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {job.tasks.map((t) => t.material).join(' · ')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-300 tabular-nums">
                      {config.economySymbol}
                      {lv1Pay.toFixed(2)} → {config.economySymbol}
                      {lv50Pay.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commands & Permissions Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">In-Game Commands</h3>
            </div>
            <button
              onClick={() => onSwitchTab('CODE')}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              View Java Source →
            </button>
          </div>
          <div className="space-y-2.5 text-xs">
            {[
              { cmd: '/jobs', desc: 'Opens the 54-slot interactive PrimeJobs Chest GUI.' },
              { cmd: '/jobs join <job>', desc: 'Join one of the 5 professions (Miner, Lumberjack, Farmer, Hunter, Fisherman).' },
              { cmd: '/jobs leave <job>', desc: 'Leave an active profession while keeping saved level & XP.' },
              { cmd: '/jobs stats', desc: 'Display current level, XP, and lifetime Vault earnings in chat.' },
              { cmd: '/jobs boost <multiplier>', desc: 'Set a server-wide Vault money & XP multiplier (e.g. 2.0x).' },
              { cmd: '/jobs reload', desc: 'Hot-reload config.yml payouts, GUI slots, and lore lines.' },
            ].map((item) => (
              <div key={item.cmd} className="flex items-start justify-between gap-4 py-1.5 border-b border-slate-800/60 last:border-0">
                <span className="font-mono text-emerald-400 whitespace-nowrap shrink-0">{item.cmd}</span>
                <span className="text-slate-400 text-right">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Permissions &amp; Anti-Exploit Checks</h3>
          </div>
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-mono text-white">primejobs.use (default: true)</div>
                <p className="text-slate-400 mt-0.5">
                  Grants players access to open the `/jobs` Chest GUI, view task sub-menus, and earn Vault payouts.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-mono text-white">primejobs.admin (default: op)</div>
                <p className="text-slate-400 mt-0.5">
                  Allows staff to trigger `/jobs reload` and activate global server economy boosters with `/jobs boost`.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-mono text-white">Mature Crop Age Verification</div>
                <p className="text-slate-400 mt-0.5">
                  `JobTaskListener.java` verifies `Ageable#getAge() == Ageable#getMaximumAge()` so players only earn Farmer payouts on fully grown crops.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
