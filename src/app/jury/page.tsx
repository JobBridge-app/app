"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { JURY_DATA } from "./data";
import {
    Clock,
    PlayCircle,
    ShieldCheck,
    Scale,
    Server,
    Rocket,
    HelpCircle,
    Map as MapIcon,
    FileText,
    Mic2,
    Check,
    AlertTriangle,
    X,
    ChevronDown,
    ChevronUp,
    LayoutDashboard,
    Maximize2,
    Minimize2,
    MonitorPlay,
    Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type TabId = 'dashboard' | 'script' | 'flyer' | 'demo' | 'security' | 'legal' | 'tech' | 'qa' | 'roadmap';

export default function JuryPage() {
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="min-h-screen bg-[#020202] text-white selection:bg-indigo-500/30 flex overflow-hidden font-sans">

            {/* Sidebar Navigation */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 bg-[#080808] border-r border-white/5 flex flex-col transition-all duration-300",
                sidebarOpen ? "w-64" : "w-20 items-center"
            )}>
                <div className="h-20 flex items-center justify-center border-b border-white/5">
                    <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/20", !sidebarOpen && "mb-2")}>JC</div>
                    {sidebarOpen && <div className="ml-3 font-bold tracking-tight">J<span className="text-indigo-400">C</span></div>}
                </div>

                <nav className="flex-1 py-6 space-y-1 px-3 overflow-y-auto no-scrollbar">
                    <NavGroup title="Übersicht" collapsed={!sidebarOpen}>
                        <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" active={activeTab} set={setActiveTab} collapsed={!sidebarOpen} />
                        <NavItem id="flyer" icon={ImageIcon} label="Flyer Ansicht" active={activeTab} set={setActiveTab} collapsed={!sidebarOpen} />
                    </NavGroup>

                    <NavGroup title="Präsentation" collapsed={!sidebarOpen}>
                        <NavItem id="script" icon={Mic2} label="Skript & Pitch" active={activeTab} set={setActiveTab} collapsed={!sidebarOpen} />
                        <NavItem id="demo" icon={MonitorPlay} label="Live Demo" active={activeTab} set={setActiveTab} collapsed={!sidebarOpen} />
                    </NavGroup>

                    <NavGroup title="Deep Dive" collapsed={!sidebarOpen}>
                        <NavItem id="security" icon={ShieldCheck} label="Sicherheit & Trust" active={activeTab} set={setActiveTab} collapsed={!sidebarOpen} />
                        <NavItem id="qa" icon={HelpCircle} label="Experten Q&A" active={activeTab} set={setActiveTab} collapsed={!sidebarOpen} />
                        <NavItem id="legal" icon={Scale} label="Recht & DSGVO" active={activeTab} set={setActiveTab} collapsed={!sidebarOpen} />
                        <NavItem id="tech" icon={Server} label="Tech Stack" active={activeTab} set={setActiveTab} collapsed={!sidebarOpen} />
                        <NavItem id="roadmap" icon={Rocket} label="Roadmap" active={activeTab} set={setActiveTab} collapsed={!sidebarOpen} />
                    </NavGroup>
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center justify-center p-2 text-slate-500 hover:text-white transition-colors">
                        {sidebarOpen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={cn(
                "flex-1 transition-all duration-500 ease-in-out relative h-screen overflow-y-auto bg-[url('/grid-pattern.svg')] bg-[length:40px_40px] bg-fixed pl-8",
                sidebarOpen ? "ml-64" : "ml-20"
            )}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#020202] via-transparent to-[#020202] pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 py-8 relative z-10 min-h-screen">
                    <header className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{getTabTitle(activeTab)}</h1>
                            <p className="text-slate-400 text-sm">JobBridge Jugend Forscht Präsentation</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-sm font-mono flex items-center gap-2">
                                <Clock size={16} /> 15:00 Min
                            </div>
                        </div>
                    </header>

                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {activeTab === 'dashboard' && <DashboardView setTab={setActiveTab} />}
                        {activeTab === 'flyer' && <FlyerView />}
                        {activeTab === 'script' && <ScriptTeleprompterView />}
                        {activeTab === 'demo' && <DemoView />}
                        {activeTab === 'security' && <SecurityView />}
                        {activeTab === 'qa' && <QAView />}
                        {activeTab === 'legal' && <LegalView />}
                        {activeTab === 'tech' && <TechView />}
                        {activeTab === 'roadmap' && <RoadmapView />}
                    </div>
                </div>
            </main>
        </div>
    );
}

// --- Navigation Components ---

function NavGroup({ title, children, collapsed }: { title: string, children: React.ReactNode, collapsed: boolean }) {
    if (collapsed) return <div className="mb-4 space-y-1">{children}</div>;
    return (
        <div className="mb-6 animate-in fade-in duration-300">
            <h3 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</h3>
            <div className="space-y-1">{children}</div>
        </div>
    );
}

function NavItem({ id, icon: Icon, label, active, set, collapsed }: any) {
    const isActive = active === id;
    return (
        <button
            onClick={() => set(id)}
            className={cn(
                "w-full flex items-center transition-all duration-200 group relative",
                collapsed ? "justify-center p-3 rounded-xl" : "px-4 py-2.5 rounded-lg gap-3",
                isActive
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white hover:pl-5 transition-all"
            )}
        >
            <Icon size={collapsed ? 24 : 18} className={cn("transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
            {!collapsed && <span className="font-medium text-sm">{label}</span>}
            {collapsed && isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full" />}
        </button>
    );
}

function getTabTitle(tab: TabId) {
    const map: Record<TabId, string> = {
        'dashboard': 'Mission Control',
        'script': 'Skript & Pitch',
        'flyer': 'Marketing Material',
        'demo': 'Live Demo Guide',
        'security': 'Sicherheits-Architektur',
        'qa': 'Jury Fragen & Antworten',
        'legal': 'Rechtliche Rahmenbedingungen',
        'tech': 'Technische Details',
        'roadmap': 'Zukunft & Skalierung'
    };
    return map[tab];
}

// --- Views ---

function DashboardView({ setTab }: { setTab: (t: TabId) => void }) {
    return (
        <div className="space-y-8">
            {/* Hook Card */}
            <div className="p-8 rounded-3xl bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-white/10 relative overflow-hidden group hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => setTab('script')}>
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full group-hover:bg-indigo-600/30 transition-all" />
                <h3 className="text-indigo-400 font-bold uppercase tracking-widest text-sm mb-4">Der 20-Sekunden Opener</h3>
                <p className="text-3xl md:text-3xl font-medium leading-relaxed text-white max-w-4xl">
                    "{JURY_DATA.hook.content}"
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm text-indigo-300 font-mono">
                    <PlayCircle size={16} /> Zum Skript springen
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Pitch Dauer"
                    value="2:00"
                    subtitle="Minuten"
                    icon={Clock}
                    color="text-emerald-400"
                    onClick={() => setTab('script')}
                />
                <StatCard
                    title="Experten Fragen"
                    value={`${JURY_DATA.qa.length}`}
                    subtitle="Vorbereitet"
                    icon={HelpCircle}
                    color="text-amber-400"
                    onClick={() => setTab('qa')}
                />
                <StatCard
                    title="Sicherheits-Layer"
                    value="8"
                    subtitle="Aktive Funktionen"
                    icon={ShieldCheck}
                    color="text-blue-400"
                    onClick={() => setTab('security')}
                />
                <StatCard
                    title="Flyer"
                    value="Ready"
                    subtitle="Ansicht verfügbar"
                    icon={ImageIcon}
                    color="text-pink-400"
                    onClick={() => setTab('flyer')}
                />
            </div>

            {/* Quick Actions / Dos and Donts */}
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-[#0A0A0A] p-6 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-lg mb-4 text-emerald-400 flex items-center gap-2"><Check size={18} /> DO SAY</h3>
                    <ul className="space-y-3">
                        {JURY_DATA.dosAndDonts.dos.map(d => (
                            <li key={d} className="flex gap-3 text-slate-300 text-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                                {d}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-[#0A0A0A] p-6 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-lg mb-4 text-red-400 flex items-center gap-2"><X size={18} /> DON'T SAY</h3>
                    <ul className="space-y-3">
                        {JURY_DATA.dosAndDonts.donts.map(d => (
                            <li key={d} className="flex gap-3 text-slate-300 text-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                                {d}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, subtitle, icon: Icon, color, onClick }: any) {
    return (
        <button onClick={onClick} className="bg-[#0A0A0A] hover:bg-white/5 p-6 rounded-2xl border border-white/5 text-left transition-all duration-300 group hover:-translate-y-1 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className={cn("mb-4 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:text-white relative z-10", color)}>
                <Icon size={20} />
            </div>
            <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{value}</span>
                <span className="text-slate-500 text-sm">{subtitle}</span>
            </div>
        </button>
    );
}

function FlyerView() {
    const containerRef = useRef<HTMLDivElement>(null);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div ref={containerRef} className="h-[80vh] flex flex-col items-center justify-center bg-[#050505] rounded-3xl border border-white/10 p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-dotted-pattern opacity-20 pointer-events-none" />

            <div className="relative z-10 h-full w-full flex items-center justify-center">
                <div className="max-w-[70vh] max-h-[70vh] shadow-2xl shadow-black rounded-xl overflow-hidden border border-white/10 transition-transform duration-500 hover:scale-[1.02]">
                    <img
                        src="/assets/jury/flyer_new.png"
                        alt="JobBridge Flyer"
                        className="h-full w-auto object-contain"
                    />
                </div>
            </div>

            <div className="absolute bottom-8 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button onClick={toggleFullscreen} className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-slate-200 transition-colors flex items-center gap-2 shadow-lg shadow-white/10">
                    <Maximize2 size={16} /> Vollbild
                </button>
            </div>
        </div>
    );
}


function ScriptTeleprompterView() {
    const [step, setStep] = useState(0);
    const totalSteps = JURY_DATA.script.length;

    return (
        <div className="grid lg:grid-cols-3 gap-8 h-[calc(100vh-12rem)]">
            {/* Outline Sidebar */}
            <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-y-auto p-4 space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Ablaufplan</h3>
                {JURY_DATA.script.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => setStep(i)}
                        className={cn(
                            "w-full text-left p-3 rounded-xl text-sm transition-all border",
                            step === i
                                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                                : "bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        )}
                    >
                        <div className="flex justify-between mb-1">
                            <span className="font-bold">{s.title}</span>
                            <span className="text-[10px] font-mono opacity-60">{s.time}</span>
                        </div>
                        <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
                            {/* Progress bar simulation per step */}
                            <div className={cn("h-full bg-white/30", step === i ? "w-1/2" : "w-0")} />
                        </div>
                    </button>
                ))}
            </div>

            {/* Teleprompter Content */}
            <div className="lg:col-span-2 bg-[#0A0A0A] rounded-2xl border border-white/5 p-8 relative flex flex-col">
                <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full">
                    <div className="mb-6">
                        <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded text-xs font-mono mb-2 inline-block">
                            Abschnitt {step + 1} von {totalSteps}
                        </span>
                        <h2 className="text-4xl font-bold text-white mb-2">{JURY_DATA.script[step].title}</h2>
                        <span className="text-slate-400 text-lg font-mono">{JURY_DATA.script[step].time}</span>
                    </div>

                    <ul className="space-y-6 mb-12">
                        {JURY_DATA.script[step].points.map((p, i) => (
                            <li key={i} className="text-xl text-slate-200 flex items-start gap-4">
                                <span className="text-indigo-500 font-bold mt-1">●</span>
                                {p}
                            </li>
                        ))}
                    </ul>

                    <div className="p-6 bg-gradient-to-r from-indigo-900/20 to-transparent border-l-4 border-indigo-500 rounded-r-xl">
                        <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider block mb-2">Key Sentence</span>
                        <p className="text-2xl italic text-white leading-relaxed">"{JURY_DATA.script[step].keySentence}"</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex justify-between mt-8 pt-6 border-t border-white/5">
                    <button
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0}
                        className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-colors font-bold"
                    >
                        Zurück
                    </button>
                    <button
                        onClick={() => setStep(Math.min(totalSteps - 1, step + 1))}
                        disabled={step === totalSteps - 1}
                        className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 transition-colors font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                        Weiter <ChevronDown size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function QAView() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("Alle");

    const categories = ["Alle", ...Array.from(new Set(JURY_DATA.qa.map(q => q.category)))];

    const filteredQA = JURY_DATA.qa.filter(q => {
        const matchesSearch = q.q.toLowerCase().includes(search.toLowerCase()) || q.a.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = filter === "Alle" || q.category === filter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6 h-[calc(100vh-12rem)] flex flex-col">
            <div className="flex gap-4 mb-4">
                <input
                    type="text"
                    placeholder="Suche nach Fragen..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div className="grid md:grid-cols-2 gap-4 overflow-y-auto pb-20 pr-2">
                {filteredQA.map((item, i) => (
                    <div key={i} className="bg-[#0A0A0A] p-5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group">
                        <div className="flex items-start justify-between mb-3">
                            <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">{item.category}</span>
                        </div>
                        <h4 className="font-bold text-lg text-white mb-3 group-hover:text-indigo-200 transition-colors">{item.q}</h4>
                        <p className="text-slate-400 text-sm leading-relaxed border-l-2 border-slate-700 pl-4 group-hover:border-indigo-500 transition-colors">
                            {item.a}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DemoView() {
    return (
        <div className="grid lg:grid-cols-2 gap-8 h-[calc(100vh-12rem)]">
            <div className="space-y-8 overflow-y-auto pr-2">
                <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/10">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><MonitorPlay size={20} className="text-indigo-400" /> {JURY_DATA.demo.pathA.title}</h2>
                    <div className="space-y-6 relative">
                        {/* Line */}
                        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-500/50 to-transparent" />

                        {JURY_DATA.demo.pathA.steps.map((step: any, i: number) => (
                            <div key={i} className="relative pl-10">
                                <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-[#111] border border-indigo-500 text-indigo-400 flex items-center justify-center font-bold text-sm shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                                    {i + 1}
                                </div>
                                <h4 className="font-bold text-white mb-1">{step.action}</h4>
                                <p className="text-sm text-slate-400 italic">"{step.say}"</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/10">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><MonitorPlay size={20} className="text-purple-400" /> {JURY_DATA.demo.pathB.title}</h2>
                    <div className="space-y-6 relative">
                        {/* Line */}
                        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-purple-500/50 to-transparent" />

                        {JURY_DATA.demo.pathB.steps.map((step: any, i: number) => (
                            <div key={i} className="relative pl-10">
                                <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-[#111] border border-purple-500 text-purple-400 flex items-center justify-center font-bold text-sm shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                                    {i + 1}
                                </div>
                                <h4 className="font-bold text-white mb-1">{step.action}</h4>
                                <p className="text-sm text-slate-400 italic">"{step.say}"</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-[#0A0A0A] p-8 rounded-3xl border border-amber-500/20 bg-amber-500/5 flex flex-col justify-center">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-amber-100">Fallback Plan (Notfall)</h2>
                    <p className="text-amber-200/60 mt-2">Wenn das WLAN ausfällt oder der Beamer streikt.</p>
                </div>

                <div className="space-y-4">
                    {JURY_DATA.demo.fallback.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 bg-[#050505] p-4 rounded-xl border border-amber-500/10">
                            <span className="font-mono text-amber-500 font-bold">0{i + 1}</span>
                            <span className="text-slate-300">{item}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Reusing Tech/Security Views for now but wrappig in scroll container
function SecurityView() { return <div className="space-y-8 pb-20"><InfoGrid section={JURY_DATA.security} title="Security Architecture" /></div> }
function LegalView() { return <div className="space-y-8 pb-20"><InfoList section={JURY_DATA.legal} title="Legal Framework" /></div> }
function TechView() { return <div className="space-y-8 pb-20"><InfoList section={JURY_DATA.tech} title="Technical Specification" /></div> }
function RoadmapView() { return <div className="space-y-8 pb-20"><RoadmapList section={JURY_DATA.roadmap} title="Future Roadmap" /></div> }

// Helper Components for simple list rendering
function InfoGrid({ section }: any) {
    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {section.scenarios?.map((s: any, i: number) => (
                <div key={i} className="bg-[#0A0A0A] p-6 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-white mb-2">{s.scenario}</h3>
                    <p className="text-slate-400 text-sm">{s.defense}</p>
                </div>
            ))}
        </div>
    );
}

function InfoList({ section }: any) {
    return (
        <div className="grid gap-6">
            {Object.entries(section).map(([key, val]: [string, any]) => (
                <div key={key} className="bg-[#0A0A0A] p-6 rounded-2xl border border-white/5">
                    <h3 className="font-bold text-indigo-400 uppercase tracking-widest text-xs mb-4">{key}</h3>
                    {typeof val === 'string' ? <p className="text-slate-300">{val}</p> : (
                        <div className="space-y-2">
                            {Object.entries(val).map(([k, v]: [string, any]) => (
                                <div key={k}>
                                    <span className="text-white font-bold block mb-1 capitalize">{k}:</span>
                                    <p className="text-slate-400 text-sm">{v}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function RoadmapList({ section }: any) {
    return (
        <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#0A0A0A] p-8 rounded-3xl border border-indigo-500/20">
                <h3 className="text-xl font-bold text-white mb-6">Short Term</h3>
                <ul className="space-y-4">
                    {section.shortTerm.map((s: string) => <li key={s} className="flex gap-3 text-slate-300"><Check size={18} className="text-indigo-500" /> {s}</li>)}
                </ul>
            </div>
            <div className="bg-[#0A0A0A] p-8 rounded-3xl border border-purple-500/20 opacity-80">
                <h3 className="text-xl font-bold text-white mb-6">Vision</h3>
                <ul className="space-y-4">
                    {section.longTerm.map((s: string) => <li key={s} className="flex gap-3 text-slate-400"><MapIcon size={18} className="text-purple-500" /> {s}</li>)}
                </ul>
            </div>
        </div>
    );
}
